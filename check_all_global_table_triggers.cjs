const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: devConnectionString });
  try {
    await client.connect();
    console.log("Connected to DEV database");

    const targets = [
      { schema: 'core_personal', table: 'workers' },
      { schema: 'core_comercial', table: 'job_functions' },
      { schema: 'core_logistica', table: 'epis' }
    ];

    for (const target of targets) {
      const res = await client.query(`
        SELECT 
          trg.tgname AS trigger_name,
          ns.nspname AS function_schema,
          p.proname AS function_name,
          pg_get_functiondef(p.oid) AS function_definition
        FROM pg_trigger trg
        JOIN pg_class cl ON trg.tgrelid = cl.oid
        JOIN pg_namespace n ON cl.relnamespace = n.oid
        JOIN pg_proc p ON trg.tgfoid = p.oid
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE n.nspname = $1 AND cl.relname = $2
      `, [target.schema, target.table]);
      console.log(`\n======================================================`);
      console.log(`Triggers on ${target.schema}.${target.table}:`);
      for (const row of res.rows) {
        console.log(`- Trigger: ${row.trigger_name} calls ${row.function_schema}.${row.function_name}`);
      }
    }

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
