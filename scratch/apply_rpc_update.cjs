const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function apply(name, connectionString, sql) {
  console.log(`Connecting to ${name} DB...`);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB. Executing query...`);
    await client.query(sql);
    console.log(`Successfully migrated ${name} DB.`);
  } catch (err) {
    console.error(`Error migrating ${name} DB:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260608180000_update_rpcs_for_document_language.sql');
  console.log("Reading SQL file from:", sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await apply('DEV', devConnectionString, sql);
  await apply('PROD', prodConnectionString, sql);
}

run();
