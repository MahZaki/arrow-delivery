CREATE TABLE IF NOT EXISTS crm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL DEFAULT 'ecotrack' CHECK (carrier IN ('ecotrack', 'zrexpress')),
  tracking_number TEXT NOT NULL,
  status TEXT,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  wilaya_id TEXT,
  city TEXT,
  district TEXT,
  street_address TEXT,
  cod_amount NUMERIC DEFAULT 0,
  delivery_price NUMERIC DEFAULT 0,
  return_price NUMERIC DEFAULT 0,
  product_description TEXT,
  quantity INTEGER DEFAULT 1,
  weight NUMERIC,
  notes TEXT,
  zr_parcel_id TEXT,
  carrier_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, tracking_number)
);

CREATE INDEX IF NOT EXISTS idx_crm_orders_profile_id ON crm_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_carrier ON crm_orders(carrier);
CREATE INDEX IF NOT EXISTS idx_crm_orders_tracking ON crm_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_crm_orders_client_name ON crm_orders(client_name);
CREATE INDEX IF NOT EXISTS idx_crm_orders_client_phone ON crm_orders(client_phone);
CREATE INDEX IF NOT EXISTS idx_crm_orders_created_at ON crm_orders(created_at DESC);

ALTER TABLE crm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM orders"
  ON crm_orders FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all CRM orders"
  ON crm_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert their own CRM orders"
  ON crm_orders FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own CRM orders"
  ON crm_orders FOR UPDATE
  USING (auth.uid() = profile_id);
