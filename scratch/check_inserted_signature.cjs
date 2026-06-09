const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, document_url, contract_document_url, signature_token, status, otp_code
            FROM core_comercial.proposal_signatures
            WHERE signature_token = '36b17821-3027-49e2-8ca3-1d4a88875e61';
        `);
        console.log("Inserted Proposal Signature Record:");
        console.log(res.rows[0]);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
