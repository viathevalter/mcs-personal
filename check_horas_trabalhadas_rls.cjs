const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        // Check if RLS is enabled on horas_trabalhadas
        const resRls = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_finance' AND tablename = 'horas_trabalhadas'
        `);
        console.log("RLS ON HORAS_TRABALHADAS:", resRls.rows);

        // Check RLS policies on core_finance.horas_trabalhadas
        const resPolicies = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_finance' AND tablename = 'horas_trabalhadas'
        `);
        console.log("POLICIES ON HORAS_TRABALHADAS:", JSON.stringify(resPolicies.rows, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
