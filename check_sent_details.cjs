const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING QUEUE SAMPLES IN PROD ===`);
    const res = await client.query(`
      SELECT 
        q.id,
        c.title as campaign_name,
        l.name as lead_name,
        l.email as lead_email,
        q.status,
        q.sent_at,
        q.resend_email_id,
        q.error_message
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.marketing_campaigns c ON c.id = q.campaign_id
      JOIN core_comercial.leads l ON l.id = q.lead_id
      WHERE q.status = 'sent'
      ORDER BY q.sent_at DESC
      LIMIT 10;
    `);
    console.table(res.rows);

    const totalStats = await client.query(`
      SELECT 
        count(*) as total_sent_in_queue,
        count(resend_email_id) as total_with_resend_id,
        min(sent_at) as first_sent_at,
        max(sent_at) as last_sent_at
      FROM core_comercial.marketing_campaign_queue
      WHERE status = 'sent';
    `);
    console.table(totalStats.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
