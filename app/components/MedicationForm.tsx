'use client';

import React, { useState } from 'react';
import { Pill, Trash2, Clock, Bell, BellOff, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { MedicationLog } from '@/lib/supabaseClient';

interface MedicationFormProps {
  memberId: string;
  memberName: string;
  onAdd: (log: Omit<MedicationLog, 'id' | 'created_at'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  logs: MedicationLog[];
}

export default function MedicationForm({ memberId, memberName, onAdd, onDelete, logs }: MedicationFormProps) {
  const [brand, setBrand] = useState('');
  const [generic, setGeneric] = useState('');
  const [dosage, setDosage] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState('দিনে একবার');
  const [reminder, setReminder] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;
    setLoading(true);
    await onAdd({
      member_id: memberId,
      brand_name: brand.trim(),
      generic_name: generic.trim() || null,
      dosage: dosage.trim() || null,
      start_date: startDate,
      frequency,
      reminder_enabled: reminder,
    });
    setBrand('');
    setGeneric('');
    setDosage('');
    setFrequency('দিনে একবার');
    setReminder(false);
    setLoading(false);
  };

  const frequencyOptions = [
    'দিনে একবার',
    'দিনে দুইবার',
    'দিনে তিনবার',
    'প্রতি ৮ ঘণ্টায়',
    'প্রতি ১২ ঘণ্টায়',
    'সপ্তাহে একবার',
    'প্রয়োজনে',
  ];

  return (
    <div className="space-y-4">
      {/* Existing logs */}
      {logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Pill className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{log.brand_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bangla">
                  {log.dosage && <span>{log.dosage}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {log.frequency}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-2.5 h-2.5" />
                    {log.start_date}
                  </span>
                </div>
              </div>
              {log.reminder_enabled ? (
                <Bell className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <button
                onClick={() => log.id && onDelete(log.id)}
                className="p-1.5 rounded-lg hover:bg-red-950/40 text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold bangla text-primary">{memberName}-এর নতুন ওষুধ যোগ করুন</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground bangla">ব্র্যান্ড নাম *</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="যেমন: Napa"
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground bangla">ডোজ</label>
            <input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="যেমন: 500mg"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground bangla">শুরুর তারিখ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground bangla">কতবার</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors bangla"
            >
              {frequencyOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setReminder(!reminder)}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative cursor-pointer',
                reminder ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <div className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow',
                reminder ? 'left-5' : 'left-1'
              )} />
            </div>
            <span className="text-xs bangla text-muted-foreground">
              {reminder ? '🔔 রিমাইন্ডার চালু' : '🔕 রিমাইন্ডার বন্ধ'}
            </span>
          </label>

          <Button
            type="submit"
            size="sm"
            disabled={loading || !brand.trim()}
            className="bangla"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '+ যোগ করুন'}
          </Button>
        </div>
      </form>
    </div>
  );
}
