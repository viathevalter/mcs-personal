const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== KANBAN STAGES IN PROD ===`);
    const stages = await client.query(`
      SELECT id, empresa_id, name, order_index, color
      FROM core_comercial.kanban_stages
      ORDER BY empresa_id, order_index;
    `);
    console.table(stages.rows);

    console.log(`\n=== LEADS COUNT PER STAGE IN PROD ===`);
    const leadStats = await client.query(`
      SELECT s.name as stage_name, s.order_index, count(l.id) as total_leads
      FROM core_comercial.leads l
      LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
      GROUP BY s.name, s.order_index
      ORDER BY s.order_index NULLS LAST;
    `);
    console.table(leadStats.rows);

    console.log(`\n=== ACTUAL SENT EMAILS COUNT IN QUEUE ===`);
    const queueSent = await client.query(`
      SELECT count(DISTINCT lead_id) as actual_leads_with_sent_email, count(*) as total_sent_queue_entries
      FROM core_comercial.marketing_campaign_queue
      WHERE status = 'sent';
    `);
    console.table(queueSent.rows);

    console.log(`\n=== LEADS WITH 'E-mail Enviado' STAGE BUT NO SENT QUEUE ENTRY ===`);
    const mismatch = await client.query(`
      SELECT count(*) as count
      FROM core_comercial.leads l
      WHERE l.stage_id IN (SELECT id FROM core_comercial.kanban_stages WHERE name ILIKE '%Enviado%')
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.marketing_campaign_queue q
          WHERE q.lead_id = l.id AND q.status = 'sent'
        );
    `);
    console.table(mismatch.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
