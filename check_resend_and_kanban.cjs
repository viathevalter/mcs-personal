const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING LEADS STAGE_ID DISTRIBUTION IN PROD ===`);
    const res = await client.query(`
      SELECT 
        l.stage_id,
        s.name as stage_name,
        s.order_index,
        count(*) as lead_count
      FROM core_comercial.leads l
      LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
      GROUP BY l.stage_id, s.name, s.order_index
      ORDER BY s.order_index NULLS LAST, lead_count DESC;
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log(`\n=== CHECKING ALL CAMPAIGNS IN PROD ===`);
    const campaigns = await client.query(`
      SELECT 
        c.id, c.title, c.status, c.scheduled_at,
        count(q.id) as total_leads,
        count(q.id) FILTER (WHERE q.status = 'sent') as sent,
        count(q.id) FILTER (WHERE q.status = 'pending') as pending,
        count(q.id) FILTER (WHERE q.status = 'failed') as failed
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
      GROUP BY c.id, c.title, c.status, c.scheduled_at
      ORDER BY c.created_at DESC;
    `);
    console.table(campaigns.rows);

    // Get Resend API Key from integrations / core_common
    const resendRes = await client.query(`
      SELECT resend_api_key, marketing_sender_email, trade_name 
      FROM core_common.empresas 
      WHERE resend_api_key IS NOT NULL AND resend_api_key != '' 
      LIMIT 1;
    `);
    const resendApiKey = resendRes.rows[0]?.resend_api_key;
    console.log(`\nResend sender:`, resendRes.rows[0]?.marketing_sender_email);

    if (resendApiKey) {
      console.log(`\n=== CHECKING RECENT RESEND EMAILS VIA RESEND API ===`);
      const apiRes = await fetch("https://api.resend.com/emails", {
        headers: { "Authorization": `Bearer ${resendApiKey}` }
      });
      const data = await apiRes.json();
      if (data && data.data) {
        console.log(`Fetched ${data.data.length} recent emails from Resend.`);
        // check status, last_event, etc.
        const summary = data.data.slice(0, 15).map(e => ({
          id: e.id,
          to: e.to,
          subject: e.subject,
          created_at: e.created_at,
          last_event: e.last_event
        }));
        console.table(summary);

        // Count events in the batch
        const eventCounts = {};
        data.data.forEach(e => {
          const ev = e.last_event || 'unknown';
          eventCounts[ev] = (eventCounts[ev] || 0) + 1;
        });
        console.log("Resend event counts in sample:", eventCounts);
      } else {
        console.log("Resend API response:", data);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
