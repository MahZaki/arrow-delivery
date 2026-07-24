-- Allow sub-accounts to see master's CRM orders and vice versa
DROP POLICY IF EXISTS "Users can view their own CRM orders" ON crm_orders;
DROP POLICY IF EXISTS "Admins can view all CRM orders" ON crm_orders;

CREATE POLICY "Users can view their own CRM orders"
  ON crm_orders FOR SELECT
  USING (
    auth.uid() = profile_id
    OR profile_id IN (SELECT id FROM profiles WHERE master_id = auth.uid())
    OR auth.uid() IN (SELECT master_id FROM profiles WHERE id = profile_id)
  );

CREATE POLICY "Admins can view all CRM orders"
  ON crm_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow sub-accounts to insert/update CRM orders for their master
DROP POLICY IF EXISTS "Users can insert their own CRM orders" ON crm_orders;
DROP POLICY IF EXISTS "Users can update their own CRM orders" ON crm_orders;

CREATE POLICY "Users can insert their own CRM orders"
  ON crm_orders FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    OR profile_id IN (SELECT id FROM profiles WHERE master_id = auth.uid())
  );

CREATE POLICY "Users can update their own CRM orders"
  ON crm_orders FOR UPDATE
  USING (
    auth.uid() = profile_id
    OR profile_id IN (SELECT id FROM profiles WHERE master_id = auth.uid())
  );
