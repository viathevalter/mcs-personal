const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const empId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco company ID

        // Call search_workers and output keys of the first row
        const res = await client.query(`
            SELECT * 
            FROM core_personal.search_workers(
                p_empresa_id => $1,
                p_page => 1,
                p_page_size => 1,
                p_sort_column => 'nome',
                p_sort_direction => 'asc'
            )
        `, [empId]);

        if (res.rows.length > 0) {
            console.log("Worker properties:", Object.keys(res.rows[0]));
            console.log("Worker sample values:", res.rows[0]);
        } else {
            console.log("No workers found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
