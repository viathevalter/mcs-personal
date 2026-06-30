-- ========================================================================================
-- Migration: 20260625140000_automatic_compliance_sync.sql
-- Description: Automates compliance checklist creation and worker document linking.
-- ========================================================================================

-- 1. Trigger Function: sync_worker_assignment_to_compliance
CREATE OR REPLACE FUNCTION core_personal.sync_worker_assignment_to_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_required_docs TEXT[];
    v_compliance_status_id UUID;
    v_doc_type TEXT;
    v_worker_doc_id UUID;
    v_doc_status VARCHAR;
    v_client_site_id UUID;
BEGIN
    -- Only sync if status is 'planned' or 'active'
    IF NEW.status IN ('planned', 'active') THEN
        -- Resolve client_site_id (must not be NULL for worker_compliance_status table)
        v_client_site_id := NEW.client_site_id;
        IF v_client_site_id IS NULL THEN
            SELECT id INTO v_client_site_id
            FROM core_common.client_sites
            WHERE client_id = NEW.client_id AND status = 'active'
            ORDER BY created_at ASC
            LIMIT 1;
            
            IF v_client_site_id IS NULL THEN
                SELECT id INTO v_client_site_id
                FROM core_common.client_sites
                WHERE client_id = NEW.client_id
                ORDER BY created_at ASC
                LIMIT 1;
            END IF;

            IF v_client_site_id IS NULL THEN
                INSERT INTO core_common.client_sites (empresa_id, client_id, name, status)
                VALUES (NEW.empresa_id, NEW.client_id, 'Sede / Geral', 'active')
                RETURNING id INTO v_client_site_id;
            END IF;
        END IF;

        -- Try to find site-specific config first, then client-specific config
        SELECT required_doc_types INTO v_required_docs
        FROM core_personal.client_compliance_configs
        WHERE empresa_id = NEW.empresa_id 
          AND client_id = NEW.client_id 
          AND client_site_id = v_client_site_id
        LIMIT 1;

        IF v_required_docs IS NULL THEN
            SELECT required_doc_types INTO v_required_docs
            FROM core_personal.client_compliance_configs
            WHERE empresa_id = NEW.empresa_id 
              AND client_id = NEW.client_id 
              AND client_site_id IS NULL
            LIMIT 1;
        END IF;

        -- If no config exists, default to standard document checklist
        IF v_required_docs IS NULL THEN
            v_required_docs := ARRAY['contrato_trabalho', 'apto_medico', 'prl_certificate'];
        END IF;

        -- Insert or update compliance status
        INSERT INTO core_personal.worker_compliance_status (
            empresa_id, worker_id, client_id, client_site_id, overall_status, is_apto
        )
        VALUES (
            NEW.empresa_id, NEW.worker_id, NEW.client_id, v_client_site_id, 'pending', false
        )
        ON CONFLICT (empresa_id, worker_id, client_id, client_site_id) 
        DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_compliance_status_id;

        -- For each required doc, insert/update in worker_compliance_documents checklist
        FOREACH v_doc_type IN ARRAY v_required_docs LOOP
            -- Check if worker already has a document of this type uploaded
            SELECT id INTO v_worker_doc_id
            FROM core_personal.worker_documents
            WHERE worker_id = NEW.worker_id 
              AND doc_type = v_doc_type
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_worker_doc_id IS NOT NULL THEN
                v_doc_status := 'uploaded';
            ELSE
                v_doc_status := 'missing';
            END IF;

            INSERT INTO core_personal.worker_compliance_documents (
                empresa_id, compliance_status_id, doc_type, worker_document_id, status
            )
            VALUES (
                NEW.empresa_id, v_compliance_status_id, v_doc_type, v_worker_doc_id, v_doc_status
            )
            ON CONFLICT (compliance_status_id, doc_type)
            DO UPDATE SET 
                worker_document_id = COALESCE(worker_compliance_documents.worker_document_id, EXCLUDED.worker_document_id),
                status = CASE 
                    WHEN worker_compliance_documents.worker_document_id IS NOT NULL THEN worker_compliance_documents.status 
                    ELSE EXCLUDED.status 
                END,
                updated_at = NOW();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger: trg_sync_worker_assignment_to_compliance
DROP TRIGGER IF EXISTS trg_sync_worker_assignment_to_compliance ON core_personal.worker_assignments;
CREATE TRIGGER trg_sync_worker_assignment_to_compliance
AFTER INSERT OR UPDATE OF status, client_id, client_site_id ON core_personal.worker_assignments
FOR EACH ROW
EXECUTE FUNCTION core_personal.sync_worker_assignment_to_compliance();


-- 3. Trigger Function: sync_signed_contract_to_worker_documents
CREATE OR REPLACE FUNCTION core_personal.sync_signed_contract_to_worker_documents()
RETURNS TRIGGER AS $$
DECLARE
    v_worker_name TEXT;
    v_doc_id UUID;
    v_file_path TEXT;
    v_mime_type TEXT;
