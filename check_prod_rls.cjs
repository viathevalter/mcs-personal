const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();
    console.log("Connected to PROD DB");

    // Check if RLS is enabled
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'core_common' AND c.relname = 'clients'
    `);
    console.log("Clients table RLS status:", rlsRes.rows[0]);

    // Check active policies
    const res = await client.query(`
      SELECT policyname, cmd, qual, with_check, roles
      FROM pg_policies
      WHERE tablename = 'clients' AND schemaname = 'core_common'
    `);
    console.log("RLS Policies on PROD core_common.clients:");
    for (const row of res.rows) {
      console.log(`- Policy: ${row.policyname}`);
      console.log(`  * CMD: ${row.cmd}`);
      console.log(`  * Roles: ${row.roles}`);
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
