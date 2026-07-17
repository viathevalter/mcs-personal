const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function list(connectionString, label) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, name, public 
      FROM storage.buckets
    `);
    console.log(`=== Buckets in ${label} ===`);
    for (const row of res.rows) {
      console.log(`- ID: ${row.id}, Name: ${row.name}, Public: ${row.public}`);
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await list(devConnectionString, 'DEV');
  await list(prodConnectionString, 'PRODUCTION');
}

run();
