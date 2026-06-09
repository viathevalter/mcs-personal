const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const pgClient = new Client({ connectionString: devConnectionString });
    await pgClient.connect();
    
    // Check buckets
    const bucketRes = await pgClient.query('SELECT id, name, public FROM storage.buckets');
    console.log('Buckets in storage schema:');
    console.log(bucketRes.rows);

    // Check schemas/tables for document storage bucket names
    const schemaRes = await pgClient.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%document%' OR table_name LIKE '%storage%'
    `);
    console.log('\nTables related to documents or storage:');
    console.log(schemaRes.rows);

    await pgClient.end();
}

run();
