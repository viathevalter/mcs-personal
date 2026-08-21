const { Client } = require('pg');
const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanupNavarro() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    await client.query(`DELETE FROM core_comercial.leads WHERE id = '955d69f7-686d-4602-9926-a9b247b011cb';`);

    await client.query(`
      UPDATE core_comercial.leads
      SET email = 'cerrajerianavarro@gmail.com', phone = '968 746 090', website = 'https://cerrajerianavarro.es', updated_at = NOW()
      WHERE id = '2897e3f0-b2f1-439b-9253-d1c4b005489d';
    `);

    console.log("Navarro atualizado com sucesso no CRM!");

  } finally {
    await client.end();
  }
}

cleanupNavarro();
