-- ==============================================================================
-- MIGRATION: Módulo de Controle Patrimonial & Gestão de Ativos (Schema Public)
-- Tabelas criadas no schema public para acesso direto via API PostgREST do Supabase
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE ATIVOS (PATRIMÔNIO)
CREATE TABLE IF NOT EXISTS public.patrimonio_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    
    -- Identificação
    codigo_patrimonial VARCHAR(50) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    descricao TEXT NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(150),
    imei VARCHAR(100), -- Para celulares
    matricula VARCHAR(50), -- Para veículos
    cor VARCHAR(50),
    empresa_proprietaria VARCHAR(150) DEFAULT 'KR Industrial',
    centro_custo VARCHAR(100),
    localizacao VARCHAR(150) DEFAULT 'Armazém Central',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel',
    
    -- Informações de Aquisição
    data_compra DATE,
    fornecedor VARCHAR(200),
    numero_fatura VARCHAR(100),
    valor_aquisicao NUMERIC(12, 2) DEFAULT 0.00,
    moeda VARCHAR(10) DEFAULT 'EUR',
    garantia_meses INT DEFAULT 0,
    data_fim_garantia DATE,
    anexo_fatura_url TEXT,
    observacoes_aquisicao TEXT,
    
    -- Identificação Visual
    foto_principal_url TEXT,
    fotos JSONB DEFAULT '[]'::jsonb,
    
    -- Responsável Atual (Custódia)
    worker_id UUID REFERENCES core_personal.workers(id) ON DELETE SET NULL,
    responsavel_nome VARCHAR(255),
    responsavel_documento VARCHAR(50),
    coordenador_nome VARCHAR(255),
    data_entrega TIMESTAMPTZ,
    local_entrega VARCHAR(150),
    projeto VARCHAR(150),
    previsao_devolucao DATE,
    acessorios_entregues TEXT,
    observacoes_entrega TEXT,
    
    -- Metadados
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE UNIQUE INDEX IF NOT EXISTS idx_patrimonio_codigo_unique ON public.patrimonio_ativos(codigo_patrimonial);
CREATE INDEX IF NOT EXISTS idx_patrimonio_categoria ON public.patrimonio_ativos(categoria);
CREATE INDEX IF NOT EXISTS idx_patrimonio_status ON public.patrimonio_ativos(status);
CREATE INDEX IF NOT EXISTS idx_patrimonio_worker_id ON public.patrimonio_ativos(worker_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_projeto ON public.patrimonio_ativos(projeto);
CREATE INDEX IF NOT EXISTS idx_patrimonio_numero_serie ON public.patrimonio_ativos(numero_serie);

-- 2. TABELA DE HISTÓRICO / TIMELINE (RASTREABILIDADE COMPLETA)
CREATE TABLE IF NOT EXISTS public.patrimonio_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES public.patrimonio_ativos(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL, 
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    worker_id UUID REFERENCES core_personal.workers(id) ON DELETE SET NULL,
    worker_nome VARCHAR(255),
    projeto VARCHAR(150),
    localizacao VARCHAR(150),
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    registrado_por_nome VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_historico_ativo_id ON public.patrimonio_historico(ativo_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_historico_created_at ON public.patrimonio_historico(created_at DESC);

-- 3. TABELA DE DOCUMENTOS E ANEXOS
CREATE TABLE IF NOT EXISTS public.patrimonio_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES public.patrimonio_ativos(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    arquivo_url TEXT NOT NULL,
    arquivo_nome VARCHAR(255),
    tamanho_bytes BIGINT,
    mime_type VARCHAR(100),
    status_assinatura VARCHAR(50) DEFAULT 'nao_aplicavel',
    assinado_em TIMESTAMPTZ,
    assinado_por VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_documentos_ativo_id ON public.patrimonio_documentos(ativo_id);

-- 4. TABELA DE MANUTENÇÕES DO ATIVO
CREATE TABLE IF NOT EXISTS public.patrimonio_manutencoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES public.patrimonio_ativos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'corretiva',
    motivo VARCHAR(255) NOT NULL,
    descricao_problema TEXT,
    fornecedor_oficina VARCHAR(255),
    custo NUMERIC(10, 2) DEFAULT 0.00,
    data_envio DATE NOT NULL DEFAULT CURRENT_DATE,
    previsao_retorno DATE,
    data_retorno DATE,
    solucao_aplicada TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'em_andamento',
    anexo_nf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_manutencoes_ativo_id ON public.patrimonio_manutencoes(ativo_id);

-- 5. FUNÇÃO PARA GERAR PRÓXIMO CÓDIGO PATRIMONIAL SEQUENCIAL AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.gerar_proximo_codigo_patrimonio(p_prefixo VARCHAR DEFAULT 'PAT')
RETURNS TEXT AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_ultimo_numero INT;
    v_proximo_codigo TEXT;
BEGIN
    v_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefixo), ''), 'PAT'));
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN codigo_patrimonial ~ ('^' || v_prefix || '-[0-9]+$') 
            THEN SUBSTRING(codigo_patrimonial FROM ('^' || v_prefix || '-([0-9]+)$'))::INT
            ELSE 0
        END
    ), 0) INTO v_ultimo_numero
    FROM public.patrimonio_ativos
    WHERE codigo_patrimonial LIKE (v_prefix || '-%');
    
    v_proximo_codigo := v_prefix || '-' || LPAD((v_ultimo_numero + 1)::TEXT, 6, '0');
    RETURN v_proximo_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. BUCKET DE ARMAZENAMENTO PARA FOTOS E DOCUMENTOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patrimonio', 'patrimonio', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Leitura pública de arquivos de patrimônio'
    ) THEN
        CREATE POLICY "Leitura pública de arquivos de patrimônio"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'patrimonio');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários autenticados podem enviar arquivos de patrimônio'
    ) THEN
        CREATE POLICY "Usuários autenticados podem enviar arquivos de patrimônio"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'patrimonio');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários autenticados podem atualizar arquivos de patrimônio'
    ) THEN
        CREATE POLICY "Usuários autenticados podem atualizar arquivos de patrimônio"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'patrimonio');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários autenticados podem deletar arquivos de patrimônio'
    ) THEN
        CREATE POLICY "Usuários autenticados podem deletar arquivos de patrimônio"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'patrimonio');
    END IF;
