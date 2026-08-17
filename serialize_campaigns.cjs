const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CURRENT CAMPAIGNS IN PROD ===`);
    const campaigns = await client.query(`
      SELECT 
        c.id, c.title, c.status, c.scheduled_at,
        COUNT(q.id) as total,
        COUNT(q.id) FILTER (WHERE q.status = 'sent') as sent,
        COUNT(q.id) FILTER (WHERE q.status = 'pending') as pending
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
      GROUP BY c.id, c.title, c.status, c.scheduled_at
      ORDER BY c.created_at DESC;
    `);
    console.table(campaigns.rows);

    // If ESTRUCTURA METALICA is in 'sending', set it to 'scheduled' so it waits for CONSTRUCCIÓN
    const res = await client.query(`
      UPDATE core_comercial.marketing_campaigns
      SET status = 'scheduled'
      WHERE title = 'ESTRUCTURA METALICA' AND status = 'sending';
    `);
    if (res.rowCount > 0) {
      console.log(`Adjusted 'ESTRUCTURA METALICA' back to 'scheduled' so it waits in line.`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
