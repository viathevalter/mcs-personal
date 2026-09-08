const { Client } = require('pg');
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function check() {
  const c = new Client({ connectionString: devConn });
  await c.connect();
  const res = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'core_comercial' AND table_name = 'marketing_templates';`);
  console.log("DEV marketing_templates columns:", res.rows);
  await c.end();
}
check();
