const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ddl = `
CREATE TABLE IF NOT EXISTS public.cobranca_simulacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo_id text NOT NULL,
    cod_cliente text NOT NULL,
    cliente_nome text NOT NULL,
    original_ids jsonb NOT NULL,
    original_total numeric NOT NULL,
    desconto_percentual numeric DEFAULT 0,
    desconto_valor numeric DEFAULT 0,
    valor_acordado numeric NOT NULL,
    tipo_pagamento text NOT NULL,
    parcelas_qtd integer DEFAULT 1,
    vencimento_parcelas jsonb NOT NULL,
    classificacao text DEFAULT 'friendly',
    status text DEFAULT 'Pendente',
    creado_por text,
    creado_em timestamptz DEFAULT now(),
    modificado_em timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cobranca_simulacoes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Allow public select on cobranca_simulacoes" ON public.cobranca_simulacoes;
DROP POLICY IF EXISTS "Allow public insert on cobranca_simulacoes" ON public.cobranca_simulacoes;
DROP POLICY IF EXISTS "Allow public update on cobranca_simulacoes" ON public.cobranca_simulacoes;
DROP POLICY IF EXISTS "Allow public delete on cobranca_simulacoes" ON public.cobranca_simulacoes;

-- Create public policies
CREATE POLICY "Allow public select on cobranca_simulacoes" ON public.cobranca_simulacoes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on cobranca_simulacoes" ON public.cobranca_simulacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on cobranca_simulacoes" ON public.cobranca_simulacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on cobranca_simulacoes" ON public.cobranca_simulacoes FOR DELETE USING (true);
`;

async function migrate(connectionString, label) {
  console.log(`Starting migration on ${label}...`);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(ddl);
    console.log(`Migration on ${label} completed successfully!`);
  } catch (err) {
    console.error(`Migration on ${label} failed:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await migrate(devConnectionString, 'DEV DATABASE');
  await migrate(prodConnectionString, 'PROD DATABASE');
}

run();
