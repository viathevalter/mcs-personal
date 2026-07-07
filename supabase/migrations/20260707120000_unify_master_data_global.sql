-- =========================================================================
-- MIGRATION: UNIFY MASTER DATA GLOBAL (CLIENTS, WORKERS, JOB FUNCTIONS, EPIS)
-- =========================================================================

-- 1. Create client_company_settings table
CREATE TABLE IF NOT EXISTS core_common.client_company_settings (
    client_id uuid REFERENCES core_common.clients(id) ON DELETE CASCADE,
    empresa_id uuid REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    payment_term_id uuid REFERENCES core_common.payment_terms(id) ON DELETE SET NULL,
    status text DEFAULT 'active',
    credit_limit numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    PRIMARY KEY (client_id, empresa_id)
);

-- Enable RLS for client_company_settings
ALTER TABLE core_common.client_company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_client_company_settings ON core_common.client_company_settings;
CREATE POLICY select_client_company_settings ON core_common.client_company_settings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_client_company_settings ON core_common.client_company_settings;
CREATE POLICY insert_client_company_settings ON core_common.client_company_settings
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS update_client_company_settings ON core_common.client_company_settings;
CREATE POLICY update_client_company_settings ON core_common.client_company_settings
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS delete_client_company_settings ON core_common.client_company_settings;
CREATE POLICY delete_client_company_settings ON core_common.client_company_settings
    FOR DELETE TO authenticated USING (true);

GRANT ALL ON TABLE core_common.client_company_settings TO anon, authenticated, service_role;


-- 2. Add next_invoice_number to core_common.empresas
ALTER TABLE core_common.empresas ADD COLUMN IF NOT EXISTS next_invoice_number integer DEFAULT 1;


-- 3. DEDUPLICATE AND MERGE EXISTING DATA
DO $$
DECLARE
    r RECORD;
    master_client_id uuid;
    duplicate_client RECORD;
    
    master_func_id uuid;
    duplicate_func RECORD;
    
    master_epi_id uuid;
    duplicate_epi RECORD;
    
    master_worker_id uuid;
    duplicate_worker RECORD;
