const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== FINAL SIGNATURE RECORD ===");
        const res = await client.query(`
            SELECT id, document_url, contract_document_url, status, signed_at 
            FROM core_comercial.proposal_signatures
            WHERE signature_token = '36b17821-3027-49e2-8ca3-1d4a88875e61';
        `);
        console.log(res.rows[0]);

        console.log("\n=== ESTIMACION STATUS ===");
        const res2 = await client.query(`
            SELECT id, codigo, status, current_version_id
            FROM core_comercial.estimaciones
            WHERE id = '14797205-bee6-4e1c-9379-f0064a8dfd18';
        `);
        console.log(res2.rows[0]);

        console.log("\n=== RECENT AUDIT LOGS ===");
        const res3 = await client.query(`
            SELECT * FROM core_comercial.proposal_audit_logs
            ORDER BY verified_at DESC
            LIMIT 1;
        `);
        console.log(res3.rows[0]);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
