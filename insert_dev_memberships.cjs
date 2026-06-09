const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const missingEmpresas = [
    '441f1f5d-aed3-40e3-8c77-7b1217757251',
    'dae64d51-2181-4510-b14f-e63d2f111a8e',
    'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
    'a798620a-358a-4c6c-9db2-3a507c583cac'
];

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Inserting memberships for Walter in DEV...");
        for (const empresaId of missingEmpresas) {
            const check = await client.query(`
                SELECT 1 FROM core_common.user_memberships 
                WHERE user_id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680' AND empresa_id = $1;
            `, [empresaId]);

            if (check.rows.length === 0) {
                await client.query(`
                    INSERT INTO core_common.user_memberships (user_id, empresa_id, role, is_active)
                    VALUES ('ee4320ae-2d42-419e-a4a1-6f30f41d3680', $1, 'admin', true);
                `, [empresaId]);
                console.log(`Inserted membership for empresa_id: ${empresaId}`);
            } else {
                console.log(`Membership already exists for empresa_id: ${empresaId}`);
            }
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
