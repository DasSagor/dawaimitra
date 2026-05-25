'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { FamilyMember, MedicationLog } from '@/lib/supabaseClient';
import {
  fetchFamilyMembers,
  addFamilyMember,
  deleteFamilyMember,
  fetchMedicationLogs,
  addMedicationLog,
  deleteMedicationLog,
} from '@/lib/supabaseClient';
import MemberCard from '@/app/components/MemberCard';
import InteractionChecker from '@/app/components/InteractionChecker';

interface FamilyDashboardProps {
  userId: string;
}

const RELATION_OPTIONS = ['নিজে', 'স্বামী/স্ত্রী', 'সন্তান', 'বাবা/মা', 'ভাই/বোন', 'দাদা/দাদি', 'অন্যান্য'];

export default function FamilyDashboard({ userId }: FamilyDashboardProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [logsMap, setLogsMap] = useState<Record<string, MedicationLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [checkingMember, setCheckingMember] = useState<FamilyMember | null>(null);

  // New member form state
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('নিজে');
  const [newAge, setNewAge] = useState('');
  const [newPregnant, setNewPregnant] = useState(false);
  const [newConditions, setNewConditions] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const mems = await fetchFamilyMembers(userId);
    setMembers(mems);

    // Load logs for all members in parallel
    const logsEntries = await Promise.all(
      mems.map(async (m) => {
        const logs = await fetchMedicationLogs(m.id!);
        return [m.id!, logs] as [string, MedicationLog[]];
      })
    );
    setLogsMap(Object.fromEntries(logsEntries));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Feature #7: Medication reminder via Notification API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const checkReminders = () => {
      const now = new Date();
      const hour = now.getHours();
      // Fire reminders around 9 AM
      if (hour !== 9) return;

      Object.entries(logsMap).forEach(([memberId, logs]) => {
        const member = members.find((m) => m.id === memberId);
        if (!member) return;
        logs.forEach((log) => {
          if (!log.reminder_enabled) return;
          if (Notification.permission === 'granted') {
            new Notification('DawaiMitra 💊', {
              body: `আপনার ${member.name}-এর ওষুধ খাওয়ার সময় হয়েছে। (${log.brand_name})`,
              icon: '/icon-192x192.png',
            });
          }
        });
      });
    };

    // Request permission once
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check every minute
    const interval = setInterval(checkReminders, 60 * 1000);
    return () => clearInterval(interval);
  }, [logsMap, members]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddingMember(true);

    const member = await addFamilyMember({
      user_id: userId,
      name: newName.trim(),
      relation: newRelation,
      age: parseInt(newAge) || 0,
      is_pregnant: newPregnant,
      chronic_conditions: newConditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    });

    if (member) {
      setMembers((prev) => [...prev, member]);
      setLogsMap((prev) => ({ ...prev, [member.id!]: [] }));
    }
    setNewName('');
    setNewAge('');
    setNewConditions('');
    setNewPregnant(false);
    setShowAddForm(false);
    setAddingMember(false);
  };

  const handleDeleteMember = async (memberId: string) => {
    await deleteFamilyMember(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setLogsMap((prev) => {
      const { [memberId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAddLog = async (log: Omit<MedicationLog, 'id' | 'created_at'>) => {
    const added = await addMedicationLog(log);
    if (added) {
      setLogsMap((prev) => ({
        ...prev,
        [log.member_id]: [...(prev[log.member_id] ?? []), added],
      }));
    }
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteMedicationLog(logId);
    setLogsMap((prev) => {
      const updated = { ...prev };
      for (const key in updated) {
        updated[key] = updated[key].filter((l) => l.id !== logId);
      }
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm bangla text-muted-foreground">পরিবারের তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  // If a member is selected for checking, render InteractionChecker instead
  if (checkingMember) {
    const memberLogs = logsMap[checkingMember.id!] || [];
    const currentMeds = Array.from(new Set(memberLogs.map(l => l.brand_name)));
    const condStr = checkingMember.chronic_conditions.join(' ').toLowerCase();

    return (
      <InteractionChecker 
        initialProfile={{
          age: checkingMember.age || undefined,
          is_pregnant: checkingMember.is_pregnant,
          has_kidney_issue: condStr.includes('কিডনি') || condStr.includes('kidney'),
          has_liver_issue: condStr.includes('লিভার') || condStr.includes('liver'),
          current_medications: currentMeds,
        }}
        hideProfileForm={true}
        onClose={() => setCheckingMember(null)}
        title={`${checkingMember.name}-এর জন্য ওষুধ যাচাই`}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold bangla">পারিবারিক প্রোফাইল</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary bangla">
            {members.length} জন
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bangla gap-1.5"
          variant={showAddForm ? 'secondary' : 'default'}
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showAddForm ? 'বাতিল' : 'নতুন সদস্য'}
        </Button>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <form
          onSubmit={handleAddMember}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-fade-in"
        >
          <p className="text-xs font-semibold text-primary bangla">নতুন পরিবারের সদস্য যোগ করুন</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground bangla">নাম *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="সদস্যের নাম"
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground bangla">সম্পর্ক</label>
              <select
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary bangla"
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground bangla">বয়স</label>
              <input
                type="number"
                min={0}
                max={120}
                value={newAge}
                onChange={(e) => setNewAge(e.target.value)}
                placeholder="বছর"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground bangla">দীর্ঘমেয়াদি রোগ (কমা দিয়ে)</label>
              <input
                value={newConditions}
                onChange={(e) => setNewConditions(e.target.value)}
                placeholder="যেমন: ডায়াবেটিস, উচ্চ রক্তচাপ"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary bangla"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setNewPregnant(!newPregnant)}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                newPregnant ? 'bg-pink-500' : 'bg-secondary'
              )}
            >
              <div className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow',
                newPregnant ? 'left-5' : 'left-1'
              )} />
            </div>
            <span className="text-xs bangla text-muted-foreground">গর্ভাবস্থা</span>
          </label>

          <Button type="submit" disabled={addingMember || !newName.trim()} className="w-full bangla">
            {addingMember ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />যোগ হচ্ছে...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" />সদস্য যোগ করুন</>
            )}
          </Button>
        </form>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm bangla text-muted-foreground">এখনো কোনো পরিবারের সদস্য যোগ করা হয়নি।</p>
          <p className="text-xs bangla text-muted-foreground/60">উপরের বোতামে ক্লিক করে শুরু করুন।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              logs={logsMap[member.id!] ?? []}
              onDelete={handleDeleteMember}
              onAddLog={handleAddLog}
              onDeleteLog={handleDeleteLog}
              onCheck={(m) => setCheckingMember(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
