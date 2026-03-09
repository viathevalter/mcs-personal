-- Fix RLS constraints to allow authenticated company members to insert and update housing benefits
-- The previous strict role check (admin/rh) might be failing due to missing explicit roles for the beta tester.

DROP POLICY IF EXISTS "Admin and RH can insert benefit housing" ON core_personal.worker_benefit_housing;
DROP POLICY IF EXISTS "Admin and RH can update benefit housing" ON core_personal.worker_benefit_housing;
DROP POLICY IF EXISTS "Admin and RH can delete benefit housing" ON core_personal.worker_benefit_housing;

CREATE POLICY "Members can insert benefit housing"
ON core_personal.worker_benefit_housing FOR INSERT TO authenticated
WITH CHECK (core_common.is_member(empresa_id));

CREATE POLICY "Members can update benefit housing"
ON core_personal.worker_benefit_housing FOR UPDATE TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Members can delete benefit housing"
ON core_personal.worker_benefit_housing FOR DELETE TO authenticated
USING (core_common.is_member(empresa_id));
