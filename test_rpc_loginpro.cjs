const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    try {
        const result = await prodClient.query(`
            SELECT * FROM core_personal.get_real_seguridade_status('bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d');
        `);
        console.log(JSON.stringify(result.rows[0], null, 2));
    } catch (e) {
        console.error("Failed to query:", e);
    } finally {
        await prodClient.end();
    }
}
run();
