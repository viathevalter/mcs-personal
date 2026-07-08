const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        // Check if RLS is enabled on workers
        const resRlsW = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_personal' AND tablename = 'workers'
        `);
        console.log("RLS ON WORKERS:", resRlsW.rows);

        // Check RLS policies on core_personal.workers
        const resPoliciesW = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'workers'
        `);
        console.log("POLICIES ON WORKERS:", JSON.stringify(resPoliciesW.rows, null, 2));

        // Check if RLS is enabled on worker_hours
        const resRlsWh = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_personal' AND tablename = 'worker_hours'
        `);
        console.log("RLS ON WORKER_HOURS:", resRlsWh.rows);

        // Check RLS policies on core_personal.worker_hours
        const resPoliciesWh = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'worker_hours'
        `);
        console.log("POLICIES ON WORKER_HOURS:", JSON.stringify(resPoliciesWh.rows, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
