-- 1. Create worker_documents table se não existir
CREATE TABLE IF NOT EXISTS core_personal.worker_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    doc_type text NOT NULL, -- 'contrato_trabalho', 'passaporte', etc
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    mime_type text,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE core_personal.worker_documents ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies para acesso transversal (similar ao workers)
DROP POLICY IF EXISTS "Enable all access for all members" ON core_personal.worker_documents;

CREATE POLICY "Enable all access for all members" ON core_personal.worker_documents
FOR ALL USING (
  core_common.is_member(empresa_id) 
  OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin_rh'::app_role, 'operador'::app_role])
  )
  OR EXISTS (
      SELECT 1 FROM core_common.user_memberships 
      WHERE user_id = auth.uid() 
      AND empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid 
      AND is_active = true
  )
);
