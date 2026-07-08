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

        // Run query on core_finance.horas_trabalhadas
        const resHt = await client.query(`
            SELECT * FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN '2026-06-01' AND '2026-06-30'
        `);
        console.log(`Successfully fetched horas_trabalhadas:`, resHt.rows.length);

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error executing query:", e);
    } finally {
        await client.end();
    }
}

run();
