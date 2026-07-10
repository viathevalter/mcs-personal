const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const valterId = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680'; // Valter's user ID

        const resMemb = await client.query(`
            SELECT m.id, m.empresa_id, m.role, e.codigo, e.nome 
            FROM core_common.user_memberships m
            JOIN core_common.empresas e ON m.empresa_id = e.id
            WHERE m.user_id = $1
        `, [valterId]);

        console.log("Valter's user memberships in DEV:");
        resMemb.rows.forEach(r => {
            console.log(` - Company: ${r.codigo} - ${r.nome} (ID: ${r.empresa_id}), Role: ${r.role}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
