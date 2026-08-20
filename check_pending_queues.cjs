const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkPendingQueues() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING ANY PENDING / STUCK QUEUES IN CRM ===`);
    const pendingRes = await client.query(`
      SELECT 
        campaign_id,
        status,
        count(*) as count
      FROM core_comercial.marketing_campaign_queue
      GROUP BY campaign_id, status;
    `);
    console.table(pendingRes.rows);

    const activeCampaigns = await client.query(`
      SELECT id, title, status, created_at, scheduled_at
      FROM core_comercial.marketing_campaigns
      WHERE status IN ('processing', 'scheduled');
    `);
    console.log(`Campanhas ativas/agendadas no sistema: ${activeCampaigns.rows.length}`);
    if (activeCampaigns.rows.length > 0) {
      console.table(activeCampaigns.rows);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkPendingQueues();
