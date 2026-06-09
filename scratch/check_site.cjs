const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Connected to dev DB.");
        
        const clientRes = await client.query("SELECT id, legal_name, trade_name, country_id FROM core_common.clients");
        console.log("All Clients:");
        console.table(clientRes.rows);

        const sitesRes = await client.query("SELECT id, name, client_id, country_id, region_id, postal_code FROM core_common.client_sites");
        console.log("All Client Sites:");
        console.table(sitesRes.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
