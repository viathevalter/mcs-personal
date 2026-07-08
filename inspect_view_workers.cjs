const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to DEV database");

    const res = await client.query(`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_schema = 'core_operacoes' AND table_name = 'workers'
    `);
    console.log("View definition of core_operacoes.workers:");
    console.log(res.rows[0]?.view_definition || "Not found");

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
