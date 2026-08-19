const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkCampaignsToday() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== 1. CAMPANHAS DE MARKETING RECENTES EM PROD ===`);
    const campaigns = await client.query(`
      SELECT * FROM core_comercial.marketing_campaigns ORDER BY created_at DESC LIMIT 10;
    `);
    console.table(campaigns.rows.map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      created_at: c.created_at,
      scheduled_at: c.scheduled_at,
      sent_at: c.sent_at
    })));

    console.log(`\n=== 2. STATUS DA FILA (marketing_campaign_queue) ===`);
    const queueStats = await client.query(`
      SELECT 
        c.title as campaign_title,
        q.status,
        count(*) as total_items,
        count(*) FILTER (WHERE q.resend_email_id IS NOT NULL) as with_resend_id,
        min(q.sent_at) as first_sent,
        max(q.sent_at) as last_sent
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.marketing_campaigns c ON q.campaign_id = c.id
      GROUP BY c.title, q.status
      ORDER BY c.title, q.status;
    `);
    console.table(queueStats.rows);

    console.log(`\n=== 3. DISPAROS REALIZADOS HOJE (19/08/2026) ===`);
    const todayDispatches = await client.query(`
      SELECT 
        count(*) as total_dispatched_today,
        count(*) FILTER (WHERE status = 'sent') as sent_today,
        count(*) FILTER (WHERE status = 'failed') as failed_today,
        count(*) FILTER (WHERE status = 'pending') as pending_today
      FROM core_comercial.marketing_campaign_queue
      WHERE sent_at >= '2026-08-19 00:00:00' OR (status = 'pending' AND created_at >= '2026-08-19 00:00:00');
    `);
    console.table(todayDispatches.rows);

    console.log(`\n=== 4. RESUMO DOS LEADS NO KANBAN ===`);
    const kanban = await client.query(`
      SELECT s.title, s.order_index, count(l.id) as total_leads
      FROM core_comercial.kanban_stages s
      LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
      GROUP BY s.title, s.order_index
      ORDER BY s.order_index ASC;
    `);
    console.table(kanban.rows);

    console.log(`\n=== 5. ÚLTIMOS ENVIOS COM RESEND ID ===`);
    const recentSent = await client.query(`
      SELECT 
        q.id, l.company_name, l.email, q.status, q.sent_at, q.resend_email_id, q.error_message
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.leads l ON q.lead_id = l.id
      WHERE q.sent_at IS NOT NULL
      ORDER BY q.sent_at DESC
      LIMIT 8;
    `);
    console.table(recentSent.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkCampaignsToday();
