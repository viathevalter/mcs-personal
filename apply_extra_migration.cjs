const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to DEV database");

    await client.query(`
      ALTER TABLE core_common.client_company_settings 
      ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0;
      
      ALTER TABLE core_common.clients 
      DROP COLUMN IF EXISTS credit_limit,
      DROP COLUMN IF EXISTS current_debt;
    `);
    console.log("Extra migration applied successfully!");

  } catch (e) {
    console.error("Extra migration FAILED:", e.message);
  } finally {
    await client.end();
  }
}

run();
