const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres' });
    await client.connect();
    
    try {
        const res = await client.query(`
            SELECT id, codigo, status, empresa_id, document_language, custom_contract_url
            FROM core_comercial.estimaciones
            WHERE id = '46760e16-50c7-45be-ae5b-45154c2c474c'
        `);
        console.log("Estimation:", res.rows[0]);

        const sigRes = await client.query(`
            SELECT id, document_url, contract_document_url, status
            FROM core_comercial.proposal_signatures
            WHERE estimacion_id = '46760e16-50c7-45be-ae5b-45154c2c474c'
        `);
        console.log("Signatures:", sigRes.rows);

        const empresaRes = await client.query(`
            SELECT id, trade_name, legal_name
            FROM core_common.empresas
            WHERE id = $1
        `, [res.rows[0].empresa_id]);
        console.log("Empresa:", empresaRes.rows[0]);

    } finally {
        await client.end();
    }
}

run().catch(console.error);