BEGIN
    -- =========================================================================
    -- A. CLIENTS DEDUPLICATION
    -- =========================================================================
    -- Populate client_company_settings with all current entries first
    INSERT INTO core_common.client_company_settings (client_id, empresa_id, payment_term_id, status)
    SELECT id, empresa_id, payment_term_id, status
    FROM core_common.clients
    ON CONFLICT (client_id, empresa_id) DO NOTHING;

    -- Loop through duplicates by NIF (tax_id)
    FOR r IN 
        SELECT tax_id, COUNT(*) 
        FROM core_common.clients 
        WHERE tax_id IS NOT NULL AND tax_id <> ''
        GROUP BY tax_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Pick the master client (active status, or first created)
        SELECT id INTO master_client_id
        FROM core_common.clients
        WHERE tax_id = r.tax_id
        ORDER BY (status = 'active') DESC, created_at ASC
        LIMIT 1;

        -- Migrate configurations and update foreign key tables for duplicates
        FOR duplicate_client IN
            SELECT id, empresa_id, payment_term_id, status
            FROM core_common.clients
            WHERE tax_id = r.tax_id AND id <> master_client_id
        LOOP
            INSERT INTO core_common.client_company_settings (client_id, empresa_id, payment_term_id, status)
            VALUES (master_client_id, duplicate_client.empresa_id, duplicate_client.payment_term_id, duplicate_client.status)
            ON CONFLICT (client_id, empresa_id) DO UPDATE 
            SET payment_term_id = EXCLUDED.payment_term_id, status = EXCLUDED.status;

            -- Update dependants
            UPDATE core_comercial.estimaciones SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_comercial.pedidos SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_common.client_sites SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_operacoes.solicitud_targets SET source_client_id = master_client_id WHERE source_client_id = duplicate_client.id;
            UPDATE core_operacoes.solicitud_targets SET target_client_id = master_client_id WHERE target_client_id = duplicate_client.id;
            UPDATE core_operacoes.solicitudes_operativas SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_personal.client_compliance_configs SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_personal.worker_assignments SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_personal.worker_compliance_status SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_common.client_vies_checks SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_comercial.leads SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_common.client_contacts SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_finance.faturas SET client_id = master_client_id WHERE client_id = duplicate_client.id;
            UPDATE core_finance.horas_trabalhadas SET client_id = master_client_id WHERE client_id = duplicate_client.id;

            DELETE FROM core_common.clients WHERE id = duplicate_client.id;
        END LOOP;
    END LOOP;

    -- =========================================================================
    -- B. JOB FUNCTIONS DEDUPLICATION
    -- =========================================================================
    -- Loop through duplicates by code
    FOR r IN 
        SELECT code, COUNT(*) 
        FROM core_comercial.job_functions 
        WHERE code IS NOT NULL AND code <> ''
        GROUP BY code 
        HAVING COUNT(*) > 1
    LOOP
        SELECT id INTO master_func_id
        FROM core_comercial.job_functions
        WHERE code = r.code
        ORDER BY (status = 'active') DESC, created_at ASC
        LIMIT 1;

        FOR duplicate_func IN
            SELECT id
            FROM core_comercial.job_functions
            WHERE code = r.code AND id <> master_func_id
        LOOP
            -- Handle potential unique key conflict in job_function_rate_refs
            DELETE FROM core_comercial.job_function_rate_refs d
            WHERE job_function_id = duplicate_func.id
              AND EXISTS (
                  SELECT 1 FROM core_comercial.job_function_rate_refs m
                  WHERE m.job_function_id = master_func_id
                    AND m.empresa_id = d.empresa_id
                    AND COALESCE(m.country_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(d.country_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    AND COALESCE(m.region_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(d.region_id, '00000000-0000-0000-0000-000000000000'::uuid)
              );

            -- Handle potential unique key conflict in job_function_epis
            DELETE FROM core_logistica.job_function_epis d
            WHERE job_function_id = duplicate_func.id
              AND EXISTS (
                  SELECT 1 FROM core_logistica.job_function_epis m
                  WHERE m.job_function_id = master_func_id
                    AND m.epi_id = d.epi_id
              );

            -- Update dependants
            UPDATE core_comercial.estimacion_items SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_comercial.job_function_questions SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_comercial.job_function_rate_refs SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_comercial.pedido_items SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_logistica.job_function_epis SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_personal.worker_assignments SET job_function_id = master_func_id WHERE job_function_id = duplicate_func.id;
            UPDATE core_finance.horas_trabalhadas SET funcao_id = master_func_id WHERE funcao_id = duplicate_func.id;

            DELETE FROM core_comercial.job_functions WHERE id = duplicate_func.id;
        END LOOP;
    END LOOP;

    -- =========================================================================
    -- C. EPIS DEDUPLICATION
    -- =========================================================================
    FOR r IN 
        SELECT name, COUNT(*) 
        FROM core_logistica.epis 
        WHERE name IS NOT NULL AND name <> ''
        GROUP BY name 
        HAVING COUNT(*) > 1
    LOOP
        SELECT id INTO master_epi_id
        FROM core_logistica.epis
        WHERE name = r.name
        ORDER BY created_at ASC
        LIMIT 1;

        FOR duplicate_epi IN
            SELECT id
            FROM core_logistica.epis
            WHERE name = r.name AND id <> master_epi_id
        LOOP
            -- Handle potential unique key conflict in job_function_epis
            DELETE FROM core_logistica.job_function_epis d
            WHERE epi_id = duplicate_epi.id
              AND EXISTS (
                  SELECT 1 FROM core_logistica.job_function_epis m
                  WHERE m.epi_id = master_epi_id
                    AND m.job_function_id = d.job_function_id
              );

            UPDATE core_logistica.job_function_epis SET epi_id = master_epi_id WHERE epi_id = duplicate_epi.id;
            DELETE FROM core_logistica.epis WHERE id = duplicate_epi.id;
        END LOOP;
    END LOOP;

    -- =========================================================================
    -- D. WORKERS DEDUPLICATION
    -- =========================================================================
    FOR r IN 
        SELECT nif, COUNT(*) 
        FROM core_personal.workers 
        WHERE nif IS NOT NULL AND nif <> ''
        GROUP BY nif 
        HAVING COUNT(*) > 1
    LOOP
        SELECT id INTO master_worker_id
        FROM core_personal.workers
        WHERE nif = r.nif
        ORDER BY (status_trabajador = 'Ativo') DESC, created_at ASC
        LIMIT 1;

        FOR duplicate_worker IN
            SELECT id
            FROM core_personal.workers
            WHERE nif = r.nif AND id <> master_worker_id
        LOOP
            -- Prevent unique constraint violations:
            -- 1. worker_hours_unique_period (worker_id, period_year, period_month)
            DELETE FROM core_personal.worker_hours d
            WHERE worker_id = duplicate_worker.id
              AND EXISTS (
                  SELECT 1 FROM core_personal.worker_hours m
                  WHERE m.worker_id = master_worker_id
                    AND m.period_year = d.period_year
                    AND m.period_month = d.period_month
              );

            -- 2. seguridade_status unique worker_id reference (if any)
            DELETE FROM core_personal.seguridade_status d
            WHERE worker_id = duplicate_worker.id
              AND EXISTS (
                  SELECT 1 FROM core_personal.seguridade_status m
                  WHERE m.worker_id = master_worker_id
              );

            -- 3. worker_beneficios_settings unique worker_id reference (if any)
            DELETE FROM core_personal.worker_beneficios_settings d
            WHERE worker_id = duplicate_worker.id
              AND EXISTS (
                  SELECT 1 FROM core_personal.worker_beneficios_settings m
                  WHERE m.worker_id = master_worker_id
              );

            -- 4. worker_ibans unique ibans or worker references
            DELETE FROM core_personal.worker_ibans d
            WHERE worker_id = duplicate_worker.id
              AND EXISTS (
                  SELECT 1 FROM core_personal.worker_ibans m
                  WHERE m.worker_id = master_worker_id
                    AND m.iban = d.iban
              );

            -- 5. worker_assignments (worker_id, client_id, start_date)
            DELETE FROM core_personal.worker_assignments d
            WHERE worker_id = duplicate_worker.id
              AND EXISTS (
                  SELECT 1 FROM core_personal.worker_assignments m
                  WHERE m.worker_id = master_worker_id
                    AND m.client_id = d.client_id
                    AND m.start_date = d.start_date
              );

            -- Update dependants
            UPDATE core_operacoes.solicitud_targets SET source_worker_id = master_worker_id WHERE source_worker_id = duplicate_worker.id;
            UPDATE core_operacoes.solicitud_targets SET target_worker_id = master_worker_id WHERE target_worker_id = duplicate_worker.id;
            UPDATE core_operacoes.solicitudes_operativas SET target_worker_id = master_worker_id WHERE target_worker_id = duplicate_worker.id;
            UPDATE core_personal.contracts SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.document_requests SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.holerites SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.safety_certificates SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.seguridade_status SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_assignments SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_beneficios_history SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_beneficios_settings SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_benefit_housing SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_compliance_status SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_discounts SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_documents SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_hours SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_ibans SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_ledger_entries SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.worker_status_history SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_conversations') THEN
                EXECUTE 'UPDATE public.chat_conversations SET worker_id = $1 WHERE worker_id = $2' USING master_worker_id, duplicate_worker.id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_scheduled_messages') THEN
                EXECUTE 'UPDATE public.chat_scheduled_messages SET target_worker_id = $1 WHERE target_worker_id = $2' USING master_worker_id, duplicate_worker.id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'worker_discounts') THEN
                EXECUTE 'UPDATE public.worker_discounts SET worker_id = $1 WHERE worker_id = $2' USING master_worker_id, duplicate_worker.id;
            END IF;
            UPDATE core_finance.horas_trabalhadas SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;
            UPDATE core_personal.extracao_horas_imagens SET worker_id = master_worker_id WHERE worker_id = duplicate_worker.id;

            DELETE FROM core_personal.workers WHERE id = duplicate_worker.id;
        END LOOP;
    END LOOP;
END $$;


-- =========================================================================
-- E. SECURITY RLS POLICIES CLEANUP & VIEWS (RESOLVING SYSTEM DEPENDENCIES)
-- =========================================================================
-- Drop view depending on workers
DROP VIEW IF EXISTS core_operacoes.workers;

-- Drop old policies on core_common.clients
DROP POLICY IF EXISTS "Edicao de clientes" ON core_common.clients;
DROP POLICY IF EXISTS "Insercao de clientes" ON core_common.clients;
DROP POLICY IF EXISTS "Leitura global de clientes" ON core_common.clients;
DROP POLICY IF EXISTS "Permitir leitura pública de clients vinculados a estimaciones " ON core_common.clients;
DROP POLICY IF EXISTS "Escrita de clientes" ON core_common.clients;
DROP POLICY IF EXISTS "Escrita clientes por empresa" ON core_common.clients;

-- Drop old policies on core_common.client_contacts
DROP POLICY IF EXISTS "Escrita de contatos de clientes por empresa" ON core_common.client_contacts;
DROP POLICY IF EXISTS "Leitura de contatos de clientes por empresa" ON core_common.client_contacts;

-- Drop old policies on core_comercial.job_functions
DROP POLICY IF EXISTS "Edicao de funcoes" ON core_comercial.job_functions;
DROP POLICY IF EXISTS "Insercao de funcoes" ON core_comercial.job_functions;
DROP POLICY IF EXISTS "Leitura global de funcoes" ON core_comercial.job_functions;
DROP POLICY IF EXISTS "Escrita de funcoes" ON core_comercial.job_functions;
DROP POLICY IF EXISTS "Escrita funcoes por empresa" ON core_comercial.job_functions;

-- Drop old policies on core_logistica.epis
DROP POLICY IF EXISTS "Edicao de epis" ON core_logistica.epis;
DROP POLICY IF EXISTS "Insercao de epis" ON core_logistica.epis;
DROP POLICY IF EXISTS "Leitura global de epis" ON core_logistica.epis;
DROP POLICY IF EXISTS "Escrita de epis" ON core_logistica.epis;
DROP POLICY IF EXISTS "Escrita epis por empresa" ON core_logistica.epis;

-- Drop old policies on core_personal.workers
DROP POLICY IF EXISTS "Admin can delete workers" ON core_personal.workers;
DROP POLICY IF EXISTS "Enable insert access for all members" ON core_personal.workers;
DROP POLICY IF EXISTS "Enable read access for all workers" ON core_personal.workers;
DROP POLICY IF EXISTS "Enable update access for all members" ON core_personal.workers;
DROP POLICY IF EXISTS "Members can view workers" ON core_personal.workers;

-- Drop old policies on worker_status_history and worker_ibans depending on workers.empresa_id
DROP POLICY IF EXISTS "Enable delete access for admins" ON core_personal.worker_ibans;
DROP POLICY IF EXISTS "Enable insert access for all members" ON core_personal.worker_ibans;
DROP POLICY IF EXISTS "Enable read access for all members" ON core_personal.worker_ibans;
DROP POLICY IF EXISTS "Enable update access for all members" ON core_personal.worker_ibans;

DROP POLICY IF EXISTS "Enable INSERT for admins and rh" ON core_personal.worker_status_history;
DROP POLICY IF EXISTS "Enable SELECT for authenticated users" ON core_personal.worker_status_history;


-- =========================================================================
-- F. STRUCTURAL TABLE CLEANUPS (REMOVE SCOPING COLUMNS)
-- =========================================================================
-- Drop dependent indexes and constraints first
DROP INDEX IF EXISTS core_common.idx_clients_empresa;
ALTER TABLE core_common.clients DROP CONSTRAINT IF EXISTS uq_clients_codigo_empresa;

DROP INDEX IF EXISTS core_comercial.idx_job_functions_empresa;
ALTER TABLE core_comercial.job_functions DROP CONSTRAINT IF EXISTS uq_job_functions_code_empresa;

DROP INDEX IF EXISTS core_logistica.idx_epis_empresa;
ALTER TABLE core_logistica.epis DROP CONSTRAINT IF EXISTS uq_epis_code_active;

DROP INDEX IF EXISTS core_personal.ix_workers_empresa;
ALTER TABLE core_personal.workers DROP CONSTRAINT IF EXISTS workers_empresa_id_cod_colab_key;

-- Now drop columns
ALTER TABLE core_common.clients DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE core_common.clients DROP COLUMN IF EXISTS payment_term_id;
ALTER TABLE core_common.clients DROP COLUMN IF EXISTS status;
ALTER TABLE core_common.clients DROP COLUMN IF EXISTS credit_limit;
ALTER TABLE core_common.clients DROP COLUMN IF EXISTS current_debt;

ALTER TABLE core_comercial.job_functions DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE core_logistica.epis DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE core_personal.workers DROP COLUMN IF EXISTS empresa_id;


-- =========================================================================
-- G. RECREATE NEW RLS POLICIES & VIEWS FOR GLOBAL SCOPE
-- =========================================================================
-- Recreate View core_operacoes.workers (without empresa_id)
CREATE OR REPLACE VIEW core_operacoes.workers AS
SELECT id,
   cod_colab,
   nome,
   email,
   movil,
   niss,
   nie,
   dni,
   pasaporte,
   created_at,
   nif,
   status_seguridad,
   status_trabajador,
   licencia_conducir,
   nacionalidade,
   fecha_nacimiento,
   nuss,
   foto,
   data_ingresso,
   data_baixa,
   data_alta_seguridad,
   data_baixa_seguridad,
   cliente,
   contratante,
   funcion
  FROM core_personal.workers;

-- Clients
CREATE POLICY select_global_clients ON core_common.clients FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY write_global_clients ON core_common.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Client Contacts
CREATE POLICY select_global_client_contacts ON core_common.client_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_client_contacts ON core_common.client_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Job Functions
CREATE POLICY select_global_job_functions ON core_comercial.job_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_job_functions ON core_comercial.job_functions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EPIs
CREATE POLICY select_global_epis ON core_logistica.epis FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_epis ON core_logistica.epis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Workers
CREATE POLICY select_global_workers ON core_personal.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_workers ON core_personal.workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Worker IBANs
CREATE POLICY select_global_worker_ibans ON core_personal.worker_ibans FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_worker_ibans ON core_personal.worker_ibans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Worker Status History
CREATE POLICY select_global_worker_status_history ON core_personal.worker_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY write_global_worker_status_history ON core_personal.worker_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =========================================================================
-- H. SEQUENTIAL AUTO-GENERATION OF CODES
-- =========================================================================
-- Setup Client Sequence
DO $$
DECLARE
    max_val integer;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::integer), 0) INTO max_val
    FROM core_common.clients
    WHERE codigo ~ '^C\d+$';

    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS core_common.seq_client_code START WITH ' || (max_val + 1);
