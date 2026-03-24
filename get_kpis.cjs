const fs = require('fs');
const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    const res = await prodClient.query(`
        SELECT pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'core_personal'
        AND p.proname = 'get_client_worker_kpis';
    `);

    if (res.rows.length > 0) {
        fs.writeFileSync('func_kpis.txt', res.rows[0].pg_get_functiondef, 'utf8');
    }
    await prodClient.end();
}
run();
