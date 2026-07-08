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
            SELECT id, nome, cod_colab, cliente_nombre, status_trabajador, data_baixa, created_at
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);

        console.log(`WORKERS LIST (${res.rows.length}):`);
        res.rows.forEach((w, i) => {
            console.log(`${i+1}. ${w.nome} (${w.cod_colab}) - Client: "${w.cliente_nombre}" - Status: "${w.status_trabajador}" - Baixa: ${w.data_baixa} - Created: ${w.created_at}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
