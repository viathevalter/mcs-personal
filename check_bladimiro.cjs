const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkWorker(dbName, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT *
            FROM core_personal.workers
            WHERE cod_colab = 'E0195' OR nome ILIKE '%BLADIMIRO%';
        `);
        console.log(`\nWorker BLADIMIRO in ${dbName}:`);
        console.log(res.rows);

        if (res.rows.length > 0) {
            const workerId = res.rows[0].id;
            const resIban = await client.query(`
                SELECT * FROM core_personal.worker_ibans WHERE worker_id = $1;
            `, [workerId]);
            console.log(`\nIBANs for BLADIMIRO in ${dbName}:`);
            console.log(resIban.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

async function run() {
    await checkWorker('DEV', devConnectionString);
    await checkWorker('PROD', prodConnectionString);
}

run();
