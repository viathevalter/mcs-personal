-- =====================================================================================
-- MIGRAÇÃO: Módulo Dedicado MCS Contratação (Radar Pós-Baixa, Controle de Entrevistas e Divulgação)
-- Data: 2026-10-26
-- =====================================================================================

-- 1. Colunas de Qualificação Pós-Baixa ("Banco na Manga" / Standby) em core_personal.workers
ALTER TABLE core_personal.workers
ADD COLUMN IF NOT EXISTS rehire_status VARCHAR(50) DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS rehire_notes TEXT,
ADD COLUMN IF NOT EXISTS rehire_skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rehire_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rehire_reviewed_by UUID;

-- Trigger para disparar alerta de "Nova Baixa RH" na Contratação sempre que um trabalhador for inativado
CREATE OR REPLACE FUNCTION core_personal.trg_reset_rehire_review_on_baixa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW.status_trabajador ILIKE '%inativ%' OR NEW.status_trabajador ILIKE '%inactiv%' OR NEW.status_trabajador ILIKE '%desligad%' OR NEW.status_trabajador ILIKE '%baja%')
       AND (OLD.status_trabajador IS DISTINCT FROM NEW.status_trabajador) THEN
        IF COALESCE(OLD.rehire_status, '') != 'blocked' THEN
            NEW.rehire_status := 'pending_review';
        END IF;
        NEW.rehire_reviewed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workers_reset_rehire_on_baixa ON core_personal.workers;
CREATE TRIGGER trg_workers_reset_rehire_on_baixa
BEFORE UPDATE ON core_personal.workers
FOR EACH ROW
EXECUTE FUNCTION core_personal.trg_reset_rehire_review_on_baixa();

-- 2. Tabela de Controle de Entrevistas & Pipeline de Captação
CREATE TABLE IF NOT EXISTS core_personal.hiring_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    pedido_id UUID,
    pedido_codigo TEXT,
    pedido_item_id UUID,
    solicitud_id UUID,
    solicitud_target_id UUID,
    client_name TEXT,
    obra_location TEXT,
    job_function_name TEXT NOT NULL,
    source_type VARCHAR(30) NOT NULL DEFAULT 'internal_worker', -- 'internal_worker' | 'external_cv'
    worker_id UUID REFERENCES core_personal.workers(id) ON DELETE SET NULL,
    external_candidate_id TEXT,
    candidate_name TEXT NOT NULL,
    candidate_code TEXT,
    candidate_phone TEXT,
    candidate_email TEXT,
    candidate_document TEXT,
    candidate_location TEXT,
    candidate_documentation_type TEXT,
    candidate_languages TEXT[],
    candidate_has_license BOOLEAN,
    candidate_cv_url TEXT,
    previous_clients_summary TEXT,
    stage VARCHAR(40) NOT NULL DEFAULT 'to_contact', -- 'to_contact' | 'contacted' | 'scheduled' | 'interviewed' | 'approved' | 'hired' | 'rejected'
    interview_date TIMESTAMPTZ,
    expected_rate NUMERIC(10, 2),
    availability_notes TEXT,
    interviewer_notes TEXT,
    rating INT DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hiring_interviews_pedido ON core_personal.hiring_interviews(pedido_id);
CREATE INDEX IF NOT EXISTS idx_hiring_interviews_worker ON core_personal.hiring_interviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_hiring_interviews_ext_cand ON core_personal.hiring_interviews(external_candidate_id);
CREATE INDEX IF NOT EXISTS idx_hiring_interviews_stage ON core_personal.hiring_interviews(stage);

ALTER TABLE core_personal.hiring_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access hiring_interviews" ON core_personal.hiring_interviews;
CREATE POLICY "Authenticated users full access hiring_interviews"
ON core_personal.hiring_interviews
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON core_personal.hiring_interviews TO authenticated, service_role;

-- 3. Tabela de Canais / Grupos de Divulgação de Vagas (WhatsApp / Facebook / Redes)
CREATE TABLE IF NOT EXISTS core_personal.hiring_broadcast_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform VARCHAR(30) NOT NULL DEFAULT 'whatsapp', -- 'whatsapp' | 'facebook' | 'telegram' | 'linkedin' | 'other'
    category TEXT,
    url TEXT NOT NULL,
    members_estimate TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE core_personal.hiring_broadcast_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access hiring_broadcast_channels" ON core_personal.hiring_broadcast_channels;
CREATE POLICY "Authenticated users full access hiring_broadcast_channels"
ON core_personal.hiring_broadcast_channels
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON core_personal.hiring_broadcast_channels TO authenticated, service_role;
