const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const resRLS = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_common' AND tablename = 'client_worker_tariffs'
        `);

        if (resRLS.rows.length > 0) {
            console.log(`Table ${resRLS.rows[0].tablename} RLS active: ${resRLS.rows[0].rowsecurity}`);
        }

        const resPol = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_common' AND tablename = 'client_worker_tariffs'
        `);

        console.log("Policies:");
        resPol.rows.forEach(r => {
            console.log(` - Policy: ${r.policyname}`);
            console.log(`   Roles: ${r.roles.join(', ')}`);
            console.log(`   Cmd: ${r.cmd}`);
            console.log(`   Qual: ${r.qual}`);
            console.log(`   With Check: ${r.with_check}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
