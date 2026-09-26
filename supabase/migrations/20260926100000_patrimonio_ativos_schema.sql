-- ==============================================================================
-- MIGRATION: Módulo de Controle Patrimonial & Gestão de Ativos
-- Criação do schema core_patrimonio, tabelas, histórico, documentos e automações
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS core_patrimonio;

-- 1. TABELA PRINCIPAL DE ATIVOS (PATRIMÔNIO)
CREATE TABLE IF NOT EXISTS core_patrimonio.ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES core_common.empresas(id) ON DELETE SET NULL,
    
    -- Identificação
    codigo_patrimonial VARCHAR(50) NOT NULL,
    categoria VARCHAR(100) NOT NULL, -- Informática, Celular, Veículo, Ferramenta Elétrica, Oficina, etc.
    subcategoria VARCHAR(100),
    descricao TEXT NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(150),
    imei VARCHAR(100), -- Para celulares
    matricula VARCHAR(50), -- Para veículos
    cor VARCHAR(50),
    empresa_proprietaria VARCHAR(150) DEFAULT 'MCS Industrial',
    centro_custo VARCHAR(100),
    localizacao VARCHAR(150) DEFAULT 'Armazém Central',
    
    -- Status
    -- disponivel, reservado, em_uso, em_transito, em_manutencao, aguardando_manutencao, danificado, perdido, roubado, baixado, vendido, descartado
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
    fotos JSONB DEFAULT '[]'::jsonb, -- Array de { id, tipo: 'frontal'|'traseira'|'serial'|'estado'|'acessorios'|'outro', url, legenda }
    
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_patrimonio_codigo_unique ON core_patrimonio.ativos(codigo_patrimonial);
CREATE INDEX IF NOT EXISTS idx_patrimonio_empresa_id ON core_patrimonio.ativos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_categoria ON core_patrimonio.ativos(categoria);
CREATE INDEX IF NOT EXISTS idx_patrimonio_status ON core_patrimonio.ativos(status);
CREATE INDEX IF NOT EXISTS idx_patrimonio_worker_id ON core_patrimonio.ativos(worker_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_projeto ON core_patrimonio.ativos(projeto);
CREATE INDEX IF NOT EXISTS idx_patrimonio_numero_serie ON core_patrimonio.ativos(numero_serie);

-- 2. TABELA DE HISTÓRICO / TIMELINE (RASTREABILIDADE COMPLETA)
CREATE TABLE IF NOT EXISTS core_patrimonio.historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES core_patrimonio.ativos(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL, 
    -- aquisicao, entrada_armazem, entrega, devolucao, transferencia_projeto, envio_manutencao, retorno_manutencao, status_alterado, inventario, observacao, baixa
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

CREATE INDEX IF NOT EXISTS idx_patrimonio_historico_ativo_id ON core_patrimonio.historico(ativo_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_historico_created_at ON core_patrimonio.historico(created_at DESC);

-- 3. TABELA DE DOCUMENTOS E ANEXOS
CREATE TABLE IF NOT EXISTS core_patrimonio.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES core_patrimonio.ativos(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,
    -- fatura, garantia, manual, certificado, termo_responsabilidade, termo_devolucao, manutencao, seguro, outro
    titulo VARCHAR(255) NOT NULL,
    arquivo_url TEXT NOT NULL,
    arquivo_nome VARCHAR(255),
    tamanho_bytes BIGINT,
    mime_type VARCHAR(100),
    status_assinatura VARCHAR(50) DEFAULT 'nao_aplicavel', -- pendente, assinado, nao_aplicavel
    assinado_em TIMESTAMPTZ,
    assinado_por VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_documentos_ativo_id ON core_patrimonio.documentos(ativo_id);

-- 4. TABELA DE MANUTENÇÕES DO ATIVO
CREATE TABLE IF NOT EXISTS core_patrimonio.manutencoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id UUID NOT NULL REFERENCES core_patrimonio.ativos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'corretiva', -- preventiva, corretiva, calibracao, revisao
    motivo VARCHAR(255) NOT NULL,
    descricao_problema TEXT,
    fornecedor_oficina VARCHAR(255),
    custo NUMERIC(10, 2) DEFAULT 0.00,
    data_envio DATE NOT NULL DEFAULT CURRENT_DATE,
    previsao_retorno DATE,
    data_retorno DATE,
    solucao_aplicada TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'em_andamento', -- aguardando_orcamento, em_andamento, concluida, cancelada
    anexo_nf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_manutencoes_ativo_id ON core_patrimonio.manutencoes(ativo_id);

-- 5. FUNÇÃO PARA GERAR PRÓXIMO CÓDIGO PATRIMONIAL SEQUENCIAL AUTOMÁTICO
CREATE OR REPLACE FUNCTION core_patrimonio.gerar_proximo_codigo(p_prefixo VARCHAR DEFAULT 'PAT')
RETURNS TEXT AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_ultimo_numero INT;
    v_proximo_codigo TEXT;
BEGIN
    v_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefixo), ''), 'PAT'));
    
    -- Busca o maior número já existente com o prefixo
    SELECT COALESCE(MAX(
        CASE 
            WHEN codigo_patrimonial ~ ('^' || v_prefix || '-[0-9]+$') 
            THEN SUBSTRING(codigo_patrimonial FROM ('^' || v_prefix || '-([0-9]+)$'))::INT
            ELSE 0
        END
    ), 0) INTO v_ultimo_numero
    FROM core_patrimonio.ativos
    WHERE codigo_patrimonial LIKE (v_prefix || '-%');
    
    v_proximo_codigo := v_prefix || '-' || LPAD((v_ultimo_numero + 1)::TEXT, 6, '0');
    RETURN v_proximo_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. BUCKET DE ARMAZENAMENTO PARA FOTOS E DOCUMENTOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patrimonio', 'patrimonio', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o bucket 'patrimonio'
CREATE POLICY "Leitura pública de arquivos de patrimônio"
ON storage.objects FOR SELECT
USING (bucket_id = 'patrimonio');

CREATE POLICY "Usuários autenticados podem enviar arquivos de patrimônio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patrimonio');

CREATE POLICY "Usuários autenticados podem atualizar arquivos de patrimônio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'patrimonio');

CREATE POLICY "Usuários autenticados podem deletar arquivos de patrimônio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patrimonio');

-- 7. RLS E PERMISSÕES NAS TABELAS
ALTER TABLE core_patrimonio.ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_patrimonio.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_patrimonio.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_patrimonio.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de ativos para autenticados" 
ON core_patrimonio.ativos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de ativos para autenticados" 
ON core_patrimonio.ativos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de histórico para autenticados" 
ON core_patrimonio.historico FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de histórico para autenticados" 
ON core_patrimonio.historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de documentos para autenticados" 
ON core_patrimonio.documentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de documentos para autenticados" 
ON core_patrimonio.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de manutenções para autenticados" 
ON core_patrimonio.manutencoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de manutenções para autenticados" 
ON core_patrimonio.manutencoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões gerais para roles do Supabase
GRANT USAGE ON SCHEMA core_patrimonio TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA core_patrimonio TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_patrimonio TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA core_patrimonio TO anon, authenticated, service_role;
