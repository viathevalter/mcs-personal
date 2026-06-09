const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        // Query companies in core_common.empresas
        const empresas = await client.query("SELECT * FROM core_common.empresas");
        console.log("PROD core_common.empresas:", JSON.stringify(empresas.rows, null, 2));
        
        // Query clients in public.clientes matching HERMANOS DJ 2000
        const clientes = await client.query("SELECT id, sp_id, nombre_comercial, razon_social FROM public.clientes WHERE nombre_comercial ILIKE $1 OR razon_social ILIKE $1", ['%HERMANOS%']);
        console.log("PROD public.clientes:", JSON.stringify(clientes.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
