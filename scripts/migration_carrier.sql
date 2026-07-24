-- Add carrier field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carrier TEXT NOT NULL DEFAULT 'ecotrack' CHECK (carrier IN ('ecotrack', 'zrexpress'));

-- Index for carrier filtering
CREATE INDEX IF NOT EXISTS idx_profiles_carrier ON profiles(carrier);
