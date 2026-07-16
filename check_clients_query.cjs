const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT c.id, c.trade_name, c.address_line, c.postal_code, c.city, c.province, co.name as country_name 
            FROM core_common.clients c
            LEFT JOIN core_common.countries co ON c.country_id = co.id
            LIMIT 5
        `);

        console.log("Client query sample:", res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
