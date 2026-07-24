-- Add WaSender API key to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wa_sender_api_key TEXT;

-- WhatsApp campaigns table
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'cancelled')),
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  carrier_filter TEXT DEFAULT 'all' CHECK (carrier_filter IN ('ecotrack', 'zrexpress', 'all')),
  status_filter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_campaigns_profile ON whatsapp_campaigns(profile_id);

-- WhatsApp campaign recipients table
CREATE TABLE IF NOT EXISTS whatsapp_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
  crm_order_id UUID REFERENCES crm_orders(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_recipients_campaign ON whatsapp_recipients(campaign_id);

ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaigns"
  ON whatsapp_campaigns FOR ALL
  USING (auth.uid() = profile_id);

CREATE POLICY "Users manage own recipients"
  ON whatsapp_recipients FOR ALL
  USING (
    EXISTS (SELECT 1 FROM whatsapp_campaigns WHERE id = whatsapp_recipients.campaign_id AND profile_id = auth.uid())
  );
