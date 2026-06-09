const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== FOREIGN KEYS OF core_comercial.pedido_items ===");
        const fkRes = await client.query(`
            SELECT
                tc.table_schema, 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_schema = 'core_comercial' 
              AND tc.table_name = 'pedido_items'
        `);
        console.log(fkRes.rows);

        console.log("\n=== COLS OF core_comercial.pedido_items ===");
        const colsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_comercial' AND table_name = 'pedido_items'
        `);
        console.log(colsRes.rows);

        console.log("\n=== SAMPLE DATA FROM core_comercial.pedido_items ===");
        const dataRes = await client.query(`
            SELECT id, job_function_id, job_function_name_snapshot 
            FROM core_comercial.pedido_items 
            LIMIT 5
        `);
        console.log(dataRes.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
