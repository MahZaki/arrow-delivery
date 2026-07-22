-- Phase 1: Master Reseller System
-- Run this in Supabase SQL Editor

-- 1. Add master/account columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS markup_type TEXT DEFAULT 'flat';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS markup_value DECIMAL DEFAULT 0;

-- 2. Reseller parcels table
CREATE TABLE IF NOT EXISTS reseller_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  zr_parcel_id TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  cod_amount DECIMAL NOT NULL,
  zr_delivery_price DECIMAL NOT NULL,
  my_delivery_price DECIMAL NOT NULL,
  zr_return_price DECIMAL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery_fee','return_fee','deposit','withdrawal','adjustment')),
  amount DECIMAL NOT NULL,
  ref_parcel_id UUID REFERENCES reseller_parcels(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reseller_parcels_profile ON reseller_parcels(profile_id);
CREATE INDEX IF NOT EXISTS idx_reseller_parcels_tracking ON reseller_parcels(tracking_number);
CREATE INDEX IF NOT EXISTS idx_reseller_parcels_state ON reseller_parcels(state);
CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_master ON profiles(master_id);

-- 5. Enable RLS
ALTER TABLE reseller_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS: sub-account sees own data, master sees all
CREATE POLICY "reseller_parcels_self" ON reseller_parcels
  FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "reseller_parcels_master" ON reseller_parcels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "transactions_self" ON transactions
  FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "transactions_master" ON transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
