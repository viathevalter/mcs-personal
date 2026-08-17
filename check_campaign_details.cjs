const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== DETAILED STATUS OF ALL CAMPAIGNS IN PROD ===`);
    const campaigns = await client.query(`
      SELECT 
        c.id,
        c.title,
        c.status,
        c.scheduled_at,
        c.created_at,
        e.trade_name as empresa,
        e.marketing_sender_email,
        e.proposal_sender_email,
        t.title as template_name,
        t.subject as template_subject,
        COUNT(q.id) as total_leads,
        COUNT(q.id) FILTER (WHERE q.status = 'sent') as sent,
        COUNT(q.id) FILTER (WHERE q.status = 'pending') as pending,
        COUNT(q.id) FILTER (WHERE q.status = 'failed') as failed
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_common.empresas e ON e.id = c.empresa_id
      LEFT JOIN core_comercial.marketing_templates t ON t.id = c.template_id
      LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
      GROUP BY c.id, c.title, c.status, c.scheduled_at, c.created_at, e.trade_name, e.marketing_sender_email, e.proposal_sender_email, t.title, t.subject
      ORDER BY c.created_at DESC;
    `);
    console.table(campaigns.rows);

    // Let's check first and last sent times for CALDERERÍA
    const sendTimes = await client.query(`
      SELECT 
        MIN(sent_at) as first_sent_at,
        MAX(sent_at) as last_sent_at,
        COUNT(*) as total_sent
      FROM core_comercial.marketing_campaign_queue
      WHERE campaign_id = '435f9526-bcbc-4891-ba95-ee3b28ec579e' AND status = 'sent';
    `);
    console.log(`\n=== CALDERERÍA SENDING ACTIVITY ===`);
    console.table(sendTimes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
