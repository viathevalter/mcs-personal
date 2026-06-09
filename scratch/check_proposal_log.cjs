const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DEV DB.");

        // 1. Get estimate by code
        const estRes = await client.query("SELECT * FROM core_comercial.estimaciones WHERE codigo = 'EST-20260526-0A85'");
        if (estRes.rows.length === 0) {
            console.log("Estimate not found!");
            return;
        }
        const est = estRes.rows[0];
        console.log("=== ESTIMATION ===");
        console.log({
            id: est.id,
            codigo: est.codigo,
            status: est.status,
            client_id: est.client_id,
            empresa_id: est.empresa_id
        });

        // 2. Get proposal signature
        const sigRes = await client.query("SELECT * FROM core_comercial.proposal_signatures WHERE estimacion_id = $1", [est.id]);
        console.log("\n=== PROPOSAL SIGNATURES ===");
        console.log(sigRes.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
