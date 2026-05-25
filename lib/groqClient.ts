import Groq from 'groq-sdk';

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// ============================================================
// Types
// ============================================================
export interface OcrMedicineItem {
  brand: string;
  dose: string | null;
  active_ingredient: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
}

export interface PrescriptionMedicine {
  brand: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface PrescriptionData {
  doctor_name: string | null;
  patient_name: string | null;
  patient_age: string | null;
  diagnosis: string | null;
  date: string | null;
  medicines: PrescriptionMedicine[];
  raw_notes: string | null;
}

// ============================================================
// Feature: Medicine package OCR
// ============================================================
export async function extractMedicinesFromImage(
  imageBase64: string
): Promise<OcrMedicineItem[]> {
  const client = getGroqClient();

  const response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
          {
            type: 'text',
            text: `You are a pharmacy OCR system. Carefully examine this medicine strip/package image.
Extract ALL medicine information visible including:
- Brand name (trade name)
- Dosage (mg, ml, mcg, etc.)
- Active ingredient / generic name (if visible)
- Manufacturing date (Mfg/Mfd date) — convert to YYYY-MM-DD format. If only month/year visible use YYYY-MM-01. If not found, use null.
- Expiry date (Exp/Expiry date) — convert to YYYY-MM-DD format. If only month/year visible, use the LAST day of that month (e.g., 06/2025 → 2025-06-30). If not found, use null.

IMPORTANT: Be robust about date formats:
- "06/2025", "Jun 2025", "JUN-25" → expiry_date: "2025-06-30"
- "01/2024", "Jan 2024" → manufacturing_date: "2024-01-01"
- "12/26" means December 2026 → "2026-12-31"

Output ONLY a valid JSON array. No explanations. No markdown. No code blocks.
Format: [{"brand":"BrandName","dose":"500mg","active_ingredient":"GenericName","manufacturing_date":"YYYY-MM-DD or null","expiry_date":"YYYY-MM-DD or null"},...]
If no medicine text is found, return: []`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>) => ({
      brand: String(item.brand ?? '').trim(),
      dose: item.dose ? String(item.dose).trim() : null,
      active_ingredient: item.active_ingredient ? String(item.active_ingredient).trim() : null,
      manufacturing_date: item.manufacturing_date ? String(item.manufacturing_date).trim() : null,
      expiry_date: item.expiry_date ? String(item.expiry_date).trim() : null,
    })).filter((item) => item.brand.length > 0);
  } catch {
    return [];
  }
}

// ============================================================
// Feature A: Doctor prescription OCR
// ============================================================
export async function extractPrescriptionData(
  imageBase64: string
): Promise<PrescriptionData> {
  const client = getGroqClient();

  const fallback: PrescriptionData = {
    doctor_name: null,
    patient_name: null,
    patient_age: null,
    diagnosis: null,
    date: null,
    medicines: [],
    raw_notes: null,
  };

  const response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert medical prescription OCR system for Bangladesh. This image contains a doctor's prescription (may be handwritten or printed, in Bengali or English).

Extract ALL information from the prescription carefully:
1. Doctor's name (ডাক্তারের নাম)
2. Patient's name (রোগীর নাম)
3. Patient's age (বয়স)
4. Diagnosis / chief complaint (রোগ/সমস্যা)
5. Prescription date
6. Each medicine: name, dose/strength, frequency (morning/noon/night), duration, special instructions

Output ONLY valid JSON, no markdown, no extra text:
{
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "patient_age": "string or null",
  "diagnosis": "string or null",
  "date": "string or null",
  "medicines": [
    {
      "brand": "medicine name",
      "dose": "dose/strength or null",
      "frequency": "e.g. 1+0+1 or সকাল-দুপুর-রাত or null",
      "duration": "e.g. 7 days or ৭ দিন or null",
      "instructions": "e.g. before meal, with water or null"
    }
  ],
  "raw_notes": "any other notes from prescription or null"
}

If no prescription content found, return with empty medicines array and all nulls.`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallback;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as PrescriptionData;
    return {
      doctor_name: parsed.doctor_name ?? null,
      patient_name: parsed.patient_name ?? null,
      patient_age: parsed.patient_age ?? null,
      diagnosis: parsed.diagnosis ?? null,
      date: parsed.date ?? null,
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      raw_notes: parsed.raw_notes ?? null,
    };
  } catch {
    return fallback;
  }
}
