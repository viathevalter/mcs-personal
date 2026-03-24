const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- core_common.empresas ---");
        const emps = await prodClient.query("SELECT id, sp_id, nome FROM core_common.empresas");
        console.log(emps.rows);
        
        console.log("\n--- public.clientes (top 5) ---");
        const clis = await prodClient.query("SELECT id, cod_cliente, nombre_comercial FROM public.clientes LIMIT 5");
        console.log(clis.rows);

        console.log("\n--- public.funcion (top 5) ---");
        const funcs = await prodClient.query("SELECT id, cod_funcion, funcion FROM public.funcion LIMIT 5");
        console.log(funcs.rows);

    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
