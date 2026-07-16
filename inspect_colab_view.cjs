const { Client } = require('pg');

const conn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        
        console.log("=== CHECKING TABLE TYPE FOR colaborador_por_pedido ===");
        const tableTypeRes = await client.query(`
            SELECT table_type 
            FROM information_schema.tables 
            WHERE table_name = 'colaborador_por_pedido'
        `);
        console.log("Table type:", tableTypeRes.rows);

        // If it's a view, get its definition
        if (tableTypeRes.rows[0]?.table_type === 'VIEW') {
            console.log("=== VIEW DEFINITION ===");
            const viewDefRes = await client.query(`
                SELECT view_definition 
                FROM information_schema.views 
                WHERE table_name = 'colaborador_por_pedido'
            `);
            console.log("Definition:", viewDefRes.rows[0]?.view_definition);
        }

        console.log("=== SAMPLE FROM colaboradores TABLE ===");
        const sampleColab = await client.query(`
            SELECT * FROM colaboradores LIMIT 2
        `);
        console.log("Colaboradores sample columns & data:", sampleColab.rows);
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
