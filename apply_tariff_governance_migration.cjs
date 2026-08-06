const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionStrings = [
    'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
    'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
];

async function applyMigration() {
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260806140000_tariff_authorization_and_audit_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    for (const connStr of connectionStrings) {
        const client = new Client({ connectionString: connStr });
        try {
            await client.connect();
            console.log(`Connected to DB: ${connStr.includes('pyahcgorkvwfwmlzspnv') ? 'DEV' : 'PROD'}`);
            await client.query(sql);
            console.log(`Migration applied successfully to ${connStr.includes('pyahcgorkvwfwmlzspnv') ? 'DEV' : 'PROD'}!`);
        } catch (err) {
            console.error(`Migration error on ${connStr}:`, err);
        } finally {
            await client.end();
        }
    }
}

applyMigration();
