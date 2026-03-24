const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- Checking workers statuses ---");
        const statuses = await prodClient.query(`
            SELECT status_trabajador, status_seguridad, count(*) 
            FROM core_personal.workers
            GROUP BY status_trabajador, status_seguridad;
        `);
        console.log(statuses.rows);

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
