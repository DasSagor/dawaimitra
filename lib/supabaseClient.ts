import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Browser/server client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side only (service role key for writes)
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Fall back to anon key if service key not available
    return supabase;
  }
  return createClient(supabaseUrl, serviceKey);
}

// ============================================================
// Types matching Supabase schema
// ============================================================
export interface DrugInteraction {
  id: number;
  brand1: string | null;
  brand2: string | null;
  generic1: string;
  generic2: string;
  interaction_type: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  advice_bangla: string;
  source: string | null;
}

export interface UserQuery {
  id?: string;
  session_id: string;
  inputs_json: object;
  verdict_json: object;
  created_at?: string;
}

// Feature #6: Generic Alternatives
export interface GenericAlternativeRow {
  id: number;
  brand_name: string;
  generic_name: string;
  dosage: string | null;
  price_per_unit: number;
}

// Feature #7: Family Members
export interface FamilyMember {
  id?: string;
  user_id?: string;
  name: string;
  relation: string;
  age: number;
  is_pregnant: boolean;
  chronic_conditions: string[];
  created_at?: string;
}

// Feature #7: Medication Logs
export interface MedicationLog {
  id?: string;
  member_id: string;
  brand_name: string;
  generic_name: string | null;
  dosage: string | null;
  start_date: string;
  frequency: string;
  reminder_enabled: boolean;
  created_at?: string;
}

// ============================================================
// Drug interactions lookup
// ============================================================
export async function fetchRelevantInteractions(
  generics: string[]
): Promise<DrugInteraction[]> {
  if (generics.length === 0) return [];

  // Normalize to lowercase for comparison
  const normalized = generics.map((g) => g.toLowerCase().trim());

  const { data, error } = await supabase
    .from('drug_interactions')
    .select('*')
    .or(
      normalized
        .flatMap((g) => [
          `generic1.ilike.%${g}%`,
          `generic2.ilike.%${g}%`,
        ])
        .join(',')
    )
    .limit(50);

  if (error) {
    console.error('Supabase interaction fetch error:', error.message);
    return [];
  }

  return (data as DrugInteraction[]) ?? [];
}

// ============================================================
// Feature #6: Generic alternatives lookup
// ============================================================
export async function fetchGenericAlternatives(
  brandNames: string[]
): Promise<GenericAlternativeRow[]> {
  if (brandNames.length === 0) return [];

  const normalized = brandNames.map((b) => b.toLowerCase().trim());

  const { data, error } = await supabase
    .from('generic_alternatives')
    .select('*')
    .or(normalized.map((b) => `brand_name.ilike.%${b}%`).join(','))
    .limit(30);

  if (error) {
    console.error('Supabase generic_alternatives fetch error:', error.message);
    return [];
  }

  return (data as GenericAlternativeRow[]) ?? [];
}

// ============================================================
// Save query log
// ============================================================
export async function saveUserQuery(query: UserQuery): Promise<void> {
  const client = getSupabaseAdmin();
  const { error } = await client.from('user_queries').insert([
    {
      session_id: query.session_id,
      inputs_json: query.inputs_json,
      verdict_json: query.verdict_json,
    },
  ]);

  if (error) {
    console.error('Failed to save user query:', error.message);
  }
}

// ============================================================
// Feature #7: Family members CRUD
// ============================================================
export async function fetchFamilyMembers(userId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchFamilyMembers error:', error.message);
    return [];
  }
  return (data as FamilyMember[]) ?? [];
}

export async function addFamilyMember(
  member: Omit<FamilyMember, 'id' | 'created_at'>
): Promise<FamilyMember | null> {
  const { data, error } = await supabase
    .from('family_members')
    .insert([member])
    .select()
    .single();

  if (error) {
    console.error('addFamilyMember error:', error.message);
    return null;
  }
  return data as FamilyMember;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await supabase.from('family_members').delete().eq('id', id);
  if (error) console.error('deleteFamilyMember error:', error.message);
}

// ============================================================
// Feature #7: Medication logs CRUD
// ============================================================
export async function fetchMedicationLogs(memberId: string): Promise<MedicationLog[]> {
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('member_id', memberId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('fetchMedicationLogs error:', error.message);
    return [];
  }
  return (data as MedicationLog[]) ?? [];
}

export async function addMedicationLog(
  log: Omit<MedicationLog, 'id' | 'created_at'>
): Promise<MedicationLog | null> {
  const { data, error } = await supabase
    .from('medication_logs')
    .insert([log])
    .select()
    .single();

  if (error) {
    console.error('addMedicationLog error:', error.message);
    return null;
  }
  return data as MedicationLog;
}

export async function deleteMedicationLog(id: string): Promise<void> {
  const { error } = await supabase.from('medication_logs').delete().eq('id', id);
  if (error) console.error('deleteMedicationLog error:', error.message);
}
