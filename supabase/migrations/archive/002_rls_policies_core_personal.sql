-- 1. Helper Functions
-- These functions must run with SECURITY DEFINER to bypass RLS within themselves 
-- (to prevent infinite recursion when evaluating policies on user_memberships)
CREATE OR REPLACE FUNCTION core_common.is_member(p_empresa_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM core_common.user_memberships
    WHERE user_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION core_common.has_role(p_empresa_id uuid, p_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM core_common.user_memberships
    WHERE user_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND role = p_role
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Policies for core_common.user_memberships
-- We allow users to see their own memberships, AND admins to see all memberships in their empresa.
-- Using subqueries instead of helper functions here avoids infinite recursion.
CREATE POLICY "Users can view their own memberships" 
ON core_common.user_memberships 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships in their empresa"
ON core_common.user_memberships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core_common.user_memberships admin_member
    WHERE admin_member.user_id = auth.uid()
      AND admin_member.empresa_id = core_common.user_memberships.empresa_id
      AND admin_member.role = 'admin'
      AND admin_member.is_active = true
  )
);
-- No INSERT/UPDATE/DELETE default policies means they are implicitly denied for normal users.


-- 3. Policies for core_personal.workers
CREATE POLICY "Members can view workers"
ON core_personal.workers FOR SELECT TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Admin and RH can insert workers"
ON core_personal.workers FOR INSERT TO authenticated
WITH CHECK (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and RH can update workers"
ON core_personal.workers FOR UPDATE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin can delete workers"
ON core_personal.workers FOR DELETE TO authenticated
USING (core_common.has_role(empresa_id, 'admin'));


-- 4. Policies for core_personal.worker_benefit_housing
CREATE POLICY "Admin, RH and Finance can view benefit housing"
ON core_personal.worker_benefit_housing FOR SELECT TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh') OR core_common.has_role(empresa_id, 'finance'));

CREATE POLICY "Admin and RH can insert benefit housing"
ON core_personal.worker_benefit_housing FOR INSERT TO authenticated
WITH CHECK (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and RH can update benefit housing"
ON core_personal.worker_benefit_housing FOR UPDATE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and RH can delete benefit housing"
ON core_personal.worker_benefit_housing FOR DELETE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));


-- 5. Policies for core_personal.ledger_types
CREATE POLICY "Members can view ledger types"
ON core_personal.ledger_types FOR SELECT TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Admin can insert ledger types"
ON core_personal.ledger_types FOR INSERT TO authenticated
WITH CHECK (core_common.has_role(empresa_id, 'admin'));

CREATE POLICY "Admin can update ledger types"
ON core_personal.ledger_types FOR UPDATE TO authenticated
USING (core_common.has_role(empresa_id, 'admin'));

CREATE POLICY "Admin can delete ledger types"
ON core_personal.ledger_types FOR DELETE TO authenticated
USING (core_common.has_role(empresa_id, 'admin'));


-- 6. Policies for core_personal.worker_ledger_entries
CREATE POLICY "Admin, Finance and RH can view ledger entries"
ON core_personal.worker_ledger_entries FOR SELECT TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'finance') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin, Finance and RH can insert ledger entries"
ON core_personal.worker_ledger_entries FOR INSERT TO authenticated
WITH CHECK (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'finance') OR core_common.has_role(empresa_id, 'rh'));

CREATE POLICY "Admin and Finance can update ledger entries"
ON core_personal.worker_ledger_entries FOR UPDATE TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'finance'));

CREATE POLICY "Admin can delete ledger entries"
ON core_personal.worker_ledger_entries FOR DELETE TO authenticated
USING (core_common.has_role(empresa_id, 'admin'));
