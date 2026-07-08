-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS core_logistics;

-- Criar enums com bloco DO para evitar erros se já existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alojamento_status') THEN
        CREATE TYPE core_logistics.alojamento_status AS ENUM ('ativo', 'inativo');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cama_status') THEN
        CREATE TYPE core_logistics.cama_status AS ENUM ('livre', 'ocupada', 'manutencao');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alocacao_status') THEN
        CREATE TYPE core_logistics.alocacao_status AS ENUM ('reservada', 'checkin_feito', 'checkout_feito', 'cancelada');
    END IF;
END $$;

-- Tabela: alojamentos
CREATE TABLE IF NOT EXISTS core_logistics.alojamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT,
    custo_mensal_total NUMERIC(10, 2) DEFAULT 0,
    capacidade_total INT DEFAULT 0,
    status core_logistics.alojamento_status DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: camas
CREATE TABLE IF NOT EXISTS core_logistics.camas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alojamento_id UUID NOT NULL REFERENCES core_logistics.alojamentos(id) ON DELETE CASCADE,
    identificador TEXT NOT NULL,
    status core_logistics.cama_status DEFAULT 'livre',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: alocacoes
-- Nota: worker_id faz referência a core_personal.workers (fks cross-schema no mesmo DB)
CREATE TABLE IF NOT EXISTS core_logistics.alocacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cama_id UUID NOT NULL REFERENCES core_logistics.camas(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL,
    project_name TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status core_logistics.alocacao_status DEFAULT 'reservada',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE core_logistics.alojamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.camas ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistics.alocacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Básicas (authenticated pode ler e escrever)
DO $$
BEGIN
    -- alojamentos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'core_logistics' AND tablename = 'alojamentos' AND policyname = 'Allow authenticated full access to alojamentos'
    ) THEN
        CREATE POLICY "Allow authenticated full access to alojamentos" ON core_logistics.alojamentos
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- camas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'core_logistics' AND tablename = 'camas' AND policyname = 'Allow authenticated full access to camas'
    ) THEN
        CREATE POLICY "Allow authenticated full access to camas" ON core_logistics.camas
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- alocacoes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'core_logistics' AND tablename = 'alocacoes' AND policyname = 'Allow authenticated full access to alocacoes'
    ) THEN
        CREATE POLICY "Allow authenticated full access to alocacoes" ON core_logistics.alocacoes
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
