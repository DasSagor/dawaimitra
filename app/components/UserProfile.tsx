'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/utils';

interface UserProfileProps {
  onChange: (profile: UserProfile) => void;
  initialProfile?: UserProfile;
}

const STORAGE_KEY = 'dawaimitra_user_profile';

export default function UserProfileForm({ onChange, initialProfile }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    age: undefined,
    is_pregnant: false,
    current_medications: [],
    has_kidney_issue: false,
    has_liver_issue: false,
  });
  const [medsInput, setMedsInput] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        setProfile(parsed);
        setMedsInput((parsed.current_medications ?? []).join(', '));
        onChange(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    onChange(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const handleMedsInput = (val: string) => {
    setMedsInput(val);
    const meds = val.split(',').map((m) => m.trim()).filter(Boolean);
    updateProfile({ current_medications: meds });
  };

  const hasData = !!(profile.age || profile.is_pregnant || profile.has_kidney_issue || profile.has_liver_issue || (profile.current_medications ?? []).length > 0);

  return (
    <div className={cn('rounded-xl border transition-all duration-300', isOpen ? 'border-primary/40' : 'border-border')}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left group"
        id="profile-toggle"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-lg transition-colors', hasData ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium bangla">রোগীর তথ্য</p>
            <p className="text-xs text-muted-foreground bangla">
              {hasData ? 'তথ্য সংরক্ষিত আছে' : 'ঐচ্ছিক — আরও সঠিক ফলাফলের জন্য'}
            </p>
          </div>
        </div>
        <div className={cn('transition-transform duration-200', isOpen && 'rotate-180')}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4 animate-fade-in">
          {/* Age */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs bangla text-muted-foreground">বয়স</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={profile.age ?? ''}
                onChange={(e) => updateProfile({ age: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="যেমন: 35"
                className="text-sm"
                id="profile-age"
              />
            </div>

            {/* Pregnancy */}
            <div className="space-y-1.5">
              <Label className="text-xs bangla text-muted-foreground">গর্ভাবস্থা</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="pregnancy-toggle"
                  checked={profile.is_pregnant ?? false}
                  onCheckedChange={(checked) => updateProfile({ is_pregnant: checked })}
                />
                <Label htmlFor="pregnancy-toggle" className="bangla text-sm cursor-pointer">
                  {profile.is_pregnant ? '✓ হ্যাঁ' : 'না'}
                </Label>
              </div>
            </div>
          </div>

          {/* Health conditions */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="kidney-toggle"
                checked={profile.has_kidney_issue ?? false}
                onCheckedChange={(checked) => updateProfile({ has_kidney_issue: checked })}
              />
              <Label htmlFor="kidney-toggle" className="bangla text-xs cursor-pointer text-muted-foreground">
                কিডনি সমস্যা
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="liver-toggle"
                checked={profile.has_liver_issue ?? false}
                onCheckedChange={(checked) => updateProfile({ has_liver_issue: checked })}
              />
              <Label htmlFor="liver-toggle" className="bangla text-xs cursor-pointer text-muted-foreground">
                লিভার সমস্যা
              </Label>
            </div>
          </div>

          {/* Current medications */}
          <div className="space-y-1.5">
            <Label className="text-xs bangla text-muted-foreground">বর্তমানে যে ওষুধগুলো খাচ্ছেন (কমা দিয়ে আলাদা করুন)</Label>
            <Input
              value={medsInput}
              onChange={(e) => handleMedsInput(e.target.value)}
              placeholder="যেমন: Metformin, Amlodipine, Warfarin"
              className="text-sm bangla"
              id="current-meds-input"
            />
          </div>

          {profile.is_pregnant && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs bangla text-yellow-300">
                গর্ভাবস্থায় যেকোনো ওষুধ খাওয়ার আগে অবশ্যই চিকিৎসকের পরামর্শ নিন।
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
