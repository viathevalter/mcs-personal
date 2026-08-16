const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ddl = `
CREATE TABLE IF NOT EXISTS core_comercial.empresas_espanha_cnae (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    cif VARCHAR(50),
    razao_social VARCHAR(255) NOT NULL,
    nome_comercial VARCHAR(255),
    cnae_codigo VARCHAR(20) NOT NULL,
    cnae_descricao VARCHAR(255),
    setor VARCHAR(100),
    provincia VARCHAR(100),
    municipio VARCHAR(100),
    endereco TEXT,
    codigo_postal VARCHAR(20),
    -- Dados de enriquecimento
    website VARCHAR(255),
    email VARCHAR(255),
    email_status VARCHAR(50) DEFAULT 'pendente', -- pendente, verificado_mx, sem_email, invalido
    telefone VARCHAR(100),
    linkedin_url VARCHAR(255),
    status_enriquecimento VARCHAR(50) DEFAULT 'pendente', -- pendente, enriquecido, sem_dados, erro
    data_enriquecimento TIMESTAMPTZ,
    log_enriquecimento TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresas_es_cnae ON core_comercial.empresas_espanha_cnae (cnae_codigo);
CREATE INDEX IF NOT EXISTS idx_empresas_es_provincia ON core_comercial.empresas_espanha_cnae (provincia);
CREATE INDEX IF NOT EXISTS idx_empresas_es_status ON core_comercial.empresas_espanha_cnae (status_enriquecimento);
CREATE INDEX IF NOT EXISTS idx_empresas_es_email_status ON core_comercial.empresas_espanha_cnae (email_status);
`;

async function applyDdl(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();
  console.log('Applying DDL in ' + dbName + '...');
  await client.query(ddl);
  console.log('✅ Table core_comercial.empresas_espanha_cnae created successfully in ' + dbName);
  await client.end();
}

async function run() {
  await applyDdl('DEV', devConnectionString);
  await applyDdl('PROD', prodConnectionString);
}
run();
