import { NextRequest, NextResponse } from 'next/server';
import { calculateDrugDose } from '@/lib/geminiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { medicine_name, age, weight, has_kidney_issue, has_liver_issue, indication } = body as {
      medicine_name?: string;
      age?: number;
      weight?: number;
      has_kidney_issue?: boolean;
      has_liver_issue?: boolean;
      indication?: string;
    };

    if (!medicine_name) {
      return NextResponse.json(
        { error: 'medicine_name is required', error_bangla: 'ওষুধের নাম প্রয়োজন।' },
        { status: 400 }
      );
    }

    const result = await calculateDrugDose({
      medicine_name,
      age: age ?? null,
      weight: weight ?? null,
      has_kidney_issue: has_kidney_issue ?? false,
      has_liver_issue: has_liver_issue ?? false,
      indication: indication ?? null,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[calculate-dose] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: msg,
        error_bangla: 'ডোজ হিসাব করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
