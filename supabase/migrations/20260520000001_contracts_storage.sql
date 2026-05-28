-- ========================================================================================
-- Migration: 20260520000001_contracts_storage.sql
-- Description: Criação de buckets e políticas de armazenamento no Supabase Storage
-- ========================================================================================

-- 1. Criar os buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-templates', 'contract-templates', false) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('worker-contracts', 'worker-contracts', false) 
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Armazenamento para 'contract-templates'
CREATE POLICY "Admins e RH podem gerenciar templates de contratos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'contract-templates' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'admin_rh', 'rh', 'operador') AND is_active = true)
)
WITH CHECK (
    bucket_id = 'contract-templates' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'admin_rh', 'rh', 'operador') AND is_active = true)
);

CREATE POLICY "Membros podem ler templates de contratos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-templates');

-- 3. Políticas de Armazenamento para 'worker-contracts'
CREATE POLICY "Admins e RH podem gerenciar contratos gerados"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'worker-contracts' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'admin_rh', 'rh', 'operador') AND is_active = true)
)
WITH CHECK (
    bucket_id = 'worker-contracts' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'admin_rh', 'rh', 'operador') AND is_active = true)
);

CREATE POLICY "Membros podem ler contratos de colaboradores"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'worker-contracts');
