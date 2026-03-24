const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';
const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        const emps = await prodClient.query("SELECT * FROM public.empresas");
        console.log("public.empresas:", emps.rows);
        const empsCore = await prodClient.query("SELECT * FROM core_common.empresas");
        console.log("core_common.empresas:", empsCore.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
