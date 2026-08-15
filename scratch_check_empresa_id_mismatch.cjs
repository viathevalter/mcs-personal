const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    console.log('=== EMPRESAS NO BANCO DE DADOS ===');
    const resEmp = await client.query(`SELECT id, nome FROM core_common.empresas;`);
    console.table(resEmp.rows);

    console.log('\n=== DISTRIBUIÇÃO DE JOBS POR EMPRESA_ID ===');
    const resJobsByEmp = await client.query(`
      SELECT empresa_id, status, COUNT(*) as cnt
      FROM core_comercial.lead_prospecting_jobs
      GROUP BY empresa_id, status;
    `);
    console.table(resJobsByEmp.rows);

    console.log('\n=== ÚLTIMOS 15 JOBS EM PROD ===');
    const resJobs = await client.query(`
      SELECT id, title, empresa_id, status, target_count, found_emails_count, created_at
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at DESC
      LIMIT 15;
    `);
    console.table(resJobs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
