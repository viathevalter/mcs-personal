const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_finance' AND table_name = 'faturas'
        `);

        console.log("Columns of faturas:");
        res.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
