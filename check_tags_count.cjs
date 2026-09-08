const { Client } = require('pg');
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function check() {
  const client = new Client({ connectionString: prodConn });
  await client.connect();

  const r1 = await client.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Mailing Alex 02-09%';");
  console.log("Leads with tag 'Mailing Alex 02-09':", r1.rows[0].count);

  const r2 = await client.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Mailing Alex%';");
  console.log("Leads with tag 'Mailing Alex':", r2.rows[0].count);

  const r3 = await client.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Alex Carmona%';");
  console.log("Leads with tag 'Alex Carmona':", r3.rows[0].count);

  const r4 = await client.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Alex Stocco%';");
  console.log("Leads with tag 'Alex Stocco':", r4.rows[0].count);

  await client.end();
}
check();
