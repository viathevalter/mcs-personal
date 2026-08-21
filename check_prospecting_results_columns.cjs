const { Client } = require('pg');
const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkColumns() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_comercial' AND table_name = 'lead_prospecting_results'
      ORDER BY ordinal_position ASC;
    `);
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

checkColumns();
