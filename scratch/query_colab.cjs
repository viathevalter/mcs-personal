const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();
    
    try {
        const res = await client.query(`
            SELECT * FROM public.colaboradores
            WHERE cod_colab = $1
        `, ['E1481']);
        console.log("DEV public.colaboradores for E1481:", JSON.stringify(res.rows, null, 2));
        
        // Also let's print the column names of public.colaboradores
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'colaboradores' AND table_schema = 'public'
        `);
        console.log("DEV public.colaboradores columns:", columnsRes.rows.map(c => c.column_name));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
