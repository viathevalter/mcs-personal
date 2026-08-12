const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    // 1. Search for client INSTALACIONES Y SISTEMAS HIDRAULICOS S.L
    const clientRes = await client.query(`
      SELECT id, name, legal_name, code, status 
      FROM core_comercial.clients 
      WHERE name ILIKE '%INSTALACIONES%' OR legal_name ILIKE '%INSTALACIONES%' OR code LIKE '%108%' OR code LIKE '%280%';
    `);
    console.log('Client Search Result:', clientRes.rows);

    // List tables in schemas
    const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('core_comercial', 'core_operacoes', 'core_faturamento', 'core_rh', 'public')
      ORDER BY table_schema, table_name;
    `);
    console.log('\nAvailable Tables:', tablesRes.rows.map(t => `${t.table_schema}.${t.table_name}`));

    if (clientRes.rows.length > 0) {
      const targetClientId = clientRes.rows[0].id;
      console.log(`\nInspecting hours & workers for client ${targetClientId}...`);

      // Check worker_hours / hours tables if they exist
      const hoursCount = await client.query(`
        SELECT count(*) FROM information_schema.tables WHERE table_name = 'worker_hours' OR table_name = 'hours_records';
      `);
      console.log('Hours tables found:', hoursCount.rows);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
