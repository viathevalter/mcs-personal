const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDb(envName, connStr) {
  console.log(`\n========================================`);
  console.log(`=== ENVIRONMENT: ${envName} ===`);
  console.log(`========================================`);

  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();

    // 1. Columns of marketing_campaigns
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core_comercial' AND table_name = 'marketing_campaigns'
      ORDER BY ordinal_position;
    `);
    console.log(`\n--- COLUMNS in marketing_campaigns ---`);
    console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    // 2. Marketing Campaigns
    console.log(`\n--- MARKETING CAMPAIGNS (All) ---`);
    const resCampaigns = await client.query(`
      SELECT *
      FROM core_comercial.marketing_campaigns
      ORDER BY created_at DESC;
    `);
    console.table(resCampaigns.rows);

    // 3. Marketing Campaign Queue Summary
    console.log(`\n--- QUEUE STATUS SUMMARY ---`);
    const resQueueSummary = await client.query(`
      SELECT campaign_id, status, count(*) as count
      FROM core_comercial.marketing_campaign_queue
      GROUP BY campaign_id, status
      ORDER BY campaign_id, status;
    `);
    console.table(resQueueSummary.rows);

    // 4. Latest Queue Items (Sent/Failed/Pending)
    console.log(`\n--- LATEST QUEUE ITEMS (Recent 20) ---`);
    const resRecentQueue = await client.query(`
      SELECT q.id, q.campaign_id, q.status, q.sent_at, q.error_message, q.resend_email_id,
             l.name, l.email, l.company_name
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.leads l ON l.id = q.lead_id
      ORDER BY q.created_at DESC NULLS LAST, q.id DESC
      LIMIT 20;
    `);
    console.table(resRecentQueue.rows);

    // 5. Check if there are any failed items with error messages
    const resFailed = await client.query(`
      SELECT q.id, q.campaign_id, q.status, q.error_message, l.email
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.leads l ON l.id = q.lead_id
      WHERE q.status = 'failed'
      ORDER BY q.id DESC
      LIMIT 10;
    `);
    if (resFailed.rows.length > 0) {
      console.log(`\n--- FAILED QUEUE ITEMS SAMPLE ---`);
      console.table(resFailed.rows);
    } else {
      console.log(`\n--- NO FAILED ITEMS FOUND ---`);
    }

  } catch (err) {
    console.error(`Error connecting to ${envName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await checkDb('PROD', prodConnectionString);
  await checkDb('DEV', devConnectionString);
}

run();
