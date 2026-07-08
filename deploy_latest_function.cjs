const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function forceDeploy(dbName, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log(`Connected to ${dbName} database. Reading migration file...`);
        
        const filePath = path.resolve(__dirname, 'supabase', 'migrations', '20260618142500_fix_replacement_limit_and_terminate_assignment.sql');
        const sql = fs.readFileSync(filePath, 'utf8');
        
        console.log(`Executing SQL on ${dbName}...`);
        await client.query(sql);
        console.log(`Function alocar_trabalhador_em_vaga successfully redeployed on ${dbName}!`);
    } catch (err) {
        console.error(`Deploy on ${dbName} failed:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await forceDeploy('DEV', devConnectionString);
    await forceDeploy('PROD', prodConnectionString);
}

run();
