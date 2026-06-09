const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to dev DB.");

        const res = await client.query(`
            INSERT INTO core_comercial.job_function_rate_refs (
                empresa_id, 
                job_function_id, 
                country_id, 
                region_id, 
                currency_code,
                base_cost_hour, 
                recommended_sell_rate_hour, 
                minimum_sell_rate_hour, 
                minimum_margin_percent,
                notes,
                status
            )
            SELECT 
                e.id AS empresa_id,
                r.job_function_id,
                r.country_id,
                r.region_id,
                r.currency_code,
                r.base_cost_hour,
                r.recommended_sell_rate_hour,
                r.minimum_sell_rate_hour,
                r.minimum_margin_percent,
                r.notes,
                r.status
            FROM core_comercial.job_function_rate_refs r
            CROSS JOIN core_common.empresas e
            WHERE r.empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
              AND e.id != 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
            ON CONFLICT DO NOTHING;
        `);
        console.log(`Successfully duplicated ${res.rowCount} rate refs to other empresas.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
