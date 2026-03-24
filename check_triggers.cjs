const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- TRIGGERS ON WORKERS ---");
        const triggers = await prodClient.query(`
            SELECT trigger_name, event_manipulation, event_object_table, action_statement
            FROM information_schema.triggers
            WHERE event_object_schema = 'core_personal'
            AND event_object_table = 'workers';
        `);
        console.log(triggers.rows);

        console.log("--- RE-CHECKING COUNT ---");
        const c1 = await prodClient.query("SELECT COUNT(*) FROM core_personal.workers;");
        console.log("core_personal.workers count:", c1.rows[0].count);

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
