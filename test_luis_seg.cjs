const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    try {
        const result = await prodClient.query(`
            SELECT ss.id, ss.tipo_evento, ss.status, ss.origem_contratante, ss.origem_cliente_nome, ss.data_solicitacao
            FROM core_personal.seguridade_status ss
            JOIN core_personal.workers w ON w.id = ss.worker_id
            WHERE w.nome ILIKE '%LUIS CARLOS CASTELLAR VILLARREAL%'
            ORDER BY ss.created_at DESC;
        `);
        console.table(result.rows);
    } catch (e) {
        console.error("Failed to query:", e);
    } finally {
        await prodClient.end();
    }
}
run();
