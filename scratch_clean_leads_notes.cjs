const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanNotes(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  console.log(`\n================ [${dbName}] Cleaning Observations and AI Mentions ================`);

  // 1. Clear notes completely
  const resNotes = await client.query('UPDATE core_comercial.leads SET notes = NULL;');
  console.log(`[${dbName}] Notes cleared in ${resNotes.rowCount} leads!`);

  // 2. Clean and standardize origen_lead without AI mentions
  await client.query("UPDATE core_comercial.leads SET origen_lead = 'Prospecção Comercial' WHERE origen_lead ILIKE '%AIsa%' OR origen_lead ILIKE '%AI%';");
  console.log(`[${dbName}] Origem standardized to 'Prospecção Comercial'!`);

  // 3. Clean tags without AI mentions
  await client.query("UPDATE core_comercial.leads SET tags = ARRAY['Espanha', 'Prospecção Ativa'] WHERE tags IS NOT NULL;");
  console.log(`[${dbName}] Tags cleaned and standardized!`);

  await client.end();
}

async function run() {
  await cleanNotes('DEV', devConnectionString);
  await cleanNotes('PROD', prodConnectionString);
}

run();
