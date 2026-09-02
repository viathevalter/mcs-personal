const { Client } = require('pg');

const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function syncTemplatesAndCamp() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });
  await clientDev.connect();
  await clientProd.connect();

  const prodMktTemplates = await clientProd.query(`SELECT * FROM core_comercial.marketing_templates;`).catch(() => ({ rows: [] }));
  console.log(`Found ${prodMktTemplates.rows.length} marketing_templates in PROD.`);

  for (const t of prodMktTemplates.rows) {
    await clientDev.query(`
      INSERT INTO core_comercial.marketing_templates (id, empresa_id, name, subject, body_html, target_segment, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        target_segment = EXCLUDED.target_segment,
        updated_at = EXCLUDED.updated_at;
    `, [t.id, t.empresa_id, t.name, t.subject, t.body_html, t.target_segment, t.created_at, t.updated_at]);
  }
  console.log(`✅ Synced marketing_templates into DEV.`);

  await clientDev.end();
  await clientProd.end();
}

syncTemplatesAndCamp().catch(console.error);
