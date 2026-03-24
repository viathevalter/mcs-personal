const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    try {
        const res = await prodClient.query("DELETE FROM core_personal.workers WHERE cod_colab = '999999';");
        console.log(`Deleted ${res.rowCount} row(s) successfully.`);
    } catch(e) {
        console.error("Error deleting:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
