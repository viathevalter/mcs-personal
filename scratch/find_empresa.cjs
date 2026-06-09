const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Finding a valid empresa_id from core_common.clients...");
        const clientRes = await client.query('SELECT empresa_id, id FROM core_common.clients LIMIT 3;');
        console.log("Clients:", clientRes.rows);

        const empresaRes = await client.query('SELECT id, name FROM core_common.empresas LIMIT 3;');
        console.log("Empresas:", empresaRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