BEGIN
    -- Detect transition to status = 'signed'
    IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
        v_file_path := COALESCE(NEW.signed_document_url, NEW.document_url);
        
        IF v_file_path IS NOT NULL THEN
            -- Fetch worker's name
            SELECT nome INTO v_worker_name FROM core_personal.workers WHERE id = NEW.worker_id;
            
            -- Detect mime type
            IF v_file_path LIKE '%.pdf' THEN
                v_mime_type := 'application/pdf';
            ELSE
                v_mime_type := 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            END IF;

            -- Check if already exists in worker_documents to avoid duplication
            SELECT id INTO v_doc_id
            FROM core_personal.worker_documents
            WHERE worker_id = NEW.worker_id 
              AND doc_type = 'contrato_trabalho'
              AND file_path = v_file_path
            LIMIT 1;

            IF v_doc_id IS NULL THEN
                INSERT INTO core_personal.worker_documents (
                    empresa_id, worker_id, doc_type, file_path, file_name, file_size, mime_type
                )
                VALUES (
                    NEW.empresa_id,
                    NEW.worker_id,
                    'contrato_trabalho',
                    v_file_path,
                    'Contrato de Trabalho - ' || COALESCE(v_worker_name, 'Trabalhador') || CASE WHEN v_file_path LIKE '%.pdf' THEN '.pdf' ELSE '.docx' END,
                    0,
                    v_mime_type
                )
                RETURNING id INTO v_doc_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: trg_sync_signed_contract_to_worker_documents
DROP TRIGGER IF EXISTS trg_sync_signed_contract_to_worker_documents ON core_personal.contracts;
CREATE TRIGGER trg_sync_signed_contract_to_worker_documents
AFTER INSERT OR UPDATE OF status ON core_personal.contracts
FOR EACH ROW
EXECUTE FUNCTION core_personal.sync_signed_contract_to_worker_documents();


-- 5. Trigger Function: sync_worker_document_to_compliance
CREATE OR REPLACE FUNCTION core_personal.sync_worker_document_to_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_rec RECORD;
BEGIN
    -- When a document is uploaded/modified in worker_documents, link it to all matching compliance checklists
    FOR v_rec IN 
        SELECT wcd.id, wcd.compliance_status_id
        FROM core_personal.worker_compliance_documents wcd
        JOIN core_personal.worker_compliance_status wcs ON wcs.id = wcd.compliance_status_id
        WHERE wcs.worker_id = NEW.worker_id 
          AND wcd.doc_type = NEW.doc_type
          -- Only overwrite if not approved yet
          AND wcd.status != 'approved'
    LOOP
        UPDATE core_personal.worker_compliance_documents
        SET worker_document_id = NEW.id,
            status = 'uploaded',
            updated_at = NOW()
        WHERE id = v_rec.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: trg_sync_worker_document_to_compliance
DROP TRIGGER IF EXISTS trg_sync_worker_document_to_compliance ON core_personal.worker_documents;
CREATE TRIGGER trg_sync_worker_document_to_compliance
AFTER INSERT OR UPDATE ON core_personal.worker_documents
FOR EACH ROW
EXECUTE FUNCTION core_personal.sync_worker_document_to_compliance();


-- 7. Backfill compliance statuses and checklists for all existing planned/active worker assignments
DO $$
DECLARE
    v_assign RECORD;
    v_required_docs TEXT[];
    v_compliance_status_id UUID;
    v_doc_type TEXT;
    v_worker_doc_id UUID;
    v_doc_status VARCHAR;
    v_client_site_id UUID;
