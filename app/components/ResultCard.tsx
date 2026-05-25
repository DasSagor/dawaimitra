'use client';

import React, { useState, useCallback } from 'react';
import {
  Volume2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Pill,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  RefreshCw,
  Loader2,
  Zap,
  FlaskConical,
  AlertOctagon,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { cn, VERDICT_CONFIG } from '@/lib/utils';
import type { VerdictResult, MedicineItem } from '@/lib/utils';
import GenericPanel from '@/app/components/GenericPanel';

interface ResultCardProps {
  result: VerdictResult;
  medicines: MedicineItem[];
  onReset: () => void;
}

const VerdictIcon = ({ verdict }: { verdict: string }) => {
  if (verdict === 'safe') return <ShieldCheck className="w-10 h-10" />;
  if (verdict === 'caution') return <AlertTriangle className="w-10 h-10" />;
  return <XCircle className="w-10 h-10" />;
};

const evidenceGradeLabel: Record<string, string> = {
  A: 'RCT / মেটা-অ্যানালাইসিস',
  B: 'পর্যবেক্ষণমূলক গবেষণা',
  C: 'কেস রিপোর্ট / বিশেষজ্ঞ মতামত',
  D: 'তাত্ত্বিক / অপর্যাপ্ত তথ্য',
};

const confidenceColor = (val: number) => {
  if (val >= 80) return 'text-green-400';
  if (val >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const confidenceBarColor = (val: number) => {
  if (val >= 80) return '[&>div]:bg-green-500';
  if (val >= 60) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
};

export default function ResultCard({ result, medicines, onReset }: ResultCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMultiDrug, setShowMultiDrug] = useState(false);
  const config = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.caution;

  const playBangla = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const text = [
      config.label + '।',
      result.explanation_bangla,
      result.antibiotic_alert ? 'সতর্কতা: এই ওষুধে অ্যান্টিবায়োটিক আছে। ডাক্তারের প্রেসক্রিপশন ছাড়া খাবেন না।' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const banglaVoice = voices.find(
      (v) => v.lang === 'bn-BD' || v.lang === 'bn-IN' || v.lang.startsWith('bn')
    );
    if (banglaVoice) utterance.voice = banglaVoice;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, result, config.label]);

  const verdictColorMap = {
    safe: { bg: 'bg-green-950/40', border: 'border-green-700', text: 'text-green-400', badge: 'bg-green-900/60 text-green-300' },
    caution: { bg: 'bg-yellow-950/40', border: 'border-yellow-700', text: 'text-yellow-400', badge: 'bg-yellow-900/60 text-yellow-300' },
    danger: { bg: 'bg-red-950/40', border: 'border-red-700', text: 'text-red-400', badge: 'bg-red-900/60 text-red-300' },
  };
  const colors = verdictColorMap[result.verdict] ?? verdictColorMap.caution;

  const confidence = result.confidence ?? 0;
  const hasMultiDrug = (result.multi_drug_interactions?.length ?? 0) > 0;
  const hasGenerics = (result.generic_alternatives?.length ?? 0) > 0;
  const hasExpiry = (result.expiry_alerts?.length ?? 0) > 0;

  return (
    <div className={cn('rounded-2xl border-2 overflow-hidden animate-bounce-in', colors.border, colors.bg)}>

      {/* ── Feature #12: Expiry Alert Banner ── */}
      {hasExpiry && (
        <div className="flex items-start gap-3 p-4 bg-red-950 border-b-2 border-red-600 animate-fade-in">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-300 bangla">⛔ মেয়াদোত্তীর্ণ ওষুধ শনাক্ত!</p>
            {result.expiry_alerts!.map((alert, i) => (
              <p key={i} className="text-xs text-red-400 bangla">
                {alert.message_bangla}
              </p>
            ))}
            <p className="text-xs font-semibold text-red-200 bangla mt-1">
              এই ওষুধের মেয়াদ শেষ! খাবেন না।
            </p>
          </div>
        </div>
      )}

      {/* Verdict Header */}
      <div className={cn('p-6 text-center space-y-3 border-b', colors.border)}>
        <div className={cn('inline-flex items-center justify-center p-4 rounded-full', colors.badge)}>
          <span className={colors.text}>
            <VerdictIcon verdict={result.verdict} />
          </span>
        </div>
        <div>
          <h2 className={cn('text-2xl font-bold bangla', colors.text)}>
            {config.label}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 bangla">AI-ভিত্তিক ফার্মাসিস্ট বিশ্লেষণ</p>
        </div>

        {/* ── Feature #2: Confidence Score + Evidence Grade ── */}
        {confidence > 0 && (
          <div className="mt-3 space-y-2 text-left px-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground bangla">
                <Zap className="w-3 h-3" />
                আত্মবিশ্বাস
              </span>
              <span className={cn('text-sm font-bold bangla', confidenceColor(confidence))}>
                {confidence}%
              </span>
            </div>
            <Progress
              value={confidence}
              className={cn('h-2', confidenceBarColor(confidence))}
              id="confidence-progress"
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className="bangla text-muted-foreground">
                🟢 {confidence}% আত্মবিশ্বাস
              </span>
              {result.evidence_grade && (
                <span className={cn('px-2 py-0.5 rounded-full font-semibold', colors.badge)}>
                  গ্রেড: {result.evidence_grade}{' '}
                  <span className="font-normal opacity-80 bangla">
                    ({evidenceGradeLabel[result.evidence_grade] ?? ''})
                  </span>
                </span>
              )}
            </div>
            {result.evidence_source && (
              <p className="text-[10px] text-muted-foreground bangla text-right">
                সূত্র: {result.evidence_source}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Medicines analyzed */}
      <div className="px-5 pt-4">
        <div className="flex flex-wrap gap-1.5 mb-1">
          <span className="text-xs text-muted-foreground bangla mr-1">বিশ্লেষিত:</span>
          {medicines.map((m, i) => (
            <span key={i} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', colors.badge)}>
              <Pill className="w-2.5 h-2.5" />
              <span className="bangla">{m.brand}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="p-5 space-y-3">
        <p className="bangla text-sm leading-relaxed text-foreground/90">
          {result.explanation_bangla}
        </p>

        {/* Antibiotic alert */}
        {result.antibiotic_alert && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-950/50 border border-yellow-700 animate-fade-in">
            <Stethoscope className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-yellow-300 bangla">⚠️ অ্যান্টিবায়োটিক শনাক্ত</p>
              <p className="text-xs text-yellow-400/80 bangla mt-0.5">
                এই ওষুধে অ্যান্টিবায়োটিক আছে। অবশ্যই ডাক্তারের প্রেসক্রিপশন অনুযায়ী সম্পূর্ণ কোর্স শেষ করুন।
              </p>
            </div>
          </div>
        )}

        {/* Pairwise interactions found */}
        {result.interactions_found && result.interactions_found.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="bangla">{result.interactions_found.length}টি পেয়ারওয়াইজ সমস্যা পাওয়া গেছে</span>
            </button>

            {showDetails && (
              <ul className="space-y-1.5 animate-fade-in">
                {result.interactions_found.map((item, i) => (
                  <li
                    key={i}
                    className={cn('flex items-start gap-2 p-2.5 rounded-lg text-xs', colors.badge)}
                  >
                    <span className="shrink-0 mt-0.5">•</span>
                    <span className="bangla">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Feature #3: Multi-drug interactions ── */}
        {hasMultiDrug && (
          <div className="space-y-2">
            <button
              onClick={() => setShowMultiDrug(!showMultiDrug)}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {showMultiDrug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="bangla">
                {result.multi_drug_interactions!.length}টি বহু-ওষুধ মিথস্ক্রিয়া শনাক্ত হয়েছে
              </span>
            </button>

            {showMultiDrug && (
              <div className="animate-fade-in rounded-xl border border-orange-700/60 bg-orange-950/20 p-3 space-y-1.5">
                <p className="text-[10px] text-orange-400/70 bangla font-semibold uppercase tracking-wide">
                  পলিফার্মাসি (বহু-ওষুধ) সতর্কতা
                </p>
                {result.multi_drug_interactions!.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-orange-900/20 rounded-lg p-2">
                    <span className="text-orange-400 shrink-0">⚠</span>
                    <span className="bangla text-orange-200">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Feature #6: Generic alternatives panel ── */}
      {hasGenerics && (
        <div className="px-5 pb-4">
          <GenericPanel alternatives={result.generic_alternatives!} />
        </div>
      )}

      {/* Footer actions */}
      <div className={cn('px-5 pb-5 pt-0 flex gap-2.5')}>
        <Button
          onClick={playBangla}
          variant="outline"
          className={cn('flex-1 bangla', isPlaying && 'border-primary bg-primary/10')}
          id="play-bangla-btn"
        >
          {isPlaying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              থামান
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              বাংলায় শুনুন
            </>
          )}
        </Button>
        <Button
          onClick={onReset}
          variant="secondary"
          className="flex-1 bangla"
          id="result-reset-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          আবার করুন
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="px-5 pb-4">
        <p className="text-[10px] text-muted-foreground bangla text-center">
          ⚠️ এই তথ্য শুধু সহায়তার জন্য। চিকিৎসকের পরামর্শ বিকল্প নয়।
        </p>
      </div>
    </div>
  );
}
