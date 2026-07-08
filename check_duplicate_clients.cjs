const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
            SELECT LOWER(TRIM(c.trade_name)) as normalized_name, COUNT(*), string_agg(c.id::text, ', ') as ids, string_agg(e.nome, ', ') as companies
            FROM core_common.clients c
            LEFT JOIN core_common.empresas e ON e.id = c.empresa_id
            WHERE c.trade_name IS NOT NULL AND c.trade_name <> ''
            GROUP BY LOWER(TRIM(c.trade_name))
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 30
        `);

        console.log("Duplicate client names in database:");
        res.rows.forEach((r, i) => {
            console.log(`${i+1}. "${r.normalized_name}" - Count: ${r.count} - Companies: ${r.companies}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
