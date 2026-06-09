const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Connected to dev DB.");
        
        const companies = await client.query("SELECT id, nome FROM core_common.empresas");
        console.log("Empresas:");
        console.table(companies.rows);

        const rates = await client.query(`
            SELECT r.id, f.name as function_name, c.iso2 as country, r.empresa_id, r.base_cost_hour, r.recommended_sell_rate_hour
            FROM core_comercial.job_function_rate_refs r
            LEFT JOIN core_comercial.job_functions f ON r.job_function_id = f.id
            LEFT JOIN core_common.countries c ON r.country_id = c.id
        `);
        console.log("Rates with Empresa ID:");
        console.table(rates.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
