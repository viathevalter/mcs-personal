const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();
    console.log('Connected to PROD DB.');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260810095000_lead_prospecting_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Lead Prospecting migration applied successfully to PROD DB!');
  } catch (err) {
    console.error('PROD Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
