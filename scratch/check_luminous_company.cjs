const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    console.log("=== CHECKING DEV DB ===");
    let client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.empresas WHERE nome ILIKE '%Luminous%' OR trade_name ILIKE '%Luminous%' OR legal_name ILIKE '%Luminous%'");
        console.log("Found in DEV:", res.rows);
        
        const all = await client.query("SELECT id, codigo, nome, is_active FROM core_common.empresas");
        console.log("All in DEV:", all.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }

    console.log("\n=== CHECKING PROD DB ===");
    client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.empresas WHERE nome ILIKE '%Luminous%' OR trade_name ILIKE '%Luminous%' OR legal_name ILIKE '%Luminous%'");
        console.log("Found in PROD:", res.rows);

        const all = await client.query("SELECT id, codigo, nome, is_active FROM core_common.empresas");
        console.log("All in PROD:", all.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
