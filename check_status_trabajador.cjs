const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const codes = ['E0324', 'E0027', 'E0190', 'E0200', 'E1615', 'E1687', 'E1698'];
        const resWorkers = await client.query(`
            SELECT id, nome, cod_colab, status_trabajador 
            FROM core_personal.workers 
            WHERE cod_colab = ANY($1)
        `, [codes]);

        console.log("Workers status_trabajador values:");
        resWorkers.rows.forEach(w => {
            console.log(` - Worker: ${w.nome} (${w.cod_colab}) -> Status: '${w.status_trabajador}'`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
