-- Worker Beneficios History (Audit Log)
CREATE TABLE IF NOT EXISTS core_personal.worker_beneficios_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    change_type TEXT NOT NULL CHECK (change_type IN ('iban_update', 'tarifa_update')),
    old_value TEXT,
    new_value TEXT,
    document_url TEXT, -- Required for IBAN updates
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE core_personal.worker_beneficios_history ENABLE ROW LEVEL SECURITY;

-- Create Policies (Admin full access)
CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_history" 
ON core_personal.worker_beneficios_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
