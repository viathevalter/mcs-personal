const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        // Check schema usage grants
        const resSchema = await client.query(`
            SELECT schema_name, 
                   has_schema_privilege('anon', schema_name, 'USAGE') as anon_usage,
                   has_schema_privilege('authenticated', schema_name, 'USAGE') as auth_usage
            FROM information_schema.schemata
            WHERE schema_name IN ('core_common', 'core_personal', 'core_finance', 'core_comercial')
        `);
        console.log("Schema usage privileges:", resSchema.rows);

        // Check table SELECT grants
        const resTable = await client.query(`
            SELECT table_schema, table_name,
                   has_table_privilege('anon', table_schema || '.' || table_name, 'SELECT') as anon_select,
                   has_table_privilege('authenticated', table_schema || '.' || table_name, 'SELECT') as auth_select
            FROM information_schema.tables
            WHERE table_schema IN ('core_common', 'core_personal', 'core_finance', 'core_comercial')
              AND table_name IN ('clients', 'workers', 'worker_hours', 'horas_trabalhadas', 'client_sites', 'faturas')
        `);
        console.log("Table SELECT privileges:", resTable.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
