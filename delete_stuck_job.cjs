const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function deleteStuckJob(connString, envName) {
  const client = new Client({ connectionString: connString });
  await client.connect();
  try {
    const res = await client.query(`
      DELETE FROM core_comercial.lead_prospecting_jobs 
      WHERE id = '98a16177-03b8-4208-9acc-09ad55eb81d1' 
         OR title LIKE '%Calderería y Fabricación Metálica - Cataluña%';
    `);
    console.log(`[${envName}] Excluída a missão travada "Calderería y Fabricación Metálica - Cataluña": ${res.rowCount} linha(s).`);
    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`[${envName}] Erro ao excluir:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await deleteStuckJob(devConnectionString, 'DEV');
  await deleteStuckJob(prodConnectionString, 'PROD');
}

run();
