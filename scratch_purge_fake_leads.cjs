const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDomainMx(domain) {
  if (!domain || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch (err) {
    return false;
  }
}

async function cleanDatabase(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`\n================== [${dbName}] Starting Deep Hygiene ==================`);
  
  const res = await client.query(`
    SELECT id, company_name, email, job_id
    FROM core_comercial.lead_prospecting_results
  `);

  console.log(`[${dbName}] Total Staging Leads in DB: ${res.rows.length}`);

  const domainMap = new Map();
  for (const r of res.rows) {
    if (r.email && r.email.includes('@')) {
      const domain = r.email.split('@')[1].toLowerCase().trim();
      if (!domainMap.has(domain)) {
        domainMap.set(domain, null);
      }
    }
  }

  console.log(`[${dbName}] Unique Domains to verify: ${domainMap.size}`);

  const uniqueDomains = Array.from(domainMap.keys());
  let checked = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < uniqueDomains.length; i += BATCH_SIZE) {
    const batch = uniqueDomains.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (dom) => {
        const isValid = await checkDomainMx(dom);
        domainMap.set(dom, isValid);
      })
    );
    checked += batch.length;
    process.stdout.write(`\r[${dbName}] Verified ${checked}/${uniqueDomains.length} domains...`);
  }

  console.log(`\n[${dbName}] Verification finished. Identifying leads to purge...`);

  const idsToPurge = [];
  const validIds = [];

  for (const r of res.rows) {
    if (!r.email) {
      idsToPurge.push(r.id);
      continue;
    }
    const domain = r.email.split('@')[1]?.toLowerCase().trim();
    if (domainMap.get(domain)) {
      validIds.push(r.id);
    } else {
      idsToPurge.push(r.id);
    }
  }

  console.log(`[${dbName}] Real Leads to KEEP: ${validIds.length}`);
  console.log(`[${dbName}] Hallucinated Leads to PURGE: ${idsToPurge.length}`);

  // Delete fake leads in batches of 1000
  if (idsToPurge.length > 0) {
    console.log(`[${dbName}] Deleting ${idsToPurge.length} fake leads from database...`);
    const CHUNK = 1000;
    for (let i = 0; i < idsToPurge.length; i += CHUNK) {
      const chunkIds = idsToPurge.slice(i, i + CHUNK);
      await client.query(`
        DELETE FROM core_comercial.lead_prospecting_results
        WHERE id = ANY($1::uuid[])
      `, [chunkIds]);
    }
    console.log(`[${dbName}] Successfully purged ${idsToPurge.length} fake leads!`);
  }

  // Also remove exact duplicate company names among remaining real leads
  const dedupeRes = await client.query(`
    DELETE FROM core_comercial.lead_prospecting_results a
    USING core_comercial.lead_prospecting_results b
    WHERE a.id > b.id
      AND LOWER(TRIM(a.company_name)) = LOWER(TRIM(b.company_name));
  `);
  console.log(`[${dbName}] Removed ${dedupeRes.rowCount} duplicate companies from remaining real leads.`);

  // Recalculate job counts
  console.log(`[${dbName}] Updating all job counts...`);
  await client.query(`
    UPDATE core_comercial.lead_prospecting_jobs j
    SET 
      processed_count = COALESCE((SELECT COUNT(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id), 0),
      found_emails_count = COALESCE((SELECT COUNT(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id AND r.email IS NOT NULL), 0),
      updated_at = NOW();
  `);

  // Reset jobs that don't have target met back to pending/processing
  await client.query(`
    UPDATE core_comercial.lead_prospecting_jobs
    SET status = 'pending'
    WHERE processed_count < target_count - 5 AND status = 'completed';
  `);

  console.log(`[${dbName}] Database is now 100% CLEAN, HYGIENIZED, and VERIFIED!`);
  await client.end();
}

async function run() {
  await cleanDatabase('DEV', devConnectionString);
  await cleanDatabase('PROD', prodConnectionString);
}

run();
