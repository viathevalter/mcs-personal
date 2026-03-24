const { Client } = require('pg');
const fs = require('fs');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const f1 = await prodClient.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'get_client_worker_kpis';
        `);
        fs.writeFileSync('f1.sql', f1.rows[0]?.pg_get_functiondef || '');

        const f2 = await prodClient.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'search_workers';
        `);
        fs.writeFileSync('f2.sql', f2.rows[0]?.pg_get_functiondef || '');
        console.log("Written f1.sql and f2.sql successfully.");

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
