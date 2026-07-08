const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const clientId = '7442b62c-9c27-40e4-bd90-9ae0c338d57d';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    
    // Find client country_id
    const res = await client.query(`
      SELECT id, trade_name, country_id 
      FROM core_common.clients
      WHERE id = $1;
    `, [clientId]);
    
    console.log("Client country_id:", res.rows[0]);

    if (res.rows[0] && res.rows[0].country_id) {
      const countryId = res.rows[0].country_id;
      const countryRes = await client.query(`
        SELECT id, name, iso2 
        FROM core_common.countries
        WHERE id = $1;
      `, [countryId]);
      console.log("Matched Country in DB:", countryRes.rows[0]);
    } else {
      console.log("Client has NO country_id in database!");
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
