const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking join between core_comercial.pedido_items and core_comercial.job_functions...");
        const res = await client.query(`
            SELECT 
                pi.id,
                pi.job_function_id,
                pi.job_function_name_snapshot,
                jf.name as job_function_name
            FROM core_comercial.pedido_items pi
            LEFT JOIN core_comercial.job_functions jf ON pi.job_function_id = jf.id
            LIMIT 5;
        `);
        console.log(res.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
