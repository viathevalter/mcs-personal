const fs = require('fs');
const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // 1. Fetching search_workers
    let res = await prodClient.query(`
        SELECT p.proname, pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname IN ('search_workers', 'get_hours_control_workers');
    `);

    let output = "";
    for(let r of res.rows) {
        output += "\n--- " + r.proname + " ---\n" + r.pg_get_functiondef + "\n";
    }

    fs.writeFileSync('func_verify.txt', output, 'utf8');
    
    // Test the execution directly!
    // What if there is an error in execution? Let's check get_hours_control_workers for an empresa.
    let countRes = await prodClient.query(`
      SELECT COUNT(*) FROM core_personal.workers;
    `);
    
    let activeRes = await prodClient.query(`
      SELECT status_trabajador, status_seguridad, count(*) 
      FROM core_personal.workers 
      GROUP BY status_trabajador, status_seguridad;
    `);

    fs.appendFileSync('func_verify.txt', "\n--- Total Workers: " + countRes.rows[0].count + " ---\n", 'utf8');
    fs.appendFileSync('func_verify.txt', JSON.stringify(activeRes.rows, null, 2), 'utf8');

    await prodClient.end();
}
run();
