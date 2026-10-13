const { Client } = require('pg');

const databases = [
  {
    name: 'PROD',
    connectionString: 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'DEV',
    connectionString: 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
  }
];

const sql = `
-- 1. Tabela cartoes_corporativos
CREATE TABLE IF NOT EXISTS public.cartoes_corporativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_cartao TEXT NOT NULL,
    empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
    banco_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
    ultimos_digitos TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cartoes_corporativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em cartoes_corporativos para autenticados" ON public.cartoes_corporativos;
CREATE POLICY "Permitir tudo em cartoes_corporativos para autenticados"
    ON public.cartoes_corporativos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir select anonimo em cartoes_corporativos" ON public.cartoes_corporativos;
CREATE POLICY "Permitir select anonimo em cartoes_corporativos"
    ON public.cartoes_corporativos
    FOR SELECT
    TO anon
    USING (true);

-- 2. Colunas em caixas_despesas para suporte a cartões e fechamento
ALTER TABLE public.caixas_despesas 
    ADD COLUMN IF NOT EXISTS tipo_fundo TEXT DEFAULT 'dinheiro',
    ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes_corporativos(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conta_pagar_id BIGINT REFERENCES public.contas_pagar(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fechado_por TEXT,
    ADD COLUMN IF NOT EXISTS centro_custo TEXT,
    ADD COLUMN IF NOT EXISTS cat_despesa TEXT;
`;

async function applyMigrations() {
  for (const db of databases) {
    console.log(`\n--- Aplicando migration em ${db.name} ---`);
    const client = new Client({
      connectionString: db.connectionString,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      await client.query(sql);
      console.log(`✓ Sucesso ao aplicar migration em ${db.name}`);
    } catch (err) {
      console.error(`✗ Erro ao aplicar em ${db.name}:`, err);
    } finally {
      await client.end();
    }
  }
}

applyMigrations().catch(console.error);
