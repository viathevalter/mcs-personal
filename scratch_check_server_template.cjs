const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_personal' AND table_name = 'contracts';
        `);
        console.log("Columns of contracts:");
        res.rows.forEach(r => {
            console.log(`- ${r.column_name} (${r.data_type})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
