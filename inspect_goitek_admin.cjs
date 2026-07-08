const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB as superuser.");

        // Check if the client exists by ID
        const resById = await client.query(`
            SELECT id, trade_name, status, empresa_id 
            FROM core_common.clients 
            WHERE id = 'a32139d5-517d-cb87-5276-6a19878273c5'
        `);
        console.log("Client by ID a32139d5-517d-cb87-5276-6a19878273c5:", resById.rows);

        // Check if a client exists by name containing 'GOITEK'
        const resByName = await client.query(`
            SELECT id, trade_name, status, empresa_id 
            FROM core_common.clients 
            WHERE trade_name ILIKE '%GOITEK%'
        `);
        console.log("Clients matching 'GOITEK':", resByName.rows);

        // Print companies to see which ID belongs to what company name
        const resComp = await client.query(`
            SELECT id, nome FROM core_common.empresas
        `);
        console.log("Companies:", resComp.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
