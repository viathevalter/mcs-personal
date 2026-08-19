const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkClicksAndInteractions() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING INTERACTIONS TODAY ===`);
    const recentMoved = await client.query(`
      SELECT id, name, company_name, email, phone, stage_id, notes, updated_at
      FROM core_comercial.leads
      WHERE updated_at > '2026-08-19 10:00:00' AND stage_id != (SELECT id FROM core_comercial.kanban_stages WHERE order_index = 2 LIMIT 1)
      LIMIT 10;
    `);
    console.table(recentMoved.rows);

    const queueStats = await client.query(`
      SELECT 
        status, 
        count(*) as total,
        count(*) FILTER (WHERE error_message IS NOT NULL) as with_error
      FROM core_comercial.marketing_campaign_queue
      WHERE campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4'
      GROUP BY status;
    `);
    console.table(queueStats.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkClicksAndInteractions();
