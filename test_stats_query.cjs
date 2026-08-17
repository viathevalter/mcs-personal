const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    const res = await client.query(`
      SELECT 
        c.id as campaign_id,
        COUNT(q.id) as total,
        COUNT(q.id) FILTER (WHERE q.status = 'sent') as sent,
        COUNT(q.id) FILTER (WHERE q.status = 'pending') as pending,
        COUNT(q.id) FILTER (WHERE q.status = 'failed') as failed
      FROM core_comercial.marketing_campaigns c
      LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
      GROUP BY c.id;
    `);

    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
