-- 1. Create worker_documents table
CREATE TABLE IF NOT EXISTS core_personal.worker_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    doc_type text NOT NULL, -- 'prova_vida', 'contrato', 'nomina', etc
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    mime_type text,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE core_personal.worker_documents ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role for a specific empresa
-- Assuming standard setup where auth.uid() links to user_memberships
CREATE OR REPLACE FUNCTION core_common.get_user_role(p_empresa_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role 
    FROM core_common.user_memberships 
    WHERE user_id = auth.uid() 
      AND empresa_id = p_empresa_id 
      AND is_active = true 
    LIMIT 1;
$$;

-- 3. RLS Policies

-- SELECT: admin, rh, finance
CREATE POLICY "Allow select for admin, rh, finance" 
ON core_personal.worker_documents
FOR SELECT 
USING (
    core_common.get_user_role(empresa_id) IN ('admin', 'rh', 'finance')
);

-- INSERT: admin, rh
CREATE POLICY "Allow insert for admin, rh" 
ON core_personal.worker_documents
FOR INSERT 
WITH CHECK (
    core_common.get_user_role(empresa_id) IN ('admin', 'rh')
);

-- UPDATE: admin, rh
CREATE POLICY "Allow update for admin, rh" 
ON core_personal.worker_documents
FOR UPDATE 
USING (
    core_common.get_user_role(empresa_id) IN ('admin', 'rh')
)
WITH CHECK (
    core_common.get_user_role(empresa_id) IN ('admin', 'rh')
);

-- DELETE: admin only
CREATE POLICY "Allow delete for admin only" 
ON core_personal.worker_documents
FOR DELETE 
USING (
    core_common.get_user_role(empresa_id) = 'admin'
);
