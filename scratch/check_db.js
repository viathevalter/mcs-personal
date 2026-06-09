const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== WORKERS SEARCH ===");
        const workersRes = await client.query(`
            SELECT id, nome, email, movil, cod_colab, empresa_id 
            FROM core_personal.workers 
            WHERE nome ILIKE '%Diego%'
        `);
        console.log("Workers found:", workersRes.rows);

        if (workersRes.rows.length > 0) {
            const workerId = workersRes.rows[0].id;
            console.log("\n=== DOCUMENT REQUESTS ===");
            const docReqRes = await client.query(`
                SELECT id, empresa_id, worker_id, token, status, expires_at, created_at, passport_url, nif_url, niss_url
                FROM core_personal.document_requests 
                WHERE worker_id = $1
                ORDER BY created_at DESC
            `, [workerId]);
            console.log("Document Requests found:", docReqRes.rows);

            console.log("\n=== COMPANIES IN SYSTEM ===");
            const companiesRes = await client.query(`
                SELECT id, nome, nif FROM core_common.empresas
            `);
            console.log("Companies:", companiesRes.rows);
        }

    } catch(e) {
        console.error("Error executing query:", e);
    } finally {
        await client.end();
    }
}
run();
