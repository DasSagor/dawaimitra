'use client';

import React, { useState } from 'react';
import { User, Heart, Baby, Activity, ChevronDown, ChevronUp, Pill, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FamilyMember, MedicationLog } from '@/lib/supabaseClient';
import MedicationForm from '@/app/components/MedicationForm';
import { Button } from '@/app/components/ui/button';

interface MemberCardProps {
  member: FamilyMember;
  logs: MedicationLog[];
  onDelete: (memberId: string) => void;
  onAddLog: (log: Omit<MedicationLog, 'id' | 'created_at'>) => Promise<void>;
  onDeleteLog: (logId: string) => Promise<void>;
  onCheck: (member: FamilyMember) => void;
}

const relationIcons: Record<string, React.ReactNode> = {
  'স্বামী/স্ত্রী': <Heart className="w-4 h-4" />,
  'সন্তান': <Baby className="w-4 h-4" />,
  'বাবা/মা': <User className="w-4 h-4" />,
  'নিজে': <Activity className="w-4 h-4" />,
};

export default function MemberCard({ member, logs, onDelete, onAddLog, onDeleteLog, onCheck }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  const reminderCount = logs.filter((l) => l.reminder_enabled).length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-cyan-500/60 flex items-center justify-center text-white shrink-0">
          {relationIcons[member.relation] ?? <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm bangla">{member.name}</p>
            {member.is_pregnant && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-900/60 text-pink-300 bangla">গর্ভবতী</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground bangla">
            {member.relation} • বয়স: {member.age} বছর
          </p>
          {member.chronic_conditions && member.chronic_conditions.length > 0 && (
            <p className="text-[10px] text-muted-foreground/70 bangla truncate">
              {member.chronic_conditions.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {logs.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary bangla">
              <Pill className="w-2.5 h-2.5" />
              {logs.length}টি
            </span>
          )}
          {reminderCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 bangla">
              🔔 {reminderCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* Main Action Button */}
          <Button 
            onClick={() => onCheck(member)}
            className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-primary-foreground bangla shadow-md"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            এই সদস্যের জন্য ওষুধ যাচাই করুন
          </Button>

          <MedicationForm
            memberId={member.id!}
            memberName={member.name}
            logs={logs}
            onAdd={onAddLog}
            onDelete={onDeleteLog}
          />

          <button
            onClick={() => onDelete(member.id!)}
            className="text-[11px] text-red-500/60 hover:text-red-400 transition-colors bangla w-full text-center mt-2"
          >
            এই সদস্য মুছে ফেলুন
          </button>
        </div>
      )}
    </div>
  );
}
