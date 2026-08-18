const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function inspectStaging() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== TABLES IN core_comercial ===`);
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'core_comercial';
    `);
    console.table(tables.rows);

    const stagingCount = await client.query(`
      SELECT count(*) as total_staging 
      FROM core_comercial.lead_prospecting_results;
    `);
    console.table(stagingCount.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

inspectStaging();
