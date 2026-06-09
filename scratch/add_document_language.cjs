const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const query = `
  ALTER TABLE core_comercial.estimaciones 
  ADD COLUMN IF NOT EXISTS document_language VARCHAR(10) DEFAULT 'pt' 
  CHECK (document_language IN ('pt', 'es', 'en', 'it', 'fr'));
`;

async function apply(name, connectionString) {
  console.log(`Connecting to ${name} DB...`);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB. Executing query...`);
    await client.query(query);
    console.log(`Successfully migrated ${name} DB.`);
  } catch (err) {
    console.error(`Error migrating ${name} DB:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await apply('DEV', devConnectionString);
  await apply('PROD', prodConnectionString);
}

run();
