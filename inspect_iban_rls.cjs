const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function inspectDb(dbName, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log(`\n========================================`);
        console.log(`=== Inspecting ${dbName} Database RLS ===`);
        console.log(`========================================`);
        
        // 1. Check policies on core_personal.iban_change_requests
        const resPolicies = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'iban_change_requests';
        `);
        console.log(`\nRLS Policies on core_personal.iban_change_requests (${dbName}):`);
        console.log(JSON.stringify(resPolicies.rows, null, 2));

        // 2. Check storage bucket worker-incoming-docs
        const resBucket = await client.query(`
            SELECT id, name, public, file_size_limit, allowed_mime_types 
            FROM storage.buckets 
            WHERE name = 'worker-incoming-docs';
        `);
        console.log(`\nStorage Bucket worker-incoming-docs (${dbName}):`);
        console.log(JSON.stringify(resBucket.rows, null, 2));

        // 3. Check storage policies on storage.objects for worker-incoming-docs
        const resStoragePolicies = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects';
        `);
        console.log(`\nStorage Policies on storage.objects (${dbName}):`);
        console.log(JSON.stringify(resStoragePolicies.rows, null, 2));

    } catch (err) {
        console.error(`Inspection on ${dbName} failed:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await inspectDb('DEV', devConnectionString);
    await inspectDb('PROD', prodConnectionString);
}

run();
