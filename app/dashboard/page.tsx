'use client';

import React from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { Loader2, Pill, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import FamilyDashboard from '@/app/components/FamilyDashboard';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="হোমে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">DawaiMitra</h1>
              <p className="text-[10px] text-muted-foreground bangla leading-none">পারিবারিক ড্যাশবোর্ড</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user.email}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              className="px-2 py-1 h-auto"
              id="signout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <FamilyDashboard userId={user.id} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-[10px] text-muted-foreground bangla">
            DawaiMitra © 2025 | 🔔 রিমাইন্ডার প্রতিদিন সকাল ৯টায় সক্রিয়
          </p>
        </div>
      </footer>
    </div>
  );
}
