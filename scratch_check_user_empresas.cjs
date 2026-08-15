const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    console.log('=== TODAS AS EMPRESAS REGISTRADAS ===');
    const resEmp = await client.query(`SELECT id, nome FROM core_common.empresas;`);
    console.table(resEmp.rows);

    console.log('\n=== JOBS POR EMPRESA ===');
    const resJobs = await client.query(`
      SELECT e.id as empresa_id, e.nome as empresa_nome, COUNT(j.id) as total_jobs
      FROM core_common.empresas e
      LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.empresa_id = e.id
      GROUP BY e.id, e.nome;
    `);
    console.table(resJobs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
