-- ========================================================================================
-- Migration: 20261028200000_termos_responsabilidade_alojamento.sql
-- Description: Cria a tabela de Termos de Responsabilidade e Check-list de Alojamento (Logística)
--              e função RPC para arquivamento automático no prontuário do trabalhador.
-- ========================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core_logistics;

CREATE TABLE IF NOT EXISTS core_logistics.termos_responsabilidade_alojamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    codigo_termo TEXT NOT NULL,
    alocacao_id TEXT,
    alojamento_id UUID REFERENCES core_logistics.alojamentos(id) ON DELETE SET NULL,
    alojamento_codigo TEXT,
    alojamento_nome TEXT,
    alojamento_endereco TEXT,
    alojamento_cidade TEXT,
    alojamento_provincia TEXT,
    cama_identificador TEXT,
    suministros_info JSONB DEFAULT '{}'::jsonb,
    worker_id UUID,
    worker_codigo TEXT,
    worker_nome TEXT NOT NULL,
    worker_documento TEXT,
    worker_cargo TEXT,
    worker_movil TEXT,
    empresa_id UUID,
    empresa_contratante TEXT DEFAULT 'LUMINOUS',
    pedido_id UUID,
    pedido_codigo TEXT,
    cliente_nome TEXT,
    obra_nome TEXT,
    data_emissao DATE DEFAULT CURRENT_DATE,
    data_checkin DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, ENVIADO, ASSINADO, COM_INCIDENCIAS
    checklist_respostas JSONB DEFAULT '{}'::jsonb,
    quantidade_mandos TEXT DEFAULT '0',
    quantidade_llaves TEXT DEFAULT '1 juego',
    observacoes_gerais TEXT,
    fotos_gerais JSONB DEFAULT '[]'::jsonb,
    tem_avarias BOOLEAN DEFAULT FALSE,
    total_fotos INTEGER DEFAULT 0,
    aceite_termos BOOLEAN DEFAULT FALSE,
    empresa_representante_nome TEXT DEFAULT 'Coordinación de Logística & Operaciones',
    empresa_assinatura_url TEXT,
    worker_assinatura_url TEXT,
    assinado_em TIMESTAMPTZ,
    assinatura_ip TEXT,
    assinatura_user_agent TEXT,
    pdf_url TEXT,
    worker_document_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_termos_aloj_token ON core_logistics.termos_responsabilidade_alojamento(token);
CREATE INDEX IF NOT EXISTS idx_termos_aloj_worker ON core_logistics.termos_responsabilidade_alojamento(worker_id);
CREATE INDEX IF NOT EXISTS idx_termos_aloj_alojamento ON core_logistics.termos_responsabilidade_alojamento(alojamento_id);
CREATE INDEX IF NOT EXISTS idx_termos_aloj_alocacao ON core_logistics.termos_responsabilidade_alojamento(alocacao_id);

ALTER TABLE core_logistics.termos_responsabilidade_alojamento DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_logistics TO postgres, service_role, authenticated, anon;

-- Garantir bucket de armazenamento 'alojamentos' público para fotos de vistoria e termos assinados
INSERT INTO storage.buckets (id, name, public)
VALUES ('alojamentos', 'alojamentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read alojamentos storage" ON storage.objects;
CREATE POLICY "Public read alojamentos storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'alojamentos');

DROP POLICY IF EXISTS "Anon and Auth upload alojamentos storage" ON storage.objects;
CREATE POLICY "Anon and Auth upload alojamentos storage"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'alojamentos');

DROP POLICY IF EXISTS "Anon and Auth update alojamentos storage" ON storage.objects;
CREATE POLICY "Anon and Auth update alojamentos storage"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'alojamentos');

-- Função RPC SECURITY DEFINER para vincular automaticamente o PDF assinado ao prontuário do trabalhador (core_personal.worker_documents)
CREATE OR REPLACE FUNCTION public.arquivar_termo_alojamento_no_trabalhador(
    p_termo_id UUID,
    p_worker_id UUID,
    p_empresa_id UUID,
    p_file_path TEXT,
    p_file_name TEXT,
    p_file_size BIGINT DEFAULT 102400
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core_personal, core_logistics, core_common
AS $$
DECLARE
    v_empresa_id UUID;
    v_doc_id UUID;
BEGIN
    IF p_worker_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Resolver empresa_id caso não tenha sido informada
    v_empresa_id := p_empresa_id;
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id
        FROM core_personal.workers
        WHERE id = p_worker_id
        LIMIT 1;
    END IF;

    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id
        FROM core_common.empresas
        LIMIT 1;
    END IF;

    IF v_empresa_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Inserir no arquivo digital do trabalhador
    INSERT INTO core_personal.worker_documents (
        empresa_id,
        worker_id,
        doc_type,
        file_path,
        file_name,
        file_size,
        mime_type
    ) VALUES (
        v_empresa_id,
        p_worker_id,
        'termo_alojamento',
        p_file_path,
        p_file_name,
        COALESCE(p_file_size, 102400),
        'application/pdf'
    )
    RETURNING id INTO v_doc_id;

    -- Atualizar referência no termo de responsabilidade
    IF p_termo_id IS NOT NULL AND v_doc_id IS NOT NULL THEN
        UPDATE core_logistics.termos_responsabilidade_alojamento
        SET worker_document_id = v_doc_id,
            updated_at = NOW()
        WHERE id = p_termo_id;
    END IF;

    RETURN v_doc_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.arquivar_termo_alojamento_no_trabalhador(UUID, UUID, UUID, TEXT, TEXT, BIGINT) TO anon, authenticated, service_role, postgres;

COMMIT;
