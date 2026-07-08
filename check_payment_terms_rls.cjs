const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to DEV database");

    const res = await client.query(`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'payment_terms' AND schemaname = 'core_common'
    `);
    console.log("RLS Policies on core_common.payment_terms:");
    for (const row of res.rows) {
      console.log(`- Policy: ${row.policyname}`);
      console.log(`  * CMD: ${row.cmd}`);
      console.log(`  * QUAL (USING): ${row.qual}`);
      console.log(`  * WITH CHECK: ${row.with_check}`);
    }

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
