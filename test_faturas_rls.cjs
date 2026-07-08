const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        // Set local claims to Valter's user ID
        await client.query("BEGIN");
        await client.query("SELECT set_config('request.jwt.claim.sub', 'ee4320ae-2d42-419e-a4a1-6f30f41d3680', true)");
        await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true)");

        // Fetch fatura IDs for June 2026
        const resHt = await client.query(`
            SELECT DISTINCT fatura_id FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN '2026-06-01' AND '2026-06-30' AND fatura_id IS NOT NULL
        `);
        const faturaIds = resHt.rows.map(r => r.fatura_id);
        console.log(`Fatura IDs in June 2026:`, faturaIds);

        if (faturaIds.length > 0) {
            const resFat = await client.query(`
                SELECT id, status, magic_link_token, data_emissao, ajustes_json FROM core_finance.faturas WHERE id = ANY($1)
            `, [faturaIds]);
            console.log(`Successfully fetched faturas:`, resFat.rows.length);
        }

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error executing query:", e);
    } finally {
        await client.end();
    }
}

run();
