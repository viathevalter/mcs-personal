const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== PROD CAMPAIGNS FULL LIST ===`);
    const campaigns = await client.query(`
      SELECT c.id, c.title, c.status, c.scheduled_at, c.created_at, c.updated_at,
             e.trade_name as empresa, t.title as template_title, t.subject
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_common.empresas e ON e.id = c.empresa_id
      LEFT JOIN core_comercial.marketing_templates t ON t.id = c.template_id
      ORDER BY c.created_at DESC;
    `);
    console.table(campaigns.rows);

    console.log(`\n=== PROD QUEUE STATS PER CAMPAIGN ===`);
    const queueStats = await client.query(`
      SELECT c.id as campaign_id, c.title, c.status as campaign_status, c.scheduled_at,
             COUNT(*) FILTER (WHERE q.status = 'sent') as sent,
             COUNT(*) FILTER (WHERE q.status = 'pending') as pending,
             COUNT(*) FILTER (WHERE q.status = 'failed') as failed,
             COUNT(*) as total
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
      GROUP BY c.id, c.title, c.status, c.scheduled_at
      ORDER BY c.created_at DESC;
    `);
    console.table(queueStats.rows);

    console.log(`\n=== FAILED ERROR BREAKDOWN ===`);
    const failedBreakdown = await client.query(`
      SELECT c.title, q.error_message, count(*) as qty
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.marketing_campaigns c ON c.id = q.campaign_id
      WHERE q.status = 'failed'
      GROUP BY c.title, q.error_message
      ORDER BY qty DESC;
    `);
    console.table(failedBreakdown.rows);

    console.log(`\n=== LAST 10 SENT EMAILS INFO ===`);
    const sentSample = await client.query(`
      SELECT q.id, c.title as campaign, l.email, q.sent_at, q.resend_email_id
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.marketing_campaigns c ON c.id = q.campaign_id
      LEFT JOIN core_comercial.leads l ON l.id = q.lead_id
      WHERE q.status = 'sent'
      ORDER BY q.sent_at DESC
      LIMIT 10;
    `);
    console.table(sentSample.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
