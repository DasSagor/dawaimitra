import { NextRequest, NextResponse } from 'next/server';
import { checkDrugInteractions, inferGenerics } from '@/lib/geminiClient';
import {
  fetchRelevantInteractions,
  fetchGenericAlternatives,
  saveUserQuery,
} from '@/lib/supabaseClient';
import type { MedicineItem, UserProfile } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      medicines,
      user = {},
      session_id,
    } = body as {
      medicines?: MedicineItem[];
      user?: UserProfile;
      session_id?: string;
    };

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json(
        { error: 'medicines array is required', error_bangla: 'ওষুধের তালিকা প্রয়োজন।' },
        { status: 400 }
      );
    }

    // Step 1: Fill in missing active ingredients using Gemini
    const needsInference = medicines.filter((m) => !m.active_ingredient || m.active_ingredient === null);
    let enrichedMedicines = [...medicines];

    if (needsInference.length > 0) {
      const brandNames = needsInference.map((m) => m.brand);
      const inferred = await inferGenerics(brandNames);

      // Merge inferred data back
      enrichedMedicines = medicines.map((med) => {
        const match = inferred.find(
          (i) => i.brand.toLowerCase() === med.brand.toLowerCase()
        );
        return match
          ? { ...med, active_ingredient: match.active_ingredient, dose: med.dose ?? match.dose }
          : med;
      });
    }

    // Step 2: Extract all generic names for DB lookup
    const generics = enrichedMedicines
      .map((m) => m.active_ingredient)
      .filter((g): g is string => !!g && g.length > 0);

    const brandNames = enrichedMedicines.map((m) => m.brand);

    // Step 3: Fetch interactions from Supabase + generic alternatives in parallel
    const [interactionData, genericAlternativesData] = await Promise.all([
      fetchRelevantInteractions(generics),
      fetchGenericAlternatives(brandNames), // Feature #6
    ]);

    // Step 4: Feature #3 — build multi-drug context note
    // The Gemini prompt already handles multi-drug reasoning based on isMultiDrug flag
    // We pass all medicines and the flag is computed inside checkDrugInteractions

    // Step 5: Run Gemini analysis (Features #2, #3, #6 all handled in prompt)
    const verdict = await checkDrugInteractions(
      enrichedMedicines,
      user,
      interactionData,
      genericAlternativesData
    );

    // Step 6: Log query (async, don't await to keep response fast)
    if (session_id) {
      saveUserQuery({
        session_id,
        inputs_json: { medicines: enrichedMedicines, user },
        verdict_json: verdict,
      }).catch((e) => console.error('Query log failed:', e));
    }

    return NextResponse.json({
      verdict,
      medicines_analyzed: enrichedMedicines,
      interactions_db_count: interactionData.length,
    });
  } catch (error) {
    console.error('[check-interactions] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: msg,
        error_bangla: 'বিশ্লেষণে সমস্যা হয়েছে। আবার চেষ্টা করুন বা চিকিৎসকের পরামর্শ নিন।',
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
