const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== TESTING is_member FOR VALTER & STOCCO ===");
        const res = await client.query(`
            SELECT core_common.is_member('441f1f5d-aed3-40e3-8c77-7b1217757251') 
            FROM (SELECT 'ee4320ae-2d42-419e-a4a1-6f30f41d3680'::uuid as id) u
        `);
        console.log(res.rows);

        console.log("=== TESTING RLS AS VALTER FOR STOCCO TASKS ===");
        // Let's set request.jwt.claims parameters to simulate auth.uid()
        await client.query("BEGIN;");
        await client.query("SET LOCAL request.jwt.claim.sub = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';");
        await client.query("SET LOCAL role = 'authenticated';");
        const rlsRes = await client.query(`
            SELECT id, title, status FROM core_operacoes.solicitud_tareas WHERE empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
        `);
        console.log(rlsRes.rows);
        await client.query("ROLLBACK;");

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
