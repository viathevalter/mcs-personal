const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const resJobs = await client.query(`
      SELECT id, empresa_id, title, status, search_source, target_count, processed_count, found_emails_count 
      FROM core_comercial.lead_prospecting_jobs 
      ORDER BY created_at DESC;
    `);
    console.log('Current Jobs in PROD:', resJobs.rows);

    const resEmpresas = await client.query(`
      SELECT id, nome, razao_social FROM core_common.empresas LIMIT 5;
    `);
    console.log('Empresas in PROD:', resEmpresas.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
