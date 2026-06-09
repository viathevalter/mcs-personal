const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to dev DB.");
    
    const res = await client.query(`
      SELECT e.id, e.codigo, e.empresa_id, emp.trade_name, e.status, e.document_language,
             ps.document_url, ps.contract_document_url
      FROM core_comercial.estimaciones e
      JOIN core_common.empresas emp ON emp.id = e.empresa_id
      LEFT JOIN core_comercial.proposal_signatures ps ON ps.estimacion_id = e.id
      WHERE e.codigo = 'EST-20260608-9D6E'
    `);
    
    console.log("Estimation:", res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run().catch(err => console.error(err));
