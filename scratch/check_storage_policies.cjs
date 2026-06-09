const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const pgClient = new Client({ connectionString: devConnectionString });
    await pgClient.connect();

    // Check policies on storage.objects
    const policyRes = await pgClient.query(`
        SELECT tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    `);
    console.log('Policies on storage.objects:');
    console.log(policyRes.rows);

    await pgClient.end();
}

run();
