'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Camera,
  Keyboard,
  Mic,
  ArrowLeft,
  Loader2,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import ImageUploader from '@/app/components/ImageUploader';
import TextInput from '@/app/components/TextInput';
import VoiceInput from '@/app/components/VoiceInput';
import UserProfileForm from '@/app/components/UserProfile';
import ResultCard from '@/app/components/ResultCard';
import { toast } from '@/app/hooks/use-toast';
import { cn, getOrCreateSessionId } from '@/lib/utils';
import type { MedicineItem, UserProfile, VerdictResult, ExpiryAlert } from '@/lib/utils';

type InputMode = 'camera' | 'text' | 'voice';
type Step = 'home' | 'input' | 'analyzing' | 'result';

const inputModes: { id: InputMode; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
  {
    id: 'camera',
    icon: <Camera className="w-6 h-6" />,
    label: 'ছবি স্ক্যান করুন',
    desc: 'ওষুধের প্যাকেট বা স্ট্রিপের ছবি তুলুন',
    color: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'text',
    icon: <Keyboard className="w-6 h-6" />,
    label: 'টাইপ করুন',
    desc: 'ওষুধের নাম লিখুন',
    color: 'from-cyan-600 to-teal-600',
  },
  {
    id: 'voice',
    icon: <Mic className="w-6 h-6" />,
    label: 'কথায় বলুন',
    desc: 'বাংলায় বলুন, AI শুনবে',
    color: 'from-rose-600 to-pink-600',
  },
];

interface InteractionCheckerProps {
  initialProfile?: UserProfile;
  hideProfileForm?: boolean;
  onClose?: () => void;
  title?: string;
}

