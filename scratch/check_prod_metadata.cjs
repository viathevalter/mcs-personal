const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        // 1. Get public.clientes columns
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clientes' AND table_schema = 'public'
        `);
        console.log("PROD public.clientes columns:", columnsRes.rows.map(c => c.column_name));

        // 2. Query clients (COMESA SL, SINFINES FACTORY)
        const clients = await client.query(`
            SELECT * 
            FROM public.clientes 
            WHERE nombre_comercial ILIKE '%comesa%' OR nombre_comercial ILIKE '%sinfines%'
               OR razon_social ILIKE '%comesa%' OR razon_social ILIKE '%sinfines%'
        `);
        console.log("PROD public.clientes matching COMESA or SINFINES:", JSON.stringify(clients.rows, null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
