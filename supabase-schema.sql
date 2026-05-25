-- ==============================================================================
-- DawaiMitra - Supabase Database Schema
-- Run this script in your Supabase SQL Editor to set up the database
-- ==============================================================================

-- 1. Create drug_interactions table
CREATE TABLE IF NOT EXISTS public.drug_interactions (
    id SERIAL PRIMARY KEY,
    brand1 TEXT,
    brand2 TEXT,
    generic1 TEXT NOT NULL,
    generic2 TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')) NOT NULL,
    advice_bangla TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by generic names
CREATE INDEX IF NOT EXISTS idx_drug_interactions_generic1 ON public.drug_interactions (lower(generic1));
CREATE INDEX IF NOT EXISTS idx_drug_interactions_generic2 ON public.drug_interactions (lower(generic2));

-- 2. Create user_queries table for analytics (anonymized)
CREATE TABLE IF NOT EXISTS public.user_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    inputs_json JSONB NOT NULL,
    verdict_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session-based lookup
CREATE INDEX IF NOT EXISTS idx_user_queries_session_id ON public.user_queries (session_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_created_at ON public.user_queries (created_at DESC);

-- ==============================================================================
-- Sample Data Insertion (Seed Data for Bangladesh Context)
-- ==============================================================================
INSERT INTO public.drug_interactions (generic1, generic2, interaction_type, severity, advice_bangla, source)
VALUES
  -- Paracetamol Overdose (Common issue with Napa/Ace and combo drugs)
  ('paracetamol', 'paracetamol', 'duplicate_therapy', 'major', 'আপনি একই সাথে একাধিক প্যারাসিটামল জাতীয় ওষুধ খাচ্ছেন (যেমন নাপা এবং এইস)। এতে লিভারের মারাত্মক ক্ষতি হতে পারে। যেকোনো একটি বেছে নিন এবং দৈনিক ৪ গ্রামের বেশি খাবেন না।', 'BNF'),
  
  -- Omeprazole & Clopidogrel (Seclo + Plavix)
  ('omeprazole', 'clopidogrel', 'cyp2c19_inhibition', 'major', 'ওমিপ্রাজল (যেমন সেকলো) ক্লোপিডোগ্রেলের (হার্টের রক্ত পাতলা করার ওষুধ) কার্যকারিতা কমিয়ে দেয়। এর ফলে হার্ট অ্যাটাকের ঝুঁকি বাড়তে পারে। ওমিপ্রাজলের বদলে প্যান্টোপ্রাজল ব্যবহার করা যেতে পারে, তবে অবশ্যই ডাক্তারের পরামর্শ নিন।', 'FDA'),
  
  -- Azithromycin & Domperidone (QT Prolongation risk)
  ('azithromycin', 'domperidone', 'qt_prolongation', 'major', 'অ্যাজিথ্রোমাইসিন (অ্যান্টিবায়োটিক) এবং ডমপেরিডোন (বমির ওষুধ) একসাথে খেলে হার্টের ছন্দে মারাত্মক সমস্যা (অ্যারিথমিয়া) হতে পারে। বিশেষ করে বয়স্ক বা হার্টের রোগীদের ক্ষেত্রে এটি বিপজ্জনক।', 'Medscape'),
  
  -- Metronidazole & Alcohol (Disulfiram-like reaction)
  ('metronidazole', 'alcohol', 'disulfiram_reaction', 'contraindicated', 'মেট্রোনিডাজল (যেমন ফ্লাজিল) খাওয়ার সময় এবং কোর্স শেষের ৩ দিন পর্যন্ত কোনো অ্যালকোহল বা অ্যালকোহলযুক্ত সিরাপ খাওয়া সম্পূর্ণ নিষেধ। এতে বমি, মাথা ঘোরা এবং মারাত্মক শারীরিক প্রতিক্রিয়া হতে পারে।', 'BNF'),
  
  -- Ciprofloxacin & Iron/Calcium Supplements
  ('ciprofloxacin', 'calcium', 'absorption_inhibition', 'moderate', 'ক্যালসিয়াম বা আয়রন সাপ্লিমেন্টের সাথে সিপ্রোফ্লক্সাসিন (অ্যান্টিবায়োটিক) খেলে অ্যান্টিবায়োটিকটি ঠিকমতো কাজ করে না। অন্তত ২ ঘণ্টা আগে বা পরে অ্যান্টিবায়োটিকটি খান।', 'Drugs.com'),
  
  -- NSAID (Diclofenac) & ACE Inhibitors (Ramipril)
  ('diclofenac', 'ramipril', 'renal_impairment', 'moderate', 'ডাইক্লোফেনাক (ব্যথার ওষুধ) এবং রামিপ্রিল (প্রেসারের ওষুধ) একসাথে খেলে প্রেসারের ওষুধের কার্যকারিতা কমে যেতে পারে এবং কিডনির ক্ষতি হওয়ার ঝুঁকি বাড়ে।', 'BNF')
ON CONFLICT DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queries ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Public read access to drug interactions
CREATE POLICY "Public read access to drug interactions" 
ON public.drug_interactions FOR SELECT USING (true);

-- Allow anyone (including anon) to insert queries
CREATE POLICY "Anon can insert user queries" 
ON public.user_queries FOR INSERT WITH CHECK (true);

-- Only service role can read user queries (analytics)
CREATE POLICY "Service role can read user queries" 
ON public.user_queries FOR SELECT USING (auth.role() = 'service_role');
