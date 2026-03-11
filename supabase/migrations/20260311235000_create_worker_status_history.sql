-- Migration for Worker Status and Security Lifecycle

-- 1. Ensure core_personal.workers has the tracking dates (ingresso/baixa/alta/baja)
DO $$ 
BEGIN 
    -- Add data_ingresso if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_personal' AND table_name='workers' AND column_name='data_ingresso') THEN
        ALTER TABLE core_personal.workers ADD COLUMN data_ingresso DATE;
    END IF;

    -- Add data_baixa if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_personal' AND table_name='workers' AND column_name='data_baixa') THEN
        ALTER TABLE core_personal.workers ADD COLUMN data_baixa DATE;
    END IF;

    -- Add data_alta_seguridad if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_personal' AND table_name='workers' AND column_name='data_alta_seguridad') THEN
        ALTER TABLE core_personal.workers ADD COLUMN data_alta_seguridad DATE;
    END IF;

    -- Add data_baixa_seguridad if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_personal' AND table_name='workers' AND column_name='data_baixa_seguridad') THEN
        ALTER TABLE core_personal.workers ADD COLUMN data_baixa_seguridad DATE;
    END IF;
END $$;

-- 2. Create the worker_status_history table
CREATE TABLE IF NOT EXISTS core_personal.worker_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'TRABALHADOR' or 'SEGURIDADE'
    old_value VARCHAR(50),
    new_value VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    comments TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We do not strictly enforce old_value as NOT NULL because the previous state might be null/unknown for old corrupted records.

-- 3. Enable RLS
ALTER TABLE core_personal.worker_status_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Similar to other worker-centric tables: admins, rh, and users belonging to the company can view
CREATE POLICY "Enable SELECT for authenticated users" 
ON core_personal.worker_status_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM core_personal.workers w
        INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
        LEFT JOIN core_common.user_memberships um ON um.user_id = auth.uid() AND um.empresa_id = w.empresa_id
        WHERE w.id = worker_status_history.worker_id 
        AND (ur.role IN ('super_admin', 'admin_rh') OR um.role IN ('admin', 'rh', 'finance', 'commercial', 'user'))
    )
);

-- Insert policy restricted to specific roles, or simply relying on the RPC/Backend service role if we use RPC.
-- Assuming frontend calls standard insert:
CREATE POLICY "Enable INSERT for admins and rh" 
ON core_personal.worker_status_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
    OR
    EXISTS (
        SELECT 1 FROM core_personal.workers w
        INNER JOIN core_common.user_memberships um ON um.user_id = auth.uid() AND um.empresa_id = w.empresa_id
        WHERE w.id = worker_status_history.worker_id 
        AND um.role IN ('admin', 'rh')
    )
);

-- Do not allow UPDATE or DELETE by design (audit trail).
