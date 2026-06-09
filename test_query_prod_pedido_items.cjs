const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Checking if job_functions table exists in core_comercial in PROD...");
        const tableCheck = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'core_comercial' AND table_name = 'job_functions';
        `);
        console.log("Table check:", tableCheck.rows);

        console.log("\nQuerying pedido_items directly in PROD...");
        const itemsRes = await client.query(`
            SELECT id, pedido_id, job_function_id, job_function_name_snapshot 
            FROM core_comercial.pedido_items LIMIT 5;
        `);
        console.log("Pedido Items in PROD:", itemsRes.rows);

        if (itemsRes.rows.length > 0) {
            console.log("\nQuerying job_functions directly in PROD...");
            const jobRes = await client.query(`
                SELECT id, name FROM core_comercial.job_functions LIMIT 5;
            `);
            console.log("Job Functions in PROD:", jobRes.rows);
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
