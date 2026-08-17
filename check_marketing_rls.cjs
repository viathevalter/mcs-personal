const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== RLS POLICIES ON marketing_campaign_queue ===`);
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'core_comercial' AND tablename IN ('marketing_campaign_queue', 'marketing_campaigns', 'marketing_templates');
    `);
    console.table(policies.rows);

    const rlsEnabled = await client.query(`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'core_comercial' AND tablename IN ('marketing_campaign_queue', 'marketing_campaigns', 'marketing_templates');
    `);
    console.table(rlsEnabled.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
