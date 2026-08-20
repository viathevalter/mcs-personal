const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkQueueEntries() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING ENVÍO 1 RESEND EMAIL IDS ===`);
    const res = await client.query(`
      SELECT 
        id, lead_id, status, resend_email_id, sent_at, error_message
      FROM core_comercial.marketing_campaign_queue
      WHERE campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4'
      ORDER BY sent_at DESC
      LIMIT 10;
    `);
    console.table(res.rows);

    const errorCount = await client.query(`
      SELECT error_message, count(*) as count
      FROM core_comercial.marketing_campaign_queue
      WHERE campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4' AND error_message IS NOT NULL
      GROUP BY error_message;
    `);
    console.log("Error messages in ENVÍO 1:");
    console.table(errorCount.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkQueueEntries();
