const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.empresas WHERE id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'");
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
