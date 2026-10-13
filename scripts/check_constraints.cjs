const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const res = await client.query(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type,
           string_agg(kcu.column_name, ', ') as cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name IN ('client_tariffs', 'client_worker_tariffs', 'worker_compliance_status', 'client_company_settings')
      AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
  `);
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
