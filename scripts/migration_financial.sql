-- Phase 2C: Financial System — Sub-account payouts
-- Run this in Supabase SQL Editor

-- 1. Add settlement tracking to reseller_parcels
ALTER TABLE reseller_parcels ADD COLUMN IF NOT EXISTS settled BOOLEAN DEFAULT false;
ALTER TABLE reseller_parcels ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES sub_account_payouts(id);

-- 2. Sub-account payouts (master generates these to sub-accounts)
CREATE TABLE IF NOT EXISTS sub_account_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id UUID REFERENCES profiles(id) NOT NULL,
  master_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Payout-parcel junction (which parcels are in which payout)
CREATE TABLE IF NOT EXISTS payout_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID REFERENCES sub_account_payouts(id) ON DELETE CASCADE NOT NULL,
  reseller_parcel_id UUID REFERENCES reseller_parcels(id) NOT NULL,
  cod_amount DECIMAL NOT NULL,
  delivery_price DECIMAL NOT NULL,
  net_amount DECIMAL NOT NULL,
  UNIQUE(payout_id, reseller_parcel_id)
);

-- 4. Update transaction types to include payout
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('delivery_fee','return_fee','deposit','withdrawal','adjustment','payout'));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_reseller_parcels_settled ON reseller_parcels(settled);
CREATE INDEX IF NOT EXISTS idx_reseller_parcels_payout ON reseller_parcels(payout_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_payouts_sub ON sub_account_payouts(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_payouts_master ON sub_account_payouts(master_id);
CREATE INDEX IF NOT EXISTS idx_payout_parcels_payout ON payout_parcels(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_parcels_parcel ON payout_parcels(reseller_parcel_id);

-- 6. RLS for new tables
ALTER TABLE sub_account_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_parcels ENABLE ROW LEVEL SECURITY;

-- Sub-account sees own payouts
CREATE POLICY "sub_account_payouts_self" ON sub_account_payouts
  FOR ALL USING (sub_account_id = auth.uid());

-- Master sees all payouts (admin role bypass)
CREATE POLICY "sub_account_payouts_master" ON sub_account_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sub-account sees payout parcels linked to their payouts
CREATE POLICY "payout_parcels_self" ON payout_parcels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sub_account_payouts sp WHERE sp.id = payout_id AND sp.sub_account_id = auth.uid())
  );

-- Master sees all payout parcels
CREATE POLICY "payout_parcels_master" ON payout_parcels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Trigger to update updated_at on sub_account_payouts
CREATE OR REPLACE FUNCTION update_payout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payout_updated_at ON sub_account_payouts;
CREATE TRIGGER trg_payout_updated_at BEFORE UPDATE ON sub_account_payouts
  FOR EACH ROW EXECUTE FUNCTION update_payout_updated_at();
