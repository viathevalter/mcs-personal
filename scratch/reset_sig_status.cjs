const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query(`
            UPDATE core_comercial.proposal_signatures
            SET status = 'pending_signature', signed_at = null, otp_code = '491190', otp_expires_at = NOW() + interval '2 days'
            WHERE signature_token = '36b17821-3027-49e2-8ca3-1d4a88875e61'
            RETURNING id;
        `);
        console.log("Reset rows:", res.rowCount);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
