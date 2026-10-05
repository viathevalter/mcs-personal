const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ddl = `
-- 1. Add horas_totais to core_personal.worker_hours
ALTER TABLE core_personal.worker_hours 
ADD COLUMN IF NOT EXISTS horas_totais NUMERIC(10, 2) DEFAULT 0;

-- 2. Populate horas_totais for any existing records
UPDATE core_personal.worker_hours
SET horas_totais = COALESCE(total_horas_normais, 0) + COALESCE(total_horas_noturnas, 0)
WHERE horas_totais IS NULL OR horas_totais = 0;
`;

async function applyFix() {
  for (const [env, connStr] of [['DEV', devConnectionString], ['PROD', prodConnectionString]]) {
    console.log(`Connecting to ${env}...`);
    const client = new Client({ connectionString: connStr });
    try {
      await client.connect();
      console.log(`Connected to ${env}. Applying DDL...`);
      await client.query(ddl);
      console.log(`Successfully added horas_totais to core_personal.worker_hours on ${env}!`);
      
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'core_personal' AND table_name = 'worker_hours' AND column_name = 'horas_totais';
      `);
      console.log(`Verification on ${env}:`, res.rows);
    } catch (err) {
      console.error(`Error applying to ${env}:`, err);
    } finally {
      await client.end();
    }
  }
}

applyFix();
