const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- DEBUGGING WORKERS ---");
        const c = await prodClient.query("SELECT COUNT(*) FROM core_personal.workers;");
        console.log("Count core_personal.workers:", c.rows[0].count);

        const c2 = await prodClient.query("SELECT COUNT(*) FROM public.colaboradores;");
        console.log("Count public.colaboradores:", c2.rows[0].count);
        
        if (parseInt(c.rows[0].count) > 0) {
            const sample = await prodClient.query("SELECT status_trabajador, status_seguridad FROM core_personal.workers LIMIT 3;");
            console.log("Sample:", sample.rows);
        }

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
