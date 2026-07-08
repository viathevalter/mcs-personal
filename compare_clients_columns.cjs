const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const devClient = new Client({ connectionString: devConnectionString });
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await devClient.connect();
        await prodClient.connect();

        const resDev = await devClient.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_common' AND table_name = 'clients'
            ORDER BY column_name
        `);

        const resProd = await prodClient.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_common' AND table_name = 'clients'
            ORDER BY column_name
        `);

        const devCols = resDev.rows.map(r => `${r.column_name} (${r.data_type})`);
        const prodCols = resProd.rows.map(r => `${r.column_name} (${r.data_type})`);

        console.log("Dev columns:", devCols);
        console.log("Prod columns:", prodCols);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await devClient.end();
        await prodClient.end();
    }
}

run();
