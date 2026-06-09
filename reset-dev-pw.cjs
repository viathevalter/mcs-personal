const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to dev DB.");
        const res = await client.query(`
            UPDATE auth.users 
            SET encrypted_password = extensions.crypt('vitor@2004', extensions.gen_salt('bf'))
            WHERE email = 'valter@gestaologinpro.com'
            RETURNING id
        `);
        console.log("Updated rows:", res.rowCount);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
