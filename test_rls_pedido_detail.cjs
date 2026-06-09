const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        await client.query('BEGIN');
        
        // Simulate Walter's authentication context in DEV
        const walterId = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';
        console.log(`Setting request.jwt.claim.sub to ${walterId}`);
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [walterId]);
        await client.query(`SELECT set_config('role', 'authenticated', true)`);

        console.log("\n=== Testing core_comercial.pedido_items select under Walter's RLS context in DEV ===");
        const pedidoId = '6c005d03-72db-4f22-a3d8-b0693b7626b1';
        const queryText = `
            SELECT pi.*, jf.name as jf_name
            FROM core_comercial.pedido_items pi
            LEFT JOIN core_comercial.job_functions jf ON pi.job_function_id = jf.id
            WHERE pi.pedido_id = $1
        `;
        const res = await client.query(queryText, [pedidoId]);
        console.log("Success! Items count:", res.rows.length);
        console.log("Items:", res.rows);

        await client.query('COMMIT');
    } catch (e) {
        console.error("ERROR:", e);
        await client.query('ROLLBACK');
    } finally {
        await client.end();
    }
}
run();
