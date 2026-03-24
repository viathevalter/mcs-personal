const { Client } = require('pg');
const fs = require('fs');

const run = async () => {
    const connectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';
    const client = new Client({ connectionString });
    try {
        console.log('Connecting to Supabase Prod natively via Node.js...');
        await client.connect();
        console.log('Connected successfully!');
        
        console.log('Reading prod_schema.sql...');
        const sql = fs.readFileSync('prod_schema.sql', 'utf8');
        
        console.log('Executing 180KB schema payload. This might take a minute...');
        await client.query(sql);
        
        console.log('✅ Schema imported successfully!');
    } catch (err) {
        console.error('❌ Error during import:', err.message);
    } finally {
        await client.end();
    }
};

run();
