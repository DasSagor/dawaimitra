import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MedicineItem, UserProfile, VerdictResult } from './utils';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const SYSTEM_PROMPT = `You are DawaiMitra — a highly knowledgeable clinical pharmacist AI designed specifically for Bangladesh. You have expertise in:
- Bangladeshi brand names and their generic equivalents
- Drug-drug interactions common in Bangladesh's pharmaceutical market
- Contraindications for pregnancy, elderly, kidney disease, liver disease
- Antibiotic stewardship in Bangladesh
- Duplicate therapy detection (same generic in multiple brands)
- Common OTC drugs in Bangladesh (Napa, Ace, Paracet, Seclo, Omeprazole, etc.)
- Multi-drug (≥3 drugs) interaction reasoning

Your response must ALWAYS be valid JSON only — no markdown, no code blocks, no explanations outside JSON.`;

export async function checkDrugInteractions(
  medicines: MedicineItem[],
  user: UserProfile,
  interactionData: any[],
  genericAlternativesData: any[] = []
): Promise<VerdictResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: {
      temperature: 0.1,
      topP: 1,
      topK: 1,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const isMultiDrug = medicines.length >= 3;

  const prompt = `Analyze these medicines for a patient in Bangladesh.

MEDICINES LIST:
${JSON.stringify(medicines, null, 2)}

PATIENT PROFILE:
${JSON.stringify(user, null, 2)}

KNOWN INTERACTION DATABASE (use as reference):
${JSON.stringify(interactionData, null, 2)}

GENERIC ALTERNATIVES DATABASE (from our database — use for price comparison):
${JSON.stringify(genericAlternativesData, null, 2)}

TASK:
1. Identify all active ingredients (infer from brand names if not provided — use Bangladeshi market knowledge)
2. Check all pairwise drug interactions using the database above AND your knowledge
3. Detect duplicate active ingredients across different brands (e.g., Napa + Ace = paracetamol duplication)
4. Check contraindications based on patient profile (pregnancy, age, organ issues)
5. Flag if any antibiotic is present (ask if prescribed)
6. Provide a clear, empathetic explanation in Bangla
${isMultiDrug ? '7. IMPORTANT: Since 3+ drugs are present, also reason about multi-drug (polypharmacy) interactions beyond pairwise — consider additive toxicity, cumulative effects, and complex pharmacokinetic interactions.' : ''}
8. For confidence scoring: rate how certain you are (0-100) based on quality of evidence, evidence_grade A=RCT/meta-analysis, B=observational studies, C=case reports/expert opinion, D=theoretical/insufficient data
9. For generic_alternatives: use the GENERIC ALTERNATIVES DATABASE above. For each brand that has alternatives listed, fill in the savings calculation (price_per_unit - alternative_price). If no database entry exists, skip that brand.

OUTPUT FORMAT (strict JSON, no other text):
{
  "verdict": "safe" | "caution" | "danger",
  "color": "green" | "yellow" | "red",
  "explanation_bangla": "বিস্তারিত বাংলা ব্যাখ্যা এখানে লিখুন। পরিষ্কার ও সহজ ভাষায় রোগীকে বোঝান।",
  "antibiotic_alert": true | false,
  "interactions_found": ["সংক্ষিপ্ত বাংলায় মিথস্ক্রিয়ার বর্ণনা"],
  "confidence": 85,
  "evidence_grade": "A" | "B" | "C" | "D",
  "evidence_source": "DrugBank / WHO / BNF / FDA / Medscape",
  "multi_drug_interactions": ["বহু-ওষুধ মিথস্ক্রিয়ার বর্ণনা বাংলায়"],
  "generic_alternatives": [
    {
      "brand": "ব্র্যান্ড নাম",
      "generic_name": "জেনেরিক নাম",
      "price_per_unit": 5.00,
      "alternative_brand": "বিকল্প ব্র্যান্ড",
      "alternative_price": 1.50,
      "savings": 3.50
    }
  ]
}

VERDICT RULES:
- "safe" (green): No significant interactions, no contraindications, no duplicates
- "caution" (yellow): Minor interactions, antibiotic present, or duplicates found but not dangerous
- "danger" (red): Major interactions, serious contraindications, or dangerous combinations

NOTE: multi_drug_interactions should be [] if fewer than 3 drugs. generic_alternatives should be [] if no alternatives found.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Parse JSON — handle edge cases
  let parsed: VerdictResult;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    // Fallback safe response
    parsed = {
      verdict: 'caution',
      color: 'yellow',
      explanation_bangla:
        'বিশ্লেষণে একটি সমস্যা হয়েছে। অনুগ্রহ করে একজন প্রকৃত ফার্মাসিস্ট বা চিকিৎসকের পরামর্শ নিন।',
      antibiotic_alert: false,
      interactions_found: [],
      confidence: 50,
      evidence_grade: 'C',
      evidence_source: 'N/A',
      multi_drug_interactions: [],
      generic_alternatives: [],
    };
  }

  return parsed;
}

export async function inferGenerics(medicineNames: string[]): Promise<MedicineItem[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: {
      temperature: 0.1,
      topP: 1,
      responseMimeType: 'application/json',
    },
  });

  const prompt = `You are a pharmacist in Bangladesh. For each medicine brand name below, identify the active ingredient (generic name) and typical dosage if known.

Medicine names: ${JSON.stringify(medicineNames)}

OUTPUT: JSON array only, no other text.
Format: [{"brand":"BrandName","dose":"dose or null","active_ingredient":"generic or null"}]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return medicineNames.map((name) => ({ brand: name, dose: null, active_ingredient: null }));
  }
}

