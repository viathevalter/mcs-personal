const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const migrationSql = `
-- 1. Clean up any potential orphan records
DELETE FROM core_common.client_worker_tariffs WHERE worker_id NOT IN (SELECT id FROM core_personal.workers);

-- 2. Drop the constraint if it exists (for idempotency)
ALTER TABLE core_common.client_worker_tariffs DROP CONSTRAINT IF EXISTS fk_client_worker_tariffs_worker;

-- 3. Add the foreign key constraint
ALTER TABLE core_common.client_worker_tariffs 
ADD CONSTRAINT fk_client_worker_tariffs_worker 
FOREIGN KEY (worker_id) REFERENCES core_personal.workers(id)
ON DELETE CASCADE;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

async function applyToDb(name, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log(`Connected to ${name} database.`);
        await client.query(migrationSql);
        console.log(`Successfully added foreign key constraint and reloaded schema on ${name} database.`);
    } catch (e) {
        console.error(`Failed to add constraint on ${name} database:`, e);
        throw e;
    } finally {
        await client.end();
    }
}

async function run() {
    try {
        await applyToDb("DEVELOPMENT", devConnectionString);
        await applyToDb("PRODUCTION", prodConnectionString);
        console.log("ALL DATABASE CONSTRAINTS AND NOTIFICATIONS APPLIED SUCCESSFULLY!");
    } catch (e) {
        console.error("Database constraint migration failed.", e);
        process.exit(1);
    }
}

run();
