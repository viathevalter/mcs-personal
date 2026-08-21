const { Client } = require('pg');
const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function updateNavarro() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log("=== ATUALIZANDO CERRAJERIA NAVARRO ===");
    await client.query(`
      UPDATE core_comercial.lead_prospecting_results
      SET email = 'cerrajerianavarro@gmail.com', phone = '968 746 090', website = 'https://cerrajerianavarro.es', updated_at = NOW()
      WHERE company_name ILIKE '%Cerrajería%Navarro%' OR company_name ILIKE '%Cerrajería Industrial Navarro%';
    `);

    await client.query(`
      UPDATE core_comercial.leads
      SET email = 'cerrajerianavarro@gmail.com', phone = '968 746 090', website = 'https://cerrajerianavarro.es', updated_at = NOW()
      WHERE company_name ILIKE '%Cerrajería%Navarro%' OR company_name ILIKE '%Cerrajería Industrial Navarro%';
    `);

    const res = await client.query(`
      SELECT company_name, email, phone, website, city 
      FROM core_comercial.lead_prospecting_results 
      WHERE email = 'cerrajerianavarro@gmail.com';
    `);
    console.table(res.rows);

  } finally {
    await client.end();
  }
}

updateNavarro();
