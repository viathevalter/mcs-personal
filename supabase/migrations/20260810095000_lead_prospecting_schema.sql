-- Migration: Lead Prospecting Engine (Máquina de Leads)
-- File: 20260810095000_lead_prospecting_schema.sql

BEGIN;

-- 1. Create table for lead prospecting jobs (missões de busca)
CREATE TABLE IF NOT EXISTS core_comercial.lead_prospecting_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    keywords VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    target_count INT NOT NULL DEFAULT 50,
    processed_count INT NOT NULL DEFAULT 0,
    found_emails_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'paused', 'failed'
    delay_seconds INT NOT NULL DEFAULT 3,
    api_key_override TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL
);

-- 2. Create table for staging prospecting results
CREATE TABLE IF NOT EXISTS core_comercial.lead_prospecting_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES core_comercial.lead_prospecting_jobs(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(100) NULL,
    website VARCHAR(255) NULL,
    linkedin_url VARCHAR(255) NULL,
    instagram_url VARCHAR(255) NULL,
    address VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Espanha',
    confidence_score INT DEFAULT 85,
    status VARCHAR(50) NOT NULL DEFAULT 'raw', -- 'raw', 'enriched', 'imported', 'discarded'
    imported_lead_id UUID NULL REFERENCES core_comercial.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add social & web columns to core_comercial.leads if not existing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='leads' AND column_name='website') THEN
        ALTER TABLE core_comercial.leads ADD COLUMN website VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='leads' AND column_name='linkedin_url') THEN
        ALTER TABLE core_comercial.leads ADD COLUMN linkedin_url VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='leads' AND column_name='instagram_url') THEN
        ALTER TABLE core_comercial.leads ADD COLUMN instagram_url VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='leads' AND column_name='prospecting_job_id') THEN
        ALTER TABLE core_comercial.leads ADD COLUMN prospecting_job_id UUID NULL REFERENCES core_comercial.lead_prospecting_jobs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE core_comercial.lead_prospecting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.lead_prospecting_results ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE core_comercial.lead_prospecting_jobs TO authenticated, service_role, postgres;
GRANT ALL ON TABLE core_comercial.lead_prospecting_results TO authenticated, service_role, postgres;

-- Policies for lead_prospecting_jobs
DROP POLICY IF EXISTS lead_prospecting_jobs_policy ON core_comercial.lead_prospecting_jobs;
CREATE POLICY lead_prospecting_jobs_policy ON core_comercial.lead_prospecting_jobs
    FOR ALL USING (true);

-- Policies for lead_prospecting_results
DROP POLICY IF EXISTS lead_prospecting_results_policy ON core_comercial.lead_prospecting_results;
CREATE POLICY lead_prospecting_results_policy ON core_comercial.lead_prospecting_results
    FOR ALL USING (true);

COMMIT;
