import { NextRequest, NextResponse } from 'next/server';
import { extractPrescriptionData } from '@/lib/groqClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body as { imageBase64?: string };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 is required', error_bangla: 'ছবির ডেটা প্রয়োজন।' },
        { status: 400 }
      );
    }

    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format', error_bangla: 'ছবির ফরম্যাট সঠিক নয়।' },
        { status: 400 }
      );
    }

    const prescription = await extractPrescriptionData(imageBase64);

    if (prescription.medicines.length === 0 && !prescription.doctor_name && !prescription.patient_name) {
      return NextResponse.json({
        prescription,
        warning_bangla: 'ছবিতে কোনো প্রেসক্রিপশনের তথ্য পাওয়া যায়নি। স্পষ্ট ছবি তুলুন।',
      });
    }

    return NextResponse.json({ prescription });
  } catch (error) {
    console.error('[scan-prescription] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: msg,
        error_bangla: 'প্রেসক্রিপশন স্ক্যান করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
