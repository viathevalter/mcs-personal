const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Connected to local development DB.");

        // Query tables in core_personal schema
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core_personal'
        `);
        console.log("Tables in core_personal:", tablesRes.rows.map(r => r.table_name));

        // Query columns of worker_assignments if it exists
        const hasWorkerAssignments = tablesRes.rows.some(r => r.table_name === 'worker_assignments');
        if (hasWorkerAssignments) {
            const columnsRes = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'core_personal' AND table_name = 'worker_assignments'
            `);
            console.log("\nColumns in core_personal.worker_assignments:");
            console.table(columnsRes.rows);

            // Fetch rows from worker_assignments
            const rowsRes = await client.query(`
                SELECT * FROM core_personal.worker_assignments LIMIT 5
            `);
            console.log("\nSample rows from core_personal.worker_assignments:", rowsRes.rows);
        } else {
            console.log("\ncore_personal.worker_assignments does NOT exist in development DB!");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
