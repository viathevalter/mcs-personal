const { Client } = require('pg');
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

async function audit() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log('Fetching all staging emails...');
  const res = await client.query(`
    SELECT id, company_name, email, website, job_id
    FROM core_comercial.lead_prospecting_results
  `);

  console.log(`Total Staging Leads: ${res.rows.length}`);

  // Extract unique domains
  const domainMap = new Map(); // domain -> isValid
  const emailRows = res.rows.filter(r => r.email && r.email.includes('@'));
  
  for (const r of emailRows) {
    const domain = r.email.split('@')[1].toLowerCase().trim();
    if (!domainMap.has(domain)) {
      domainMap.set(domain, null);
    }
  }

  console.log(`Total Unique Domains to verify: ${domainMap.size}`);

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
    process.stdout.write(`\rVerified ${checked}/${uniqueDomains.length} domains...`);
  }

  console.log('\nVerification complete!');

  let validCount = 0;
  let invalidCount = 0;
  const invalidDomains = [];
  const validDomains = [];

  for (const [dom, isValid] of domainMap.entries()) {
    if (isValid) {
      validCount++;
      validDomains.push(dom);
    } else {
      invalidCount++;
      invalidDomains.push(dom);
    }
  }

  console.log(`\nResults:`);
  console.log(`- Real / Valid Domains: ${validCount}`);
  console.log(`- Fake / Non-Existent Domains: ${invalidCount}`);

  // Count leads
  let validLeads = 0;
  let invalidLeads = 0;
  const invalidLeadIds = [];

  for (const r of res.rows) {
    if (!r.email) {
      invalidLeads++;
      invalidLeadIds.push(r.id);
      continue;
    }
    const domain = r.email.split('@')[1]?.toLowerCase().trim();
    if (domainMap.get(domain)) {
      validLeads++;
    } else {
      invalidLeads++;
      invalidLeadIds.push(r.id);
    }
  }

  console.log(`\nLead Impact:`);
  console.log(`- Valid Real Leads: ${validLeads}`);
  console.log(`- Fake / Hallucinated Leads to Purge: ${invalidLeads}`);

  await client.end();
}

audit();
