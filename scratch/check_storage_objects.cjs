const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function checkDB(name, connectionString) {
  console.log(`\nChecking ${name} DB storage.objects...`);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT name, bucket_id, created_at, updated_at
      FROM storage.objects
      WHERE bucket_id = 'proposal-templates'
      ORDER BY name
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(`Error checking ${name} DB:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await checkDB('DEV', devConnectionString);
  await checkDB('PROD', prodConnectionString);
}

run().catch(err => console.error(err));
