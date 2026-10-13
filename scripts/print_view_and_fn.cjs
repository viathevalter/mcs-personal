const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const viewDef = await client.query(`
    SELECT pg_get_viewdef('core_personal.vw_worker_allocations'::regclass, true) as def
  `);
  console.log("=== VIEW core_personal.vw_worker_allocations ===");
  console.log(viewDef.rows[0]?.def);

  const fnDef = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_get_active_client_for_worker'
  `);
  console.log("\n=== FUNCTION public.fn_get_active_client_for_worker ===");
  console.log(fnDef.rows[0]?.def);

  await client.end();
}
run().catch(console.error);
