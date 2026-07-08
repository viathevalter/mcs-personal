const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const devClient = new Client({ connectionString: devConnectionString });
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await devClient.connect();
        console.log("Connected to DEVELOPMENT DB.");
        await devClient.query(`
            ALTER TABLE core_common.clients 
            ADD COLUMN IF NOT EXISTS payment_terms text;
        `);
        console.log("Verified/added payment_terms on DEVELOPMENT DB.");

        await prodClient.connect();
        console.log("Connected to PRODUCTION DB.");
        await prodClient.query(`
            ALTER TABLE core_common.clients 
            ADD COLUMN IF NOT EXISTS payment_terms text;
        `);
        console.log("Verified/added payment_terms on PRODUCTION DB.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await devClient.end();
        await prodClient.end();
    }
}

run();
