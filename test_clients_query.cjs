const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
            SELECT id, trade_name, empresa_id, codigo, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id 
            FROM core_common.clients
            LIMIT 5
        `);
        console.log("Clients select success! First row:", res.rows[0]);

    } catch (e) {
        console.error("SELECT FAILED:", e);
    } finally {
        await client.end();
    }
}

run();
