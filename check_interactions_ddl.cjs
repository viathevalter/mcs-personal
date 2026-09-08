const { Client } = require('pg');
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function check() {
  const c = new Client({ connectionString: prodConn });
  await c.connect();
  const res = await c.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'core_comercial' AND table_name = 'lead_interactions'
    ORDER BY ordinal_position;
  `);
  console.log("PROD lead_interactions columns:", res.rows);
  await c.end();
}
check();