END $$;

CREATE OR REPLACE FUNCTION core_common.fn_generate_next_client_code()
RETURNS text AS $$
DECLARE
    next_val integer;
    next_code text;
BEGIN
    next_val := nextval('core_common.seq_client_code');
    next_code := 'C' || lpad(next_val::text, 4, '0');
    RETURN next_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION core_common.fn_trg_client_generate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        NEW.codigo := core_common.fn_generate_next_client_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_generate_code ON core_common.clients;
CREATE TRIGGER trg_client_generate_code
BEFORE INSERT ON core_common.clients
FOR EACH ROW
EXECUTE FUNCTION core_common.fn_trg_client_generate_code();


-- Setup Worker Sequence
DO $$
DECLARE
    max_val integer;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(cod_colab, '\D', '', 'g'), '')::integer), 0) INTO max_val
    FROM core_personal.workers
    WHERE cod_colab ~ '^E\d+$';

    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS core_personal.seq_worker_code START WITH ' || (max_val + 1);
END $$;

CREATE OR REPLACE FUNCTION core_personal.fn_generate_next_worker_code()
RETURNS text AS $$
DECLARE
    next_val integer;
    next_code text;
BEGIN
    next_val := nextval('core_personal.seq_worker_code');
    next_code := 'E' || lpad(next_val::text, 4, '0');
    RETURN next_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION core_personal.fn_trg_worker_generate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cod_colab IS NULL OR NEW.cod_colab = '' THEN
        NEW.cod_colab := core_personal.fn_generate_next_worker_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_worker_generate_code ON core_personal.workers;
CREATE TRIGGER trg_worker_generate_code
BEFORE INSERT ON core_personal.workers
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_trg_worker_generate_code();
