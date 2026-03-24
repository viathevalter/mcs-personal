const fs = require('fs');
const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    const res = await prodClient.query(`
        SELECT p.proname, pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname IN ('get_unique_clients', 'get_unique_contratantes', 'get_unique_funciones');
    `);

    for(let r of res.rows) {
        fs.appendFileSync('func_dropdowns.txt', "\n--- " + r.proname + " ---\n" + r.pg_get_functiondef, 'utf8');
    }
    
    await prodClient.end();
}
run();
