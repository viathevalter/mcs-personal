const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT id, created_by, updated_by, created_at, updated_at
            FROM core_common.client_worker_tariffs
        `);

        console.log("Tariffs records audit info:");
        res.rows.forEach(r => console.log(` - ID: ${r.id}, created_by: ${r.created_by}, updated_by: ${r.updated_by}`));

        const profiles = await client.query(`
            SELECT id, email, full_name FROM public.profiles
        `);
        const profilesMap = new Map(profiles.rows.map(p => [p.id, p]));

        console.log("\nMatching profiles for created_by:");
        res.rows.forEach(r => {
            const p = profilesMap.get(r.created_by);
            console.log(` - Record ID: ${r.id}, created_by: ${r.created_by} -> Profile: ${p ? `${p.full_name} (${p.email})` : 'NOT FOUND'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
