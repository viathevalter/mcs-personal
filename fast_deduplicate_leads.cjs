const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function deduplicateFast(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n================ [${name}] FAST DEDUPLICATION ================`);

    const beforeRes = await client.query(`SELECT count(*) as total, count(DISTINCT LOWER(TRIM(email))) as unique_emails FROM core_comercial.leads;`);
    console.log(`[${name}] BEFORE: ${beforeRes.rows[0].total} total rows, ${beforeRes.rows[0].unique_emails} unique emails.`);

    // 1. Create temporary table with duplicate IDs
    console.log(`[${name}] Identifying duplicate lead IDs...`);
    await client.query(`
      CREATE TEMP TABLE tmp_duplicate_leads ON COMMIT DROP AS
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at ASC, id ASC) as rn
        FROM core_comercial.leads
        WHERE email IS NOT NULL AND email != ''
      ) ranked
      WHERE ranked.rn > 1;

      CREATE INDEX ON tmp_duplicate_leads (id);
    `);

    // 2. Remove references in marketing_campaign_queue
    console.log(`[${name}] Removing queue records pointing to duplicate lead IDs...`);
    const qDel = await client.query(`
      DELETE FROM core_comercial.marketing_campaign_queue q
      USING tmp_duplicate_leads d
      WHERE q.lead_id = d.id;
    `);
    console.log(`[${name}] Deleted ${qDel.rowCount} queue records from duplicate leads.`);

    // 3. Fast indexed delete from core_comercial.leads
    console.log(`[${name}] Deleting duplicate leads from core_comercial.leads...`);
    const lDel = await client.query(`
      DELETE FROM core_comercial.leads l
      USING tmp_duplicate_leads d
      WHERE l.id = d.id;
    `);
    console.log(`[${name}] Successfully deleted ${lDel.rowCount} duplicate lead rows!`);

    // 4. Create Unique Index to prevent duplicates forever
    console.log(`[${name}] Creating UNIQUE INDEX on email...`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_email_lower 
      ON core_comercial.leads (LOWER(TRIM(email))) 
      WHERE email IS NOT NULL AND email != '';
    `);

    const afterRes = await client.query(`SELECT count(*) as total, count(DISTINCT LOWER(TRIM(email))) as unique_emails FROM core_comercial.leads;`);
    console.log(`[${name}] AFTER: ${afterRes.rows[0].total} total rows, ${afterRes.rows[0].unique_emails} unique emails.`);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await deduplicateFast('PROD', prodConnectionString);
  await deduplicateFast('DEV', devConnectionString);
}

run();
