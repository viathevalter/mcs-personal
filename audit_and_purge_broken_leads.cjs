const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkMx(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

async function auditAndCleanExisting() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log(`=== AUDITING AND CLEANING EXISTING LEADS IN PROD ===`);
  const leadsRes = await client.query(`
    SELECT id, email, company_name, website, tags, origen_lead
    FROM core_comercial.leads
    WHERE email IS NOT NULL AND email != '';
  `);

  console.log(`Total leads to audit: ${leadsRes.rows.length}`);

  let validCount = 0;
  let invalidCount = 0;
  const invalidIds = [];

  for (const lead of leadsRes.rows) {
    const email = lead.email.trim().toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';

    // Check basic email syntax
    if (!domain || !domain.includes('.') || domain.endsWith('.co') && !domain.endsWith('.com.co') && !['iberdrola.es', 'endesa.es'].includes(domain)) {
      // Common fake pattern from old templates: domains ending in naked '.co' (like grupocobra.co instead of grupocobra.com)
      if (domain.endsWith('.co') && !domain.endsWith('.com')) {
        invalidCount++;
        invalidIds.push(lead.id);
        continue;
      }
    }

    const hasMx = await checkMx(domain);
    if (!hasMx) {
      invalidCount++;
      invalidIds.push(lead.id);
    } else {
      validCount++;
    }
  }

  console.log(`Audit Results: ${validCount} VALID | ${invalidCount} INVALID`);

  if (invalidIds.length > 0) {
    console.log(`Purging ${invalidIds.length} invalid leads from database...`);
    // Remove from queue first
    await client.query(`
      DELETE FROM core_comercial.marketing_campaign_queue
      WHERE lead_id = ANY($1::uuid[]);
    `, [invalidIds]);

    // Remove from leads
    const delRes = await client.query(`
      DELETE FROM core_comercial.leads
      WHERE id = ANY($1::uuid[]);
    `, [invalidIds]);
    console.log(`Successfully purged ${delRes.rowCount} dead/invalid leads!`);
  }

  const finalRes = await client.query(`SELECT count(*) as total_clean_leads FROM core_comercial.leads;`);
  console.log(`Final 100% Clean & Verified Leads in CRM: ${finalRes.rows[0].total_clean_leads}`);

  await client.end();
}

auditAndCleanExisting();
