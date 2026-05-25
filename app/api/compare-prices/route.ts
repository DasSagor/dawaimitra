import { NextRequest, NextResponse } from 'next/server';
import { compareDrugPrices } from '@/lib/geminiClient';
import { fetchGenericAlternatives } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { medicine_name } = body as { medicine_name?: string };

    if (!medicine_name?.trim()) {
      return NextResponse.json(
        { error: 'medicine_name is required', error_bangla: 'ওষুধের নাম প্রয়োজন।' },
        { status: 400 }
      );
    }

    // Run Gemini + Supabase lookup in parallel
    const [aiResult, dbAlternatives] = await Promise.all([
      compareDrugPrices(medicine_name.trim()),
      fetchGenericAlternatives([medicine_name.trim()]),
    ]);

    return NextResponse.json({ result: aiResult, db_alternatives: dbAlternatives });
  } catch (error) {
    console.error('[compare-prices] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, error_bangla: 'দাম তুলনা করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