END $$;

-- 7. RLS E PERMISSÕES NAS TABELAS
ALTER TABLE public.patrimonio_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimonio_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimonio_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimonio_manutencoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura de ativos para autenticados') THEN
        CREATE POLICY "Permitir leitura de ativos para autenticados" 
        ON public.patrimonio_ativos FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir gravação de ativos para autenticados') THEN
        CREATE POLICY "Permitir gravação de ativos para autenticados" 
        ON public.patrimonio_ativos FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura de histórico para autenticados') THEN
        CREATE POLICY "Permitir leitura de histórico para autenticados" 
        ON public.patrimonio_historico FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir gravação de histórico para autenticados') THEN
        CREATE POLICY "Permitir gravação de histórico para autenticados" 
        ON public.patrimonio_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura de documentos para autenticados') THEN
        CREATE POLICY "Permitir leitura de documentos para autenticados" 
        ON public.patrimonio_documentos FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir gravação de documentos para autenticados') THEN
        CREATE POLICY "Permitir gravação de documentos para autenticados" 
        ON public.patrimonio_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura de manutenções para autenticados') THEN
        CREATE POLICY "Permitir leitura de manutenções para autenticados" 
        ON public.patrimonio_manutencoes FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir gravação de manutenções para autenticados') THEN
        CREATE POLICY "Permitir gravação de manutenções para autenticados" 
        ON public.patrimonio_manutencoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Permissões gerais
GRANT ALL ON TABLE public.patrimonio_ativos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.patrimonio_historico TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.patrimonio_documentos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.patrimonio_manutencoes TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gerar_proximo_codigo_patrimonio(VARCHAR) TO anon, authenticated, service_role;
