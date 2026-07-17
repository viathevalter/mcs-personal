const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_operacoes' AND table_name = 'mcs_users'
        `);

        console.log("Columns of core_operacoes.mcs_users:");
        res.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));

        const count = await client.query(`
            SELECT count(*) FROM core_operacoes.mcs_users
        `);
        console.log("Count of records in core_operacoes.mcs_users:", count.rows[0].count);

        if (count.rows[0].count > 0) {
            const sample = await client.query(`
                SELECT * FROM core_operacoes.mcs_users LIMIT 3
            `);
            console.log("Sample records:", sample.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
