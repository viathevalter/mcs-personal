const { Client } = require('pg');
const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkNavarro() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    const leads = await client.query(`
      SELECT id, company_name, email, phone, website, city 
      FROM core_comercial.leads 
      WHERE email ILIKE '%cerrajerianavarro%' OR company_name ILIKE '%cerrajer%navarro%';
    `);
    console.table(leads.rows);

    const staging = await client.query(`
      SELECT id, company_name, email, phone, website, city 
      FROM core_comercial.lead_prospecting_results 
      WHERE email ILIKE '%cerrajerianavarro%' OR company_name ILIKE '%cerrajer%navarro%';
    `);
    console.table(staging.rows);

  } finally {
    await client.end();
  }
}

checkNavarro();
