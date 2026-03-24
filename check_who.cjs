const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        const res = await prodClient.query("SELECT * FROM core_personal.workers LIMIT 10;");
        console.log(res.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
