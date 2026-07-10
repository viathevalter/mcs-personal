const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        // Check RLS status of workers and contracts
        const resRLS = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_personal' AND tablename IN ('workers', 'contracts')
        `);
        resRLS.rows.forEach(r => {
            console.log(`Table ${r.tablename} RLS active: ${r.rowsecurity}`);
        });

        // Check policies of core_personal.workers
        const resPolWorkers = await client.query(`
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'workers'
        `);
        console.log("\nWorkers Policies:");
        resPolWorkers.rows.forEach(r => {
            console.log(` - Name: ${r.policyname}`);
            console.log(`   Cmd: ${r.cmd}`);
            console.log(`   Qual: ${r.qual}`);
        });

        // Check policies of core_personal.contracts
        const resPolContracts = await client.query(`
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'contracts'
        `);
        console.log("\nContracts Policies:");
        resPolContracts.rows.forEach(r => {
            console.log(` - Name: ${r.policyname}`);
            console.log(`   Cmd: ${r.cmd}`);
            console.log(`   Qual: ${r.qual}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
