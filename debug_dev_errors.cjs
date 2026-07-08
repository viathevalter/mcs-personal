const { createClient } = require('@supabase/supabase-js');

const devSupabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
// We can use the service role key or anon key to query. Since we want to test as an authenticated user, let's connect using pg to see database errors directly!
const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to DEV database");

    console.log("\n--- Testing Clients Query via SQL ---");
    try {
      const res = await client.query(`
        SELECT c.*, 
               json_agg(s.*) as settings
        FROM core_common.clients c
        LEFT JOIN core_common.client_company_settings s ON s.client_id = c.id
        GROUP BY c.id
        LIMIT 2
      `);
      console.log("SQL Clients query success, rows fetched:", res.rows.length);
      if (res.rows.length > 0) {
        console.log("Sample client:", JSON.stringify(res.rows[0], null, 2));
      }
    } catch (e) {
      console.error("SQL Clients query failed:", e.message);
    }

    console.log("\n--- Checking RLS policies on client_company_settings ---");
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'client_company_settings' OR tablename = 'clients'
    `);
    for (const row of policies.rows) {
      console.log(`- ${row.schemaname}.${row.tablename} -> Policy: ${row.policyname} (${row.cmd})`);
    }

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