export default function InteractionChecker({
  initialProfile,
  hideProfileForm = false,
  onClose,
  title,
}: InteractionCheckerProps) {
  const [step, setStep] = useState<Step>('home');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile ?? {});
  const [result, setResult] = useState<VerdictResult | null>(null);

  // Sync profile if initialProfile changes
  useEffect(() => {
    if (initialProfile) {
      setUserProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleModeSelect = (mode: InputMode) => {
    setInputMode(mode);
    setStep('input');
  };

  const handleMedicinesReady = useCallback(
    async (meds: MedicineItem[], expiryAlerts?: ExpiryAlert[]) => {
      if (meds.length === 0) {
        toast({ title: 'ওষুধ নেই', description: 'অন্তত একটি ওষুধ দিন।', variant: 'warning' as never });
        return;
      }

      setMedicines(meds);
      setStep('analyzing');

      try {
        const sessionId = getOrCreateSessionId();
        const res = await fetch('/api/check-interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicines: meds, user: userProfile, session_id: sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error_bangla ?? data.error ?? 'বিশ্লেষণ ব্যর্থ হয়েছে');
        }

        const verdict = data.verdict as VerdictResult;
        if (expiryAlerts && expiryAlerts.length > 0) {
          verdict.expiry_alerts = expiryAlerts;
        }
        setResult(verdict);
        setStep('result');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'অজানা সমস্যা হয়েছে';
        toast({ title: 'সমস্যা হয়েছে', description: msg, variant: 'destructive' });
        setStep('input');
      }
    },
    [userProfile]
  );

  const handleError = useCallback((msg: string) => {
    toast({ title: 'সমস্যা', description: msg, variant: 'destructive' });
  }, []);

  const handleReset = () => {
    setStep('home');
    setMedicines([]);
    setResult(null);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header controls for embedded view */}
      {(onClose || step !== 'home') && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === 'result') handleReset();
              else if (step === 'input') setStep('home');
              else if (onClose) onClose();
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="bangla text-sm">পিছনে</span>
          </Button>
          {title && step === 'home' && (
            <h2 className="text-sm font-bold bangla text-primary">{title}</h2>
          )}
        </div>
      )}

      {/* ======== HOME ======== */}
      {step === 'home' && (
        <div className="space-y-6 animate-fade-in">
          {!onClose && (
            <div className="text-center space-y-3 pt-2">
              <h2 className="text-3xl font-extrabold tracking-tight bangla leading-snug">
                ওষুধের নিরাপত্তা<br />
                <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                  এখনই জানুন
                </span>
              </h2>
              <p className="text-sm text-muted-foreground bangla leading-relaxed">
                ওষুধ স্ক্যান করুন, টাইপ করুন বা বলুন। AI মুহূর্তেই বিশ্লেষণ করে নিরাপদ কিনা জানাবে।
              </p>
            </div>
          )}

          {!onClose && (
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { icon: '🔍', text: 'মিথস্ক্রিয়া যাচাই' },
                { icon: '🔄', text: 'ডুপ্লিকেট শনাক্ত' },
                { icon: '🤰', text: 'গর্ভাবস্থা সতর্কতা' },
                { icon: '💊', text: 'অ্যান্টিবায়োটিক অ্যালার্ট' },
                { icon: '📊', text: 'আত্মবিশ্বাস স্কোর' },
                { icon: '💰', text: 'জেনেরিক বিকল্প' },
                { icon: '⛔', text: 'মেয়াদ যাচাই' },
              ].map((f) => (
                <span
                  key={f.text}
                  className="text-[11px] bangla px-2 py-1 rounded-full bg-secondary/80 border border-border text-muted-foreground"
                >
                  {f.icon} {f.text}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground bangla font-medium">ইনপুট পদ্ধতি বেছে নিন:</p>
            {inputModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group text-left"
              >
                <div className={cn('p-3 rounded-xl bg-gradient-to-br text-white shrink-0 transition-transform group-hover:scale-110', mode.color)}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold bangla text-sm">{mode.label}</p>
                  <p className="text-xs text-muted-foreground bangla">{mode.desc}</p>
                </div>
                <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
              </button>
            ))}
          </div>

          {!hideProfileForm && (
            <UserProfileForm onChange={setUserProfile} initialProfile={userProfile} />
          )}

          {!onClose && (
            <div className="rounded-xl border border-border p-4 space-y-3 bg-card/50">
              <p className="text-xs font-semibold bangla text-muted-foreground">এটি কীভাবে কাজ করে:</p>
              <div className="space-y-2">
                {[
                  { step: '১', icon: '📸', text: 'ওষুধের ছবি দিন অথবা নাম লিখুন বা বলুন' },
                  { step: '২', icon: '🧠', text: 'AI সক্রিয় উপাদান ও মিথস্ক্রিয়া বিশ্লেষণ করে' },
                  { step: '৩', icon: '🟢', text: 'নিরাপদ/সাবধান/বিপদজনক ফলাফল বাংলায় পান' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold bangla">
                      {item.step}
                    </div>
                    <p className="text-xs bangla text-muted-foreground">{item.icon} {item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== INPUT ======== */}
      {step === 'input' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            {(() => {
              const m = inputModes.find((x) => x.id === inputMode)!;
              return (
                <>
                  <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white', m.color)}>{m.icon}</div>
                  <div>
                    <p className="font-semibold bangla">{m.label}</p>
                    <p className="text-xs text-muted-foreground bangla">{m.desc}</p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            {inputMode === 'camera' && (
              <ImageUploader
                onMedicinesExtracted={(meds, alerts) => handleMedicinesReady(meds, alerts)}
                onError={handleError}
              />
            )}
            {inputMode === 'text' && (
              <TextInput onMedicinesReady={handleMedicinesReady} />
            )}
            {inputMode === 'voice' && (
              <VoiceInput onMedicinesReady={handleMedicinesReady} onError={handleError} />
            )}
          </div>

          {!hideProfileForm && (
            <UserProfileForm onChange={setUserProfile} initialProfile={userProfile} />
          )}
        </div>
      )}

      {/* ======== ANALYZING ======== */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-fade-in">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
              <HeartPulse className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold bangla">বিশ্লেষণ চলছে...</p>
            <p className="text-sm text-muted-foreground bangla">AI ওষুধের তথ্য যাচাই করছে</p>
          </div>
          <div className="space-y-2 w-full max-w-xs">
            {[
              'সক্রিয় উপাদান শনাক্ত করা হচ্ছে...',
              'ডাটাবেস থেকে তথ্য আনা হচ্ছে...',
              'মিথস্ক্রিয়া পরীক্ষা করা হচ্ছে...',
              'ফলাফল তৈরি হচ্ছে...',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
                <p className="text-xs bangla text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======== RESULT ======== */}
      {step === 'result' && result && (
        <div className="animate-bounce-in">
          <ResultCard result={result} medicines={medicines} onReset={handleReset} />

          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-border bg-card/50">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs bangla text-muted-foreground">
              এই ফলাফল শুধু তথ্যগত উদ্দেশ্যে। গুরুতর স্বাস্থ্য সমস্যায় সবসময় চিকিৎসকের পরামর্শ নিন।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
