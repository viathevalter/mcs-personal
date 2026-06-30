-- Criação do schema core_finance caso não exista
CREATE SCHEMA IF NOT EXISTS core_finance;

-- Criação de Tipos ENUM de forma segura (ignorando erro se já existir)
DO $$ BEGIN
    CREATE TYPE core_finance.status_pagamento AS ENUM ('rascunho', 'aguardando_aprovacao', 'aprovado', 'pago', 'rejeitado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core_finance.tipo_movimento AS ENUM ('credito', 'debito');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core_finance.acao_audit AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Tabela ordens_pagamento
CREATE TABLE IF NOT EXISTS core_finance.ordens_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    fornecedor_id UUID, -- Referência para core_common.empresas ou tabela de provedores
    valor NUMERIC(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status core_finance.status_pagamento NOT NULL DEFAULT 'rascunho',
    criador_id UUID NOT NULL REFERENCES auth.users(id),
    aprovador_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ck_maker_checker CHECK (criador_id != aprovador_id OR aprovador_id IS NULL)
);

-- 2. Tabela movimentos_financeiros
CREATE TABLE IF NOT EXISTS core_finance.movimentos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_pagamento_id UUID REFERENCES core_finance.ordens_pagamento(id) ON DELETE CASCADE,
    tipo core_finance.tipo_movimento NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    data_movimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela audit_logs
CREATE TABLE IF NOT EXISTS core_finance.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    usuario_id UUID REFERENCES auth.users(id),
    acao core_finance.acao_audit NOT NULL,
    valores_antigos JSONB,
    valores_novos JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger Function para popular audit_logs
CREATE OR REPLACE FUNCTION core_finance.fn_audit_ordens_pagamento()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    -- Capturar o ID do usuário da sessão atual (auth.uid()) do Supabase
    -- Se não estiver em um contexto autenticado, será NULL
    BEGIN
        v_usuario_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO core_finance.audit_logs (nome_tabela, registro_id, usuario_id, acao, valores_antigos, valores_novos)
        VALUES (TG_TABLE_NAME, OLD.id, v_usuario_id, 'DELETE', row_to_json(OLD)::jsonb, NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO core_finance.audit_logs (nome_tabela, registro_id, usuario_id, acao, valores_antigos, valores_novos)
        VALUES (TG_TABLE_NAME, NEW.id, v_usuario_id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO core_finance.audit_logs (nome_tabela, registro_id, usuario_id, acao, valores_antigos, valores_novos)
        VALUES (TG_TABLE_NAME, NEW.id, v_usuario_id, 'INSERT', NULL, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger em ordens_pagamento
DROP TRIGGER IF EXISTS trg_audit_ordens_pagamento ON core_finance.ordens_pagamento;
CREATE TRIGGER trg_audit_ordens_pagamento
AFTER INSERT OR UPDATE OR DELETE ON core_finance.ordens_pagamento
FOR EACH ROW EXECUTE FUNCTION core_finance.fn_audit_ordens_pagamento();

-- Permissões para a API (PostgREST) acessar o schema
GRANT USAGE ON SCHEMA core_finance TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA core_finance TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_finance TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA core_finance TO anon, authenticated;
