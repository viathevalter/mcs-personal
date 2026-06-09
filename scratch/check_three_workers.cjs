const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        const names = [
            'JAVIER SAUL PEREA CAMARGO',
            'JUAN SEBASTIAN GARCIA GARCIA',
            'RICHARD ANTONIO GUERRA HERRERA'
        ];
        
        console.log("=== CHECKING WORKERS IN core_personal.workers ===");
        const workersRes = await client.query(`
            SELECT id, cod_colab, nome, cliente, contratante, status_trabajador, status_seguridad, empresa_id
            FROM core_personal.workers
            WHERE nome = ANY($1)
        `, [names]);
        console.log(workersRes.rows);

        console.log("\n=== CHECKING ALLOCATIONS IN colaborador_por_pedido ===");
        const allocsRes = await client.query(`
            SELECT id, cod_colab, nome_colab, cliente_nombre, contratante, fechainiciopedido, inserted_at
            FROM public.colaborador_por_pedido
            WHERE nome_colab = ANY($1)
            ORDER BY inserted_at DESC
        `, [names]);
        console.log(allocsRes.rows);

        console.log("\n=== CHECKING TICKETS IN core_personal.seguridade_status ===");
        const ticketsRes = await client.query(`
            SELECT *
            FROM core_personal.seguridade_status
            WHERE worker_id = ANY($1)
            ORDER BY created_at DESC
        `, [workersRes.rows.map(w => w.id)]);
        console.log(ticketsRes.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