// ============================================================
// Feature E: Drug Dose Calculator
// ============================================================
export interface DoseInput {
  medicine_name: string;
  age: number | null;
  weight: number | null;
  has_kidney_issue: boolean;
  has_liver_issue: boolean;
  indication: string | null;
}

export interface DoseResult {
  medicine: string;
  generic_name: string | null;
  recommended_dose: string;
  max_dose: string | null;
  frequency: string;
  route: string;
  dose_per_kg: string | null;
  warnings: string[];
  explanation_bangla: string;
  consult_doctor: boolean;
}

export async function calculateDrugDose(input: DoseInput): Promise<DoseResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = `Calculate the appropriate drug dosage for the following patient in Bangladesh.

MEDICINE: ${input.medicine_name}
PATIENT AGE: ${input.age !== null ? input.age + ' years' : 'Not specified'}
PATIENT WEIGHT: ${input.weight !== null ? input.weight + ' kg' : 'Not specified'}
KIDNEY ISSUE: ${input.has_kidney_issue ? 'Yes' : 'No'}
LIVER ISSUE: ${input.has_liver_issue ? 'Yes' : 'No'}
INDICATION/CONDITION: ${input.indication ?? 'Not specified'}

Calculate the recommended dosage based on:
1. Standard adult/pediatric dosing guidelines
2. Weight-based dosing if weight provided (mg/kg)
3. Dose adjustments for kidney/liver issues
4. Bangladeshi pharmaceutical context (available formulations)

OUTPUT (strict JSON only):
{
  "medicine": "brand or generic name",
  "generic_name": "active ingredient or null",
  "recommended_dose": "e.g. 500mg or 10mg/kg",
  "max_dose": "maximum safe dose or null",
  "frequency": "e.g. প্রতি ৮ ঘণ্টায় / দিনে ৩ বার",
  "route": "oral / IV / topical etc",
  "dose_per_kg": "mg/kg if applicable or null",
  "warnings": ["বাংলায় সতর্কতা যদি থাকে"],
  "explanation_bangla": "বাংলায় বিস্তারিত ব্যাখ্যা — বয়স/ওজন অনুযায়ী ডোজ কেন এটি, কিডনি/লিভার সমস্যা থাকলে কী পরিবর্তন, কীভাবে খাবে",
  "consult_doctor": true or false
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as DoseResult;
  } catch {
    return {
      medicine: input.medicine_name,
      generic_name: null,
      recommended_dose: 'হিসাব করা সম্ভব হয়নি',
      max_dose: null,
      frequency: 'চিকিৎসকের পরামর্শ নিন',
      route: 'oral',
      dose_per_kg: null,
      warnings: ['ডোজ হিসাবে সমস্যা হয়েছে। অবশ্যই চিকিৎসকের পরামর্শ নিন।'],
      explanation_bangla: 'ডোজ হিসাব করতে সমস্যা হয়েছে। অনুগ্রহ করে একজন ফার্মাসিস্ট বা চিকিৎসকের পরামর্শ নিন।',
      consult_doctor: true,
    };
  }
}

// ============================================================
// Feature F: Drug Price Comparison
// ============================================================
export interface PriceEntry {
  company: string;
  brand_name: string;
  generic_name: string;
  strength: string;
  form: string;
  price_per_unit: number;
  pack_size: string;
  pack_price: number;
  availability: 'সহজলভ্য' | 'সীমিত' | 'অজানা';
}

export interface PriceCompareResult {
  query: string;
  generic_name: string;
  entries: PriceEntry[];
  cheapest: string;
  most_expensive: string;
  savings_potential: string;
  summary_bangla: string;
}

export async function compareDrugPrices(medicineName: string): Promise<PriceCompareResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = `Compare prices of different brands of this medicine available in Bangladesh.

MEDICINE QUERY: ${medicineName}

List ALL known brands/generics of this medicine available in the Bangladesh pharmaceutical market with their approximate prices.
Include major pharmaceutical companies like Square, Beximco, ACI, Incepta, Renata, Opsonin, Eskayef, General, Drug International, etc.

OUTPUT (strict JSON only):
{
  "query": "${medicineName}",
  "generic_name": "active ingredient name",
  "entries": [
    {
      "company": "কোম্পানির নাম",
      "brand_name": "ব্র্যান্ড নাম",
      "generic_name": "জেনেরিক নাম",
      "strength": "শক্তিমাত্রা যেমন 500mg",
      "form": "ট্যাবলেট/সিরাপ/ক্যাপসুল",
      "price_per_unit": 2.50,
      "pack_size": "10 tablets",
      "pack_price": 25.00,
      "availability": "সহজলভ্য"
    }
  ],
  "cheapest": "সবচেয়ে সস্তা ব্র্যান্ডের নাম",
  "most_expensive": "সবচেয়ে দামি ব্র্যান্ডের নাম",
  "savings_potential": "সর্বোচ্চ সাশ্রয়ের পরিমাণ বাংলায়",
  "summary_bangla": "বাংলায় সারসংক্ষেপ — কোনটি সবচেয়ে সাশ্রয়ী এবং কেন"
}

Sort entries by price_per_unit ascending (cheapest first).
Use approximate market prices from Bangladesh (BDT). If exact price unknown, estimate based on similar drugs.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as PriceCompareResult;
  } catch {
    return {
      query: medicineName,
      generic_name: medicineName,
      entries: [],
      cheapest: 'অজানা',
      most_expensive: 'অজানা',
      savings_potential: 'তথ্য পাওয়া যায়নি',
      summary_bangla: 'দাম তুলনা করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    };
  }
}