BEGIN
    FOR v_assign IN 
        SELECT id, empresa_id, worker_id, client_id, client_site_id, status
        FROM core_personal.worker_assignments
        WHERE status IN ('planned', 'active')
    LOOP
        -- Resolve client_site_id (must not be NULL)
        v_client_site_id := v_assign.client_site_id;
        IF v_client_site_id IS NULL THEN
            SELECT id INTO v_client_site_id
            FROM core_common.client_sites
            WHERE client_id = v_assign.client_id AND status = 'active'
            ORDER BY created_at ASC
            LIMIT 1;
            
            IF v_client_site_id IS NULL THEN
                SELECT id INTO v_client_site_id
                FROM core_common.client_sites
                WHERE client_id = v_assign.client_id
                ORDER BY created_at ASC
                LIMIT 1;
            END IF;

            IF v_client_site_id IS NULL THEN
                INSERT INTO core_common.client_sites (empresa_id, client_id, name, status)
                VALUES (v_assign.empresa_id, v_assign.client_id, 'Sede / Geral', 'active')
                RETURNING id INTO v_client_site_id;
            END IF;
        END IF;

        -- Try to find site-specific config first, then client-specific config
        SELECT required_doc_types INTO v_required_docs
        FROM core_personal.client_compliance_configs
        WHERE empresa_id = v_assign.empresa_id 
          AND client_id = v_assign.client_id 
          AND client_site_id = v_client_site_id
        LIMIT 1;

        IF v_required_docs IS NULL THEN
            SELECT required_doc_types INTO v_required_docs
            FROM core_personal.client_compliance_configs
            WHERE empresa_id = v_assign.empresa_id 
              AND client_id = v_assign.client_id 
              AND client_site_id IS NULL
            LIMIT 1;
        END IF;

        -- If no config exists, default to a standard list
        IF v_required_docs IS NULL THEN
            v_required_docs := ARRAY['contrato_trabalho', 'apto_medico', 'prl_certificate'];
        END IF;

        -- Insert or update compliance status
        INSERT INTO core_personal.worker_compliance_status (
            empresa_id, worker_id, client_id, client_site_id, overall_status, is_apto
        )
        VALUES (
            v_assign.empresa_id, v_assign.worker_id, v_assign.client_id, v_client_site_id, 'pending', false
        )
        ON CONFLICT (empresa_id, worker_id, client_id, client_site_id) 
        DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_compliance_status_id;

        -- For each required doc, insert/update in worker_compliance_documents
        FOREACH v_doc_type IN ARRAY v_required_docs LOOP
            -- Check if worker already has a document of this type
            SELECT id INTO v_worker_doc_id
            FROM core_personal.worker_documents
            WHERE worker_id = v_assign.worker_id 
              AND doc_type = v_doc_type
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_worker_doc_id IS NOT NULL THEN
                v_doc_status := 'uploaded';
            ELSE
                v_doc_status := 'missing';
            END IF;

            INSERT INTO core_personal.worker_compliance_documents (
                empresa_id, compliance_status_id, doc_type, worker_document_id, status
            )
            VALUES (
                v_assign.empresa_id, v_compliance_status_id, v_doc_type, v_worker_doc_id, v_doc_status
            )
            ON CONFLICT (compliance_status_id, doc_type)
            DO UPDATE SET 
                worker_document_id = COALESCE(worker_compliance_documents.worker_document_id, EXCLUDED.worker_document_id),
                status = CASE 
                    WHEN worker_compliance_documents.worker_document_id IS NOT NULL THEN worker_compliance_documents.status 
                    ELSE EXCLUDED.status 
                END,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END;
$$;

-- 8. Backfill signed contracts into worker_documents
DO $$
DECLARE
    v_contract RECORD;
    v_worker_name TEXT;
    v_doc_id UUID;
    v_file_path TEXT;
    v_mime_type TEXT;
BEGIN
    FOR v_contract IN 
        SELECT id, empresa_id, worker_id, signed_document_url, document_url, status
        FROM core_personal.contracts
        WHERE status = 'signed'
    LOOP
        v_file_path := COALESCE(v_contract.signed_document_url, v_contract.document_url);
        
        IF v_file_path IS NOT NULL THEN
            -- Fetch worker's name
            SELECT nome INTO v_worker_name FROM core_personal.workers WHERE id = v_contract.worker_id;
            
            -- Detect mime type
            IF v_file_path LIKE '%.pdf' THEN
                v_mime_type := 'application/pdf';
            ELSE
                v_mime_type := 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            END IF;

            -- Check if already exists in worker_documents to avoid duplication
            SELECT id INTO v_doc_id
            FROM core_personal.worker_documents
            WHERE worker_id = v_contract.worker_id 
              AND doc_type = 'contrato_trabalho'
              AND file_path = v_file_path
            LIMIT 1;

            IF v_doc_id IS NULL THEN
                INSERT INTO core_personal.worker_documents (
                    empresa_id, worker_id, doc_type, file_path, file_name, file_size, mime_type
                )
                VALUES (
                    v_contract.empresa_id,
                    v_contract.worker_id,
                    'contrato_trabalho',
                    v_file_path,
                    'Contrato de Trabalho - ' || COALESCE(v_worker_name, 'Trabalhador') || CASE WHEN v_file_path LIKE '%.pdf' THEN '.pdf' ELSE '.docx' END,
                    0,
                    v_mime_type
                )
                RETURNING id INTO v_doc_id;
            END IF;

            -- Link to any existing compliance checklist
            UPDATE core_personal.worker_compliance_documents wcd
            SET worker_document_id = v_doc_id,
                status = 'uploaded',
                updated_at = NOW()
            FROM core_personal.worker_compliance_status wcs
            WHERE wcs.id = wcd.compliance_status_id
              AND wcs.worker_id = v_contract.worker_id
              AND wcd.doc_type = 'contrato_trabalho'
              AND wcd.status != 'approved';
        END IF;
    END LOOP;
END;
$$;
