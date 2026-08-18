const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function deduplicate(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n================ [${name}] DEDUPLICATING LEADS ================`);

    // 1. Check before counts
    const beforeRes = await client.query(`SELECT count(*) as total, count(DISTINCT LOWER(TRIM(email))) as unique_emails FROM core_comercial.leads;`);
    console.log(`[${name}] BEFORE: ${beforeRes.rows[0].total} total rows, ${beforeRes.rows[0].unique_emails} unique emails.`);

    // 2. Delete queue references pointing to duplicate leads
    console.log(`[${name}] Cleaning queue references to keep only the primary lead id for each email...`);
    await client.query(`
      WITH primary_leads AS (
        SELECT DISTINCT ON (LOWER(TRIM(email))) id, LOWER(TRIM(email)) as email
        FROM core_comercial.leads
        ORDER BY LOWER(TRIM(email)), created_at ASC
      ),
      duplicate_leads AS (
        SELECT l.id, p.id as primary_id
        FROM core_comercial.leads l
        JOIN primary_leads p ON LOWER(TRIM(l.email)) = p.email AND l.id != p.id
      )
      DELETE FROM core_comercial.marketing_campaign_queue
      WHERE lead_id IN (SELECT id FROM duplicate_leads);
    `);

    // 3. Delete duplicate leads from core_comercial.leads keeping the oldest/primary id
    console.log(`[${name}] Deleting duplicate leads...`);
    const delRes = await client.query(`
      DELETE FROM core_comercial.leads
      WHERE id NOT IN (
        SELECT DISTINCT ON (LOWER(TRIM(email))) id
        FROM core_comercial.leads
        WHERE email IS NOT NULL AND email != ''
        ORDER BY LOWER(TRIM(email)), created_at ASC
      );
    `);
    console.log(`[${name}] Deleted ${delRes.rowCount} duplicate lead rows.`);

    // 4. Create Unique Index to PREVENT ANY DUPLICATE FOREVER
    console.log(`[${name}] Creating UNIQUE INDEX on email...`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_email_lower 
      ON core_comercial.leads (LOWER(TRIM(email))) 
      WHERE email IS NOT NULL AND email != '';
    `);

    // 5. Check after counts
    const afterRes = await client.query(`SELECT count(*) as total, count(DISTINCT LOWER(TRIM(email))) as unique_emails FROM core_comercial.leads;`);
    console.log(`[${name}] AFTER: ${afterRes.rows[0].total} total rows, ${afterRes.rows[0].unique_emails} unique emails.`);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await deduplicate('PROD', prodConnectionString);
  await deduplicate('DEV', devConnectionString);
}

run();
