-- Migration: Add search_source, email_required and sector_filter to lead_prospecting_jobs
-- File: 20260810111500_add_search_options_to_jobs.sql

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='lead_prospecting_jobs' AND column_name='search_source') THEN
        ALTER TABLE core_comercial.lead_prospecting_jobs ADD COLUMN search_source VARCHAR(50) DEFAULT 'google_maps';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='lead_prospecting_jobs' AND column_name='email_required') THEN
        ALTER TABLE core_comercial.lead_prospecting_jobs ADD COLUMN email_required BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core_comercial' AND table_name='lead_prospecting_jobs' AND column_name='sector_filter') THEN
        ALTER TABLE core_comercial.lead_prospecting_jobs ADD COLUMN sector_filter VARCHAR(100) NULL;
    END IF;
END $$;

COMMIT;

-- Reload Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
