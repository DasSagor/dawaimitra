// ============================================================
// lib/utils.ts
// ============================================================
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  const existing = sessionStorage.getItem('dawaimitra_session');
  if (existing) return existing;
  const newId = generateSessionId();
  sessionStorage.setItem('dawaimitra_session', newId);
  return newId;
}

export function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const VERDICT_CONFIG = {
  safe: {
    label: '🟢 নিরাপদ',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.1)',
    border: '#16a34a',
    glow: 'glow-green',
    className: 'verdict-safe',
  },
  caution: {
    label: '🟡 সাবধান',
    color: '#ca8a04',
    bg: 'rgba(202,138,4,0.1)',
    border: '#ca8a04',
    glow: 'glow-yellow',
    className: 'verdict-caution',
  },
  danger: {
    label: '🔴 বিপদজনক',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.1)',
    border: '#dc2626',
    glow: 'glow-red',
    className: 'verdict-danger',
  },
} as const;

export type VerdictType = keyof typeof VERDICT_CONFIG;

export interface MedicineItem {
  brand: string;
  dose?: string | null;
  active_ingredient?: string | null;
}

export interface UserProfile {
  age?: number;
  is_pregnant?: boolean;
  current_medications?: string[];
  has_kidney_issue?: boolean;
  has_liver_issue?: boolean;
}

export interface GenericAlternative {
  brand: string;
  generic_name: string;
  price_per_unit: number;
  alternative_brand: string;
  alternative_price: number;
  savings: number;
}

export interface ExpiryAlert {
  brand: string;
  expiry_date: string;
  message_bangla: string;
}

export interface VerdictResult {
  verdict: VerdictType;
  color: 'green' | 'yellow' | 'red';
  explanation_bangla: string;
  antibiotic_alert: boolean;
  interactions_found: string[];
  // Feature #2: Confidence & Evidence
  confidence?: number;
  evidence_grade?: 'A' | 'B' | 'C' | 'D';
  evidence_source?: string;
  // Feature #3: Multi-drug interactions
  multi_drug_interactions?: string[];
  // Feature #6: Generic alternatives
  generic_alternatives?: GenericAlternative[];
  // Feature #12: Expiry alerts (set by scan-image route, passed via medicines)
  expiry_alerts?: ExpiryAlert[];
}
