const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function runOnDb(name, connStr, sql) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB.`);
    await client.query(sql);
    console.log(`Successfully applied storage RLS fix to ${name} DB!`);
  } catch (err) {
    console.error(`Error on ${name} DB:`, err);
  } finally {
    await client.end();
  }
}

async function main() {
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260813112500_fix_iban_storage_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await runOnDb('DEV', devConnectionString, sql);
  await runOnDb('PROD', prodConnectionString, sql);
}

main();
