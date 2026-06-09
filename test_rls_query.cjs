const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        await client.query('BEGIN');
        
        // Simulate Walter's authentication context
        const walterId = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb';
        console.log(`Setting request.jwt.claim.sub to ${walterId}`);
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [walterId]);
        await client.query(`SELECT set_config('role', 'authenticated', true)`);

        console.log("\n=== Testing workers query under Walter's RLS context ===");
        const selectedEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const queryText = `
            SELECT id, nome, nif, status_trabajador 
            FROM core_personal.workers
            WHERE empresa_id = $1
              AND (status_trabajador IS NULL OR status_trabajador NOT IN ('Ativo', 'Activo', 'ATIVO', 'ACTIVO'))
        `;
        const res = await client.query(queryText, [selectedEmpresaId]);
        console.log("Found workers count:", res.rows.length);
        console.log("Sample workers:", res.rows.slice(0, 3));

        await client.query('COMMIT');
    } catch (e) {
        console.error("ERROR:", e);
        await client.query('ROLLBACK');
    } finally {
        await client.end();
    }
}
run();
