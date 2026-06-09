const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function checkFunctionSource(name, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log(`\n=== FUNCTION SOURCE IN ${name} ===`);
        
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) AS def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_personal' AND p.proname = 'get_salary_report_workers'
        `);
        
        if (res.rows.length > 0) {
            console.log(res.rows[0].def);
        } else {
            console.log("Function get_salary_report_workers not found.");
        }
        
    } catch (e) {
        console.error("Error fetching function source:", e);
    } finally {
        await client.end();
    }
}

async function run() {
    await checkFunctionSource("DEVELOPMENT", devConnectionString);
    await checkFunctionSource("PRODUCTION", prodConnectionString);
}

run();
