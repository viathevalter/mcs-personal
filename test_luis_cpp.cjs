const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    try {
        const result = await prodClient.query(`
            SELECT cpp.id, cpp.fechainiciopedido, cpp.fechasalidatrabajador, cpp.contratante, cpp.cliente_nombre, cpp.inserted_at
            FROM public.colaborador_por_pedido cpp
            JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
            WHERE w.nome ILIKE '%LUIS CARLOS CASTELLAR VILLARREAL%'
            ORDER BY cpp.inserted_at DESC;
        `);
        console.table(result.rows);
    } catch (e) {
        console.error("Failed to query:", e);
    } finally {
        await prodClient.end();
    }
}
run();
