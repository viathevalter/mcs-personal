const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function checkDb(connectionString, name) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log(`=== ${name}: core_personal.workers Columns Info ===`);
        const res = await client.query(`
            SELECT column_name, is_nullable, column_default, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workers' AND table_schema = 'core_personal'
            AND column_name IN ('cod_colab', 'nome', 'nif', 'status_trabajador')
        `);
        console.log(res.rows);

        console.log(`\n=== ${name}: Triggers on core_personal.workers ===`);
        const res2 = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement, action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'workers' AND event_object_schema = 'core_personal'
        `);
        console.log(res2.rows);

    } catch (e) {
        console.error(`ERROR on ${name}:`, e);
    } finally {
        await client.end();
    }
}

async function run() {
    await checkDb(devConnectionString, "DEV");
    console.log("\n--------------------------------------------------\n");
    await checkDb(prodConnectionString, "PROD");
}
run();
