const fs = require('fs');
const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // Find the original function definition
    const res = await prodClient.query(`
        SELECT pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'core_personal'
        AND p.proname = 'search_workers';
    `);

    if(res.rows.length > 0) {
        fs.writeFileSync('func_def.txt', res.rows[0].pg_get_functiondef, 'utf8');
        console.log("Saved to func_def.txt");
    }
    
    await prodClient.end();
}
run();
