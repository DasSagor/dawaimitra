'use client';

import React from 'react';
import { Pill, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import InteractionChecker from '@/app/components/InteractionChecker';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">DawaiMitra</h1>
              <p className="text-[10px] text-muted-foreground bangla leading-none">AI ফার্মাসিস্ট</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="পরিবার ড্যাশবোর্ড"
              id="nav-dashboard"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-950/50 border border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">AI Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <InteractionChecker />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-[10px] text-muted-foreground bangla">
            DawaiMitra © 2025 | Powered by Groq + Gemini | বাংলাদেশের জন্য তৈরি 🇧🇩
          </p>
        </div>
      </footer>
    </div>
  );
}
