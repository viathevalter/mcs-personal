const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function printRpc(connectionString, name) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_personal' AND p.proname = 'alocar_trabalhador_em_vaga'
        `);
        if (res.rows.length > 0) {
            console.log(`=== ${name} FUNCTION DEFINITION ===`);
            console.log(res.rows[0].def);
        } else {
            console.log(`=== ${name} FUNCTION NOT FOUND ===`);
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}

async function run() {
    await printRpc(devConnectionString, "DEV");
    console.log("\n--------------------------------------------------\n");
    await printRpc(prodConnectionString, "PROD");
}
run();
