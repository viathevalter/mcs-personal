const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        console.log("Searching for Wiseowe workers in core_personal.workers...");
        const res = await client.query(`
            SELECT id, empresa_id, cod_colab, nome, status_trabajador
            FROM core_personal.workers
            WHERE empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e'
            LIMIT 5
        `);
        console.log("Wiseowe Workers:", JSON.stringify(res.rows, null, 2));
        
        if (res.rows.length > 0) {
            const firstCod = res.rows[0].cod_colab;
            console.log(`\nChecking details for ${firstCod} across tables:`);
            
            const colabRes = await client.query(`
                SELECT * FROM public.colaboradores WHERE cod_colab = $1
            `, [firstCod]);
            console.log("public.colaboradores:", JSON.stringify(colabRes.rows, null, 2));
            
            const cppRes = await client.query(`
                SELECT * FROM public.colaborador_por_pedido WHERE cod_colab = $1
            `, [firstCod]);
            console.log("public.colaborador_por_pedido:", JSON.stringify(cppRes.rows, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
