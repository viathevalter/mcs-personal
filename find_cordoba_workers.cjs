const { Client } = require('pg');

const conn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        
        console.log("=== COLABORADOR_POR_PEDIDO ===");
        const res1 = await client.query(`
            SELECT idcolaborador, nome_colab, cliente_nombre, codpedido 
            FROM colaborador_por_pedido 
            WHERE cliente_nombre ILIKE '%CORDOBA%'
        `);
        console.log("Results in colaborador_por_pedido:", res1.rows.length, res1.rows);

        console.log("\n=== PEDIDOS E CLIENTES ===");
        const res2 = await client.query(`
            SELECT p.codpedido, p.codcliente, c.nombre_comercial 
            FROM pedidos p
            JOIN clientes c ON c.cod_cliente = p.codcliente
            WHERE c.nombre_comercial ILIKE '%CORDOBA%'
        `);
        console.log("Results in pedidos/clientes:", res2.rows.length, res2.rows);

        console.log("\n=== COLABORADORES / WORKERS IN SCHEMA core_personal ===");
        // Let's query information_schema.tables to see if there is core_personal schema and workers table
        const res3 = await client.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'workers'
        `);
        console.log("Workers tables:", res3.rows);

        const res4 = await client.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'colaboradores'
        `);
        console.log("Colaboradores tables:", res4.rows);
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
