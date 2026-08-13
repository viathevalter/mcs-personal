const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function fixJobs(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    // Reset all processing/failed jobs to pending
    const res = await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET status = 'pending', updated_at = NOW()
      WHERE status IN ('processing', 'failed');
    `);
    console.log(`[${envName}] Resetados ${res.rowCount} jobs com status processing/failed para pending.`);

    // Set ONLY the very first job with 0 processed_count as processing
    await client.query(`
      WITH first_job AS (
        SELECT id FROM core_comercial.lead_prospecting_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at ASC LIMIT 1
      )
      UPDATE core_comercial.lead_prospecting_jobs
      SET status = 'processing', updated_at = NOW()
      WHERE id IN (SELECT id FROM first_job);
    `);
    console.log(`[${envName}] Apenas a 1ª missão foi definida como processing.`);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`[${envName}] Erro ao ajustar status:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await fixJobs(devConnectionString, 'DEV');
  await fixJobs(prodConnectionString, 'PROD');
}

run();
