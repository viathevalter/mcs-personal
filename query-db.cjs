const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Connected to dev DB.");
        
        const allocRes = await client.query(`
            SELECT id, cod_colab, codpedido, cliente_nombre, contratante, tiposervico, fechainiciopedido, fechafinpedido, funcion
            FROM core_personal.vw_worker_allocations
            WHERE cod_colab IN ('E1733', 'E0486')
            ORDER BY fechainiciopedido DESC NULLS LAST
        `);
        console.log("Allocations from view:");
        console.table(allocRes.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
