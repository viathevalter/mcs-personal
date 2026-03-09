-- Testing if the current user has any role at all or if the policy syntax is causing the denial.
-- Let's add a temporary policy that allows ANY authenticated user to insert/update their own or any worker_beneficios_settings just to test if the RLS role lookup is the culprit.

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on worker_beneficios_settings" ON core_personal.worker_beneficios_settings;

CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settings" 
ON core_personal.worker_beneficios_settings FOR ALL USING (
    -- Temporarily trusting all authenticated users for this table to isolate the bug
    auth.role() = 'authenticated'
);
