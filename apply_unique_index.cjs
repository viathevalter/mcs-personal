const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function applyUniqueIndex(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n================ [${name}] CREATING UNIQUE CONSTRAINT ================`);

    // Clean any duplicates in DEV if any
    await client.query(`
      DELETE FROM core_comercial.leads
      WHERE ctid NOT IN (
        SELECT min(ctid)
        FROM core_comercial.leads
        WHERE email IS NOT NULL AND email != ''
        GROUP BY LOWER(TRIM(email))
      );
    `);

    // Create Unique Index
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_email_lower 
      ON core_comercial.leads (LOWER(TRIM(email))) 
      WHERE email IS NOT NULL AND email != '';
    `);

    const stats = await client.query(`
      SELECT count(*) as total_leads, count(DISTINCT LOWER(TRIM(email))) as unique_emails 
      FROM core_comercial.leads;
    `);
    console.log(`[${name}] TOTAL LEADS: ${stats.rows[0].total_leads} | UNIQUE EMAILS: ${stats.rows[0].unique_emails}`);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await applyUniqueIndex('PROD', prodConnectionString);
  await applyUniqueIndex('DEV', devConnectionString);
}

run();
