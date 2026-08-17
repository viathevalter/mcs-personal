const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function fixKanbanStages(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n=== FIXING KANBAN STAGES FOR ${name} ===`);

    const updateQuery = `
      UPDATE core_comercial.leads l
      SET stage_id = COALESCE(
        (SELECT s.id FROM core_comercial.kanban_stages s WHERE s.empresa_id = l.empresa_id AND (s.order_index = 1 OR s.name ILIKE '%Novo%') ORDER BY s.order_index LIMIT 1),
        (SELECT s2.id FROM core_comercial.kanban_stages s2 WHERE (s2.order_index = 1 OR s2.name ILIKE '%Novo%') ORDER BY s2.order_index LIMIT 1)
      )
      WHERE (
        l.stage_id IN (SELECT s.id FROM core_comercial.kanban_stages s WHERE s.order_index = 2 OR s.name ILIKE '%Enviado%')
        OR l.stage_id IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM core_comercial.marketing_campaign_queue q
        WHERE q.lead_id = l.id AND q.status = 'sent'
      );
    `;

    const res = await client.query(updateQuery);
    console.log(`[${name}] Moved ${res.rowCount} unsent leads to 'Novo / Sem Contato'.`);

    // Check new distribution
    const dist = await client.query(`
      SELECT s.name as stage_name, s.order_index, count(l.id) as total_leads
      FROM core_comercial.leads l
      LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
      GROUP BY s.name, s.order_index
      ORDER BY s.order_index NULLS LAST;
    `);
    console.table(dist.rows);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await fixKanbanStages('PROD', prodConnectionString);
  await fixKanbanStages('DEV', devConnectionString);
}

run();
