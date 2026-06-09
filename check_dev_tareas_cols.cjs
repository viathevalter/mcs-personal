const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== DEV core_operacoes.solicitud_tareas COLUMNS ===");
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_operacoes' AND table_name = 'solicitud_tareas'
        `);
        console.log(res.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
