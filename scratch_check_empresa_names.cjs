const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    console.log('=== EMPRESAS NO BANCO DE DADOS EM PROD ===');
    const resEmp = await client.query(`
      SELECT id, nome
      FROM core_common.empresas;
    `);
    console.table(resEmp.rows);

    console.log('\n=== CONTAGEM DE MISSÕES POR NOME DE EMPRESA ===');
    const resJobs = await client.query(`
      SELECT e.id as empresa_id, e.nome as empresa_nome, j.status, COUNT(j.id) as total_jobs
      FROM core_common.empresas e
      JOIN core_comercial.lead_prospecting_jobs j ON j.empresa_id = e.id
      GROUP BY e.id, e.nome, j.status
      ORDER BY e.nome, j.status;
    `);
    console.table(resJobs.rows);

    console.log('\n=== LISTA DE MISSÕES ATIVAS DA EMPRESA QUE TEM AS 12 NOVAS ===');
    const resActive = await client.query(`
      SELECT j.id, e.nome as empresa_nome, j.title, j.status, j.found_emails_count, j.created_at
      FROM core_comercial.lead_prospecting_jobs j
      JOIN core_common.empresas e ON j.empresa_id = e.id
      WHERE j.title LIKE '%🚢%' OR j.title LIKE '%🏗️%' OR j.title LIKE '%⚙️%' OR j.title LIKE '%🏭%' OR j.title LIKE '%🧪%' OR j.title LIKE '%🏢%'
      ORDER BY j.created_at DESC;
    `);
    console.table(resActive.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
