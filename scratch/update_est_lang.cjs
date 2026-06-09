const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to dev DB.");
    
    const res = await client.query(`
      UPDATE core_comercial.estimaciones
      SET document_language = 'es'
      WHERE codigo = 'EST-20260608-EA9A'
      RETURNING id, codigo, document_language
    `);
    
    console.log("Updated Estimation:", res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run().catch(err => console.error(err));
