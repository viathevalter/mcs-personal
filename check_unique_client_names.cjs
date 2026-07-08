const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        const res = await client.query(`
            SELECT DISTINCT cliente_nombre
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);

        console.log("Unique client names from RPC:", res.rows.map(r => r.cliente_nombre));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
