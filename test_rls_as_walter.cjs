const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        await client.query("BEGIN;");
        
        console.log("Setting session variables for Walter...");
        await client.query(`
            SET LOCAL request.jwt.claim.sub = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb';
        `);
        await client.query(`
            SET LOCAL role = 'authenticated';
        `);
        
        console.log("Querying workers for Stocco (441f1f5d-aed3-40e3-8c77-7b1217757251)...");
        const res = await client.query(`
            SELECT id, nome, status_trabajador
            FROM core_personal.workers
            WHERE empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
              AND (status_trabajador IS NULL OR status_trabajador NOT IN ('Ativo','Activo','ATIVO','ACTIVO'))
        `);
        console.log("Result rows:", res.rows.length);
        if (res.rows.length > 0) {
            console.log("Sample rows:", res.rows.slice(0, 5));
        }

        await client.query("ROLLBACK;");

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
