const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Columns of core_common.empresas:");
        const empCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_common' AND table_name = 'empresas';
        `);
        console.log(empCols.rows);

        console.log("\nColumns of core_comercial.estimaciones:");
        const estCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_comercial' AND table_name = 'estimaciones';
        `);
        console.log(estCols.rows);
        
        console.log("\nSome rows from core_common.empresas:");
        const empRows = await client.query(`SELECT * FROM core_common.empresas;`);
        console.log(empRows.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
