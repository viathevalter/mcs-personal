const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    try {
        const result = await prodClient.query(`
            SELECT id, worker_nome, change_type, empresa_nome, cliente_nome
            FROM core_personal.get_global_movement_history(null, null, null, null)
            LIMIT 5;
        `);
        console.table(result.rows);
    } catch (e) {
        console.error("Failed to query:", e);
    } finally {
        await prodClient.end();
    }
}
run();
