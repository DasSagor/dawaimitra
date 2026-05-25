import { NextRequest, NextResponse } from 'next/server';
import { extractMedicinesFromImage } from '@/lib/groqClient';
import type { ExpiryAlert } from '@/lib/utils';

function getLastDayOfMonth(year: number, month: number): string {
  // month is 1-indexed
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function checkExpiry(expiryDateStr: string | null): boolean {
  if (!expiryDateStr) return false;
  try {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  } catch {
    return false;
  }
}

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

    // Validate data URL format
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format', error_bangla: 'ছবির ফরম্যাট সঠিক নয়।' },
        { status: 400 }
      );
    }

    const rawMedicines = await extractMedicinesFromImage(imageBase64);

    if (rawMedicines.length === 0) {
      return NextResponse.json({
        medicines: [],
        expiry_alerts: [],
        warning: 'No medicines detected in the image',
        warning_bangla: 'ছবিতে কোনো ওষুধের তথ্য পাওয়া যায়নি। স্পষ্ট ছবি তুলুন।',
      });
    }

    // Feature #12: Build expiry alerts
    const expiry_alerts: ExpiryAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const med of rawMedicines) {
      if (med.expiry_date && checkExpiry(med.expiry_date)) {
        expiry_alerts.push({
          brand: med.brand,
          expiry_date: med.expiry_date,
          message_bangla: `${med.brand}-এর মেয়াদ ${med.expiry_date} তারিখে শেষ হয়েছে। এই ওষুধ খাবেন না।`,
        });
      }
    }

    // Strip date fields from medicines before returning (they are in expiry_alerts)
    const medicines = rawMedicines.map(({ manufacturing_date, expiry_date, ...rest }) => rest);

    return NextResponse.json({ medicines, expiry_alerts });
  } catch (error) {
    console.error('[scan-image] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: msg,
        error_bangla: 'ছবি স্ক্যান করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
