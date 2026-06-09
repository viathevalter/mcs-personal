const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== COMPANIES ===");
        const empRes = await client.query('SELECT id, nome, codigo FROM core_common.empresas');
        console.log(empRes.rows);

        console.log("\n=== WORKER STATUSES IN PROD ===");
        const statusRes = await client.query(`
            SELECT status_trabajador, count(*) 
            FROM core_personal.workers 
            GROUP BY status_trabajador
        `);
        console.log(statusRes.rows);

        console.log("\n=== INACTIVE WORKERS BY COMPANY ===");
        const inactiveRes = await client.query(`
            SELECT empresa_id, count(*) 
            FROM core_personal.workers 
            WHERE status_trabajador IS NULL OR status_trabajador NOT IN ('Ativo', 'Activo', 'ATIVO', 'ACTIVO')
            GROUP BY empresa_id
        `);
        console.log(inactiveRes.rows);

        console.log("\n=== TOTAL WORKERS BY COMPANY ===");
        const totalRes = await client.query(`
            SELECT empresa_id, count(*) 
            FROM core_personal.workers 
            GROUP BY empresa_id
        `);
        console.log(totalRes.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
