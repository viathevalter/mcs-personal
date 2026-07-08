const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
            SELECT h.client_id, c.trade_name, c.empresa_id, e.nome as company_name, count(*)
            FROM core_finance.horas_trabalhadas h
            JOIN core_common.clients c ON c.id = h.client_id
            JOIN core_common.empresas e ON e.id = c.empresa_id
            WHERE h.data_trabalho BETWEEN '2026-06-01' AND '2026-06-30'
            GROUP BY h.client_id, c.trade_name, c.empresa_id, e.nome
            ORDER BY count(*) DESC
        `);

        console.log("Clients and companies in June 2026 hours:");
        res.rows.forEach((r, i) => {
            console.log(`${i+1}. Client: "${r.trade_name}" - Company: "${r.company_name}" (ID: ${r.empresa_id}) - Rows: ${r.count}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
