'use client';

import React from 'react';
import { ArrowRight, TrendingDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenericAlternative } from '@/lib/utils';

interface GenericPanelProps {
  alternatives: GenericAlternative[];
}

function formatBDT(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}

export default function GenericPanel({ alternatives }: GenericPanelProps) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan-800/40 bg-cyan-950/30">
        <Package className="w-4 h-4 text-cyan-400 shrink-0" />
        <p className="text-sm font-semibold text-cyan-300 bangla">💊 জেনেরিক বিকল্প ও মূল্য তুলনা</p>
      </div>

      <div className="divide-y divide-cyan-800/30">
        {alternatives.map((alt, i) => (
          <div key={i} className="p-4 space-y-3">
            {/* Generic name label */}
            <p className="text-[11px] text-cyan-400/70 bangla font-medium uppercase tracking-wide">
              জেনেরিক: {alt.generic_name}
            </p>

            {/* Comparison row */}
            <div className="flex items-center gap-2">
              {/* Current brand */}
              <div className="flex-1 rounded-lg bg-secondary/60 border border-border p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground bangla">বর্তমান ব্র্যান্ড</p>
                <p className="text-sm font-bold text-foreground">{alt.brand}</p>
                <p className="text-base font-extrabold text-red-400">{formatBDT(alt.price_per_unit)}</p>
                <p className="text-[10px] text-muted-foreground bangla">প্রতি ট্যাবলেট/ইউনিট</p>
              </div>

              {/* Arrow */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <ArrowRight className="w-5 h-5 text-cyan-500" />
                <span className="text-[9px] text-cyan-400 bangla font-medium">বিকল্প</span>
              </div>

              {/* Alternative brand */}
              <div className="flex-1 rounded-lg bg-green-950/40 border border-green-700/60 p-3 space-y-1">
                <p className="text-[10px] text-green-400/70 bangla">বিকল্প ব্র্যান্ড</p>
                <p className="text-sm font-bold text-green-300">{alt.alternative_brand}</p>
                <p className="text-base font-extrabold text-green-400">{formatBDT(alt.alternative_price)}</p>
                <p className="text-[10px] text-green-400/70 bangla">প্রতি ট্যাবলেট/ইউনিট</p>
              </div>
            </div>

            {/* Savings badge */}
            {alt.savings > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/40 border border-green-700/40">
                <TrendingDown className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <p className="text-xs bangla text-green-300">
                  প্রতি ট্যাবলেটে{' '}
                  <span className="font-bold text-green-200">{formatBDT(alt.savings)}</span>{' '}
                  সাশ্রয় হবে — একমাসে (৩০টি){' '}
                  <span className="font-bold text-green-200">{formatBDT(alt.savings * 30)}</span> সাশ্রয়!
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 bg-cyan-950/20 border-t border-cyan-800/30">
        <p className="text-[10px] text-cyan-500/60 bangla text-center">
          * মূল্য তথ্য আনুমানিক। ফার্মেসিতে দাম ভিন্ন হতে পারে।
        </p>
      </div>
    </div>
  );
}
