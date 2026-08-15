const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function activateMissions(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    // Reset all 12 strategic missions to pending and 0 count
    const res = await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET status = 'pending', processed_count = 0, found_emails_count = 0, updated_at = NOW()
      WHERE title LIKE '%🚢%' OR title LIKE '%🏗️%' OR title LIKE '%⚙️%' OR title LIKE '%🏭%' OR title LIKE '%🧪%' OR title LIKE '%🏢%';
    `);
    console.log(`[${envName}] Resetadas e ativadas ${res.rowCount} missões estratégicas para PENDING!`);

    // Set 1st mission to processing
    await client.query(`
      WITH first_m AS (
        SELECT id FROM core_comercial.lead_prospecting_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at DESC LIMIT 1
      )
      UPDATE core_comercial.lead_prospecting_jobs
      SET status = 'processing', updated_at = NOW()
      WHERE id IN (SELECT id FROM first_m);
    `);
    console.log(`[${envName}] 1ª Missão de 5.000 leads colocada em PROCESSING!`);

    const resPending = await client.query(`
      SELECT id, title, status, target_count, found_emails_count
      FROM core_comercial.lead_prospecting_jobs
      WHERE status IN ('processing', 'pending')
      ORDER BY created_at DESC;
    `);
    console.table(resPending.rows);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await activateMissions(devConnectionString, 'DEV');
  await activateMissions(prodConnectionString, 'PROD');
}

run();
