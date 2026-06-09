const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking columns of public.pedidos in DEV...");
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'pedidos';
        `);
        console.log(columnsRes.rows.map(r => r.column_name));

        console.log("\nFetching one row from public.pedidos in DEV...");
        const sampleRes = await client.query(`
            SELECT * FROM public.pedidos LIMIT 1;
        `);
        console.log(sampleRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
