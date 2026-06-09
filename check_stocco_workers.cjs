const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Counting workers for Stocco (441f1f5d-aed3-40e3-8c77-7b1217757251) in PROD...");
        const countRes = await client.query(`
            SELECT COUNT(*) FROM core_personal.workers 
            WHERE empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251';
        `);
        console.log("Total workers for Stocco in PROD:", countRes.rows[0].count);

        console.log("\nDistribution of status_trabajador for Stocco in PROD:");
        const statusRes = await client.query(`
            SELECT status_trabajador, COUNT(*) 
            FROM core_personal.workers 
            WHERE empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
            GROUP BY status_trabajador;
        `);
        console.log(statusRes.rows);

        console.log("\nShowing sample workers for Stocco in PROD:");
        const sampleRes = await client.query(`
            SELECT id, nome, status_trabajador, empresa_id 
            FROM core_personal.workers 
            WHERE empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251' 
            LIMIT 5;
        `);
        console.log(sampleRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
