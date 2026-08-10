const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log('Connected to DB.');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260810095000_lead_prospecting_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Lead Prospecting migration applied successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
