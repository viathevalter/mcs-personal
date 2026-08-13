const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function cleanResults(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    const delRes = await client.query(`
      DELETE FROM core_comercial.lead_prospecting_results
      WHERE email IS NULL OR TRIM(email) = '';
    `);
    console.log(`[${envName}] Excluídos ${delRes.rowCount} registros em Staging que não possuíam e-mail corporativo.`);

    // Recalculate processed_count and found_emails_count for all jobs
    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs j
      SET 
        processed_count = COALESCE((SELECT COUNT(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id), 0),
        found_emails_count = COALESCE((SELECT COUNT(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id AND r.email IS NOT NULL), 0),
        updated_at = NOW();
    `);
    console.log(`[${envName}] Contadores de missões recalculados.`);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`[${envName}] Erro ao limpar resultados sem e-mail:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await cleanResults(devConnectionString, 'DEV');
  await cleanResults(prodConnectionString, 'PROD');
}

run();
