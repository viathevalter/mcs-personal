const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    const res = await prodClient.query("SELECT * FROM core_common.empresas;");
    console.log(res.rows);
    await prodClient.end();
}
run();
