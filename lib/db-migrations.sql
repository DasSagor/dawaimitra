-- ==============================================================================
-- DawaiMitra - New Feature Migrations
-- Run AFTER the base supabase-schema.sql
-- Copy and run each section in your Supabase SQL Editor
-- ==============================================================================

-- ==============================================================================
-- Feature #6: Generic Alternatives & Price Comparison
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.generic_alternatives (
    id SERIAL PRIMARY KEY,
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    dosage TEXT,
    price_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast brand name lookups
CREATE INDEX IF NOT EXISTS idx_generic_alternatives_brand ON public.generic_alternatives (lower(brand_name));
CREATE INDEX IF NOT EXISTS idx_generic_alternatives_generic ON public.generic_alternatives (lower(generic_name));

-- Enable RLS
ALTER TABLE public.generic_alternatives ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to generic_alternatives"
ON public.generic_alternatives FOR SELECT USING (true);

-- Seed data — common Bangladeshi OTC brands with their prices (BDT per tablet/unit)
INSERT INTO public.generic_alternatives (brand_name, generic_name, dosage, price_per_unit) VALUES
  -- Paracetamol brands
  ('Napa',        'Paracetamol', '500mg',  5.00),
  ('Napa Extra',  'Paracetamol + Caffeine', '500mg/65mg', 6.00),
  ('Ace',         'Paracetamol', '500mg',  5.00),
  ('Paracet',     'Paracetamol', '500mg',  1.50),
  ('Renova',      'Paracetamol', '500mg',  2.00),
  ('Xpa',         'Paracetamol', '500mg',  2.50),

  -- Omeprazole / PPI brands
  ('Seclo',       'Omeprazole',  '20mg',   5.00),
  ('Losectil',    'Omeprazole',  '20mg',   5.50),
  ('Omepra',      'Omeprazole',  '20mg',   3.00),
  ('Pantonix',    'Pantoprazole','40mg',   8.00),
  ('Pantop',      'Pantoprazole','40mg',   6.00),

  -- Antihistamine / Allergy
  ('Alatrol',     'Cetirizine',  '10mg',   5.00),
  ('Cetrizin',    'Cetirizine',  '10mg',   2.00),
  ('Histacin',    'Chlorpheniramine','4mg', 1.00),

  -- Antibiotics
  ('Azithro',     'Azithromycin','500mg', 35.00),
  ('Zimax',       'Azithromycin','500mg', 30.00),
  ('Azithin',     'Azithromycin','500mg', 28.00),
  ('Cipro',       'Ciprofloxacin','500mg',20.00),
  ('Ciplox',      'Ciprofloxacin','500mg',18.00),
  ('Amoxil',      'Amoxicillin', '500mg', 15.00),
  ('Moxacil',     'Amoxicillin', '500mg', 10.00),

  -- NSAIDs / Pain
  ('Voltaren',    'Diclofenac',  '50mg',  10.00),
  ('Diclofen',    'Diclofenac',  '50mg',   5.00),
  ('Naprosyn',    'Naproxen',    '500mg', 12.00),
  ('Naprox',      'Naproxen',    '500mg',  8.00),
  ('Ibufen',      'Ibuprofen',   '400mg',  4.00),
  ('Brufen',      'Ibuprofen',   '400mg',  5.00),

  -- Antihypertensives
  ('Amlodil',     'Amlodipine',  '5mg',    8.00),
  ('Norvasc',     'Amlodipine',  '5mg',   12.00),
  ('Tenormin',    'Atenolol',    '50mg',   5.00),
  ('Atenol',      'Atenolol',    '50mg',   3.00),

  -- Antidiabetics
  ('Metforal',    'Metformin',   '500mg',  3.00),
  ('Glucomin',    'Metformin',   '500mg',  2.00),
  ('Diabecon',    'Metformin',   '500mg',  2.50),

  -- Antiulcer
  ('Ranitid',     'Ranitidine',  '150mg',  3.00),
  ('Neoceptin',   'Ranitidine',  '150mg',  2.50),

  -- Antifungals
  ('Flucon',      'Fluconazole', '150mg', 20.00),
  ('Flugal',      'Fluconazole', '150mg', 18.00)

ON CONFLICT DO NOTHING;


-- ==============================================================================
-- Feature #7: Family Profile & Medication Tracker
-- Requires Supabase Auth to be enabled first (Authentication → Settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relation TEXT NOT NULL DEFAULT 'নিজে',
    age INTEGER NOT NULL DEFAULT 0,
    is_pregnant BOOLEAN NOT NULL DEFAULT false,
    chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members (user_id);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own family members
CREATE POLICY "Users manage own family members"
ON public.family_members
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    generic_name TEXT,
    dosage TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    frequency TEXT NOT NULL DEFAULT 'দিনে একবার',
    reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_medication_logs_member_id ON public.medication_logs (member_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_start_date ON public.medication_logs (start_date DESC);

-- Enable RLS
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage logs for their own family members
CREATE POLICY "Users manage own medication logs"
ON public.medication_logs
USING (
    member_id IN (
        SELECT id FROM public.family_members WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    member_id IN (
        SELECT id FROM public.family_members WHERE user_id = auth.uid()
    )
);


-- ==============================================================================
-- Supabase Auth Setup Notes (run manually in Supabase dashboard)
-- ==============================================================================
-- 1. Go to Authentication → Providers → Enable Email (magic link)
-- 2. Go to Authentication → URL Configuration:
--    Site URL: http://localhost:3000 (or your production URL)
--    Redirect URLs: http://localhost:3000/dashboard
-- 3. No new environment variables needed — NEXT_PUBLIC_SUPABASE_URL and
--    NEXT_PUBLIC_SUPABASE_ANON_KEY already support auth.
-- ==============================================================================
