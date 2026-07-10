const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        // Get Valter's active company ID for STO - Stocco
        const resEmp = await client.query("SELECT id, codigo, nome FROM core_common.empresas WHERE codigo = 'STO'");
        console.log("Company STO:", resEmp.rows[0]);
        const stoId = resEmp.rows[0].id;

        // Find the workers in core_personal.workers matching our codes
        const codes = ['E0324', 'E0027', 'E0190', 'E0200', 'E1615', 'E1687', 'E1698'];
        const resWorkers = await client.query(`
            SELECT id, nome, cod_colab 
            FROM core_personal.workers 
            WHERE cod_colab = ANY($1)
        `, [codes]);
        console.log(`Found ${resWorkers.rows.length} workers in database.`);

        for (const w of resWorkers.rows) {
            const resContracts = await client.query(`
                SELECT id, empresa_id, worker_id, status 
                FROM core_personal.contracts 
                WHERE worker_id = $1
            `, [w.id]);
            console.log(`Worker: ${w.nome} (${w.cod_colab})`);
            if (resContracts.rows.length === 0) {
                console.log(" - No contracts found!");
            } else {
                for (const c of resContracts.rows) {
                    const resCName = await client.query("SELECT codigo, nome FROM core_common.empresas WHERE id = $1", [c.empresa_id]);
                    const compCode = resCName.rows.length > 0 ? resCName.rows[0].codigo : 'Unknown';
                    console.log(` - Contract: ID ${c.id}, Company: ${compCode} (${c.empresa_id}), Status: ${c.status}`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
