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

        const empresaId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; // GRP - Login Pro (from user's screenshot)

        console.log("1. Querying clients as Valter...");
        // This is the direct SQL query corresponding to the Supabase select join:
        try {
            const resClients = await client.query(`
                SELECT c.*,
                       (
                         SELECT json_agg(json_build_object(
                           'empresa_id', s.empresa_id,
                           'payment_term_id', s.payment_term_id,
                           'status', s.status,
                           'credit_limit', s.credit_limit
                         ))
                         FROM core_common.client_company_settings s
                         WHERE s.client_id = c.id
                       ) as client_company_settings
                FROM core_common.clients c
            `);
            console.log(`Clients rows: ${resClients.rows.length}`);
            if (resClients.rows.length > 0) {
                console.log("Sample client trade name:", resClients.rows[0].trade_name);
                console.log("Sample settings:", resClients.rows[0].client_company_settings);
            }
        } catch (err) {
            console.error("Clients query failed:", err.message);
        }

        console.log("\n2. Calling get_real_seguridade_status RPC as Valter...");
        try {
            const resSeg = await client.query(`
                SELECT core_personal.get_real_seguridade_status($1) as data
            `, [empresaId]);
            console.log("Seguridade status success!");
            console.log("Result length:", JSON.stringify(resSeg.rows[0].data).length);
        } catch (err) {
            console.error("Seguridade RPC failed:", err.message);
        }

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
