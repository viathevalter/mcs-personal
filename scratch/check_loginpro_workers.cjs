const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        console.log("Counting workers by empresa_id in PROD...");
        const countRes = await client.query(`
            SELECT empresa_id, COUNT(*) 
            FROM core_personal.workers 
            GROUP BY empresa_id
        `);
        console.log("Counts per company:", countRes.rows);
        
        console.log("\nQuerying company details for verification...");
        const empresas = await client.query("SELECT id, nome, codigo FROM core_common.empresas");
        console.log("Empresas:", empresas.rows);
        
        // Let's also check if there are any worker assignments under Login Pro or Wiseowe
        const assignmentsRes = await client.query(`
            SELECT COUNT(*), idempresa 
            FROM public.colaborador_por_pedido 
            GROUP BY idempresa
        `);
        console.log("Assignments per company:", assignmentsRes.rows);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
