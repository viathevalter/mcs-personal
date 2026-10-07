import pg from 'pg';
const { Client } = pg;

async function inspectLatestDoc() {
    const client = new Client({
        connectionString: 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
    });
    await client.connect();

    const res = await client.query(`
        SELECT id, title, document_url, template_id, target_type, created_at
        FROM public.generated_documents
        ORDER BY created_at DESC
        LIMIT 3;
    `);

    console.log("Latest Generated Documents:\n", JSON.stringify(res.rows, null, 2));

    const templates = await client.query(`
        SELECT id, name, file_url
        FROM public.document_templates
        ORDER BY created_at DESC
        LIMIT 3;
    `);
    console.log("Latest Templates:\n", JSON.stringify(templates.rows, null, 2));

    await client.end();
}

inspectLatestDoc().catch(console.error);
