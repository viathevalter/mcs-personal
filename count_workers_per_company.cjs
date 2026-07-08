const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
            SELECT e.nome as empresa_nome, w.status_trabajador, count(*) 
            FROM core_personal.workers w
            JOIN core_common.empresas e ON e.id = w.empresa_id
            GROUP BY e.nome, w.status_trabajador
            ORDER BY e.nome, w.status_trabajador
        `);
        console.log("Workers per company and status in DB:", res.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
