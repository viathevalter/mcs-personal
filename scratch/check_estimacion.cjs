const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking estimacion 6f7100c9-7cf0-4a05-9997-0aad1cdb0d1a...");
        const res = await client.query(`
            SELECT id, status, client_id, lead_id, current_version_id, codigo 
            FROM core_comercial.estimaciones 
            WHERE id = '6f7100c9-7cf0-4a05-9997-0aad1cdb0d1a';
        `);
        console.log("Estimacion:", res.rows[0]);
        
        const current_version_id = res.rows[0].current_version_id;
        console.log(`Checking version ${current_version_id}...`);
        const versionRes = await client.query(`
            SELECT id, estimacion_id, version_number, total_cost, total_revenue
            FROM core_comercial.estimacion_versions
            WHERE id = $1;
        `, [current_version_id]);
        console.log("Version details:", versionRes.rows[0]);

        console.log("\nChecking estimacion_items for this version...");
        const itemsRes = await client.query(`
            SELECT id, job_function_id, job_function_name_snapshot, quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours, sell_rate_hour
            FROM core_comercial.estimacion_items
            WHERE estimacion_version_id = $1;
        `, [current_version_id]);
        console.log("Items found:", itemsRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
