'use client';

import React, { useState } from 'react';
import { Pill, Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';

export default function AuthPage() {
  const { signInWithMagicLink, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in → redirect
  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 mx-auto">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">DawaiMitra</h1>
            <p className="text-sm text-muted-foreground bangla mt-1">পারিবারিক ড্যাশবোর্ডে প্রবেশ করুন</p>
          </div>
        </div>

        {sent ? (
          /* Success state */
          <div className="rounded-2xl border border-green-700 bg-green-950/30 p-6 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
            <p className="font-semibold text-green-300 bangla">ম্যাজিক লিংক পাঠানো হয়েছে!</p>
            <p className="text-sm text-muted-foreground bangla">
              <span className="font-medium text-foreground">{email}</span>-এ একটি লগইন লিংক পাঠানো হয়েছে। ইনবক্স চেক করুন।
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors bangla"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : (
          /* Login form */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold bangla">ইমেইল দিয়ে প্রবেশ করুন</h2>
              <p className="text-xs text-muted-foreground bangla">
                আপনার ইমেইলে একটি ম্যাজিক লিংক পাঠানো হবে। পাসওয়ার্ড লাগবে না।
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="আপনার ইমেইল ঠিকানা"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
                  id="auth-email-input"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bangla">{error}</p>
              )}

              <Button type="submit" disabled={submitting || !email.trim()} className="w-full bangla">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />পাঠানো হচ্ছে...</>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    ম্যাজিক লিংক পাঠান
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Back to home */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto bangla"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          হোমে ফিরুন
        </button>
      </div>
    </div>
  );
}
