const { Client } = require('pg');
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function check() {
  const c = new Client({ connectionString: prodConn });
  await c.connect();
  const res = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'core_comercial' AND table_name = 'marketing_templates';`);
  console.log("PROD marketing_templates columns:", res.rows);
  const data = await c.query('SELECT * FROM core_comercial.marketing_templates LIMIT 5;');
  console.log("PROD marketing_templates sample:", data.rows);
  await c.end();
}
check();
