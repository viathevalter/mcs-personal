const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const JUNK_DOMAINS = [
  'webador.es', 'wixpress.com', 'sentry.io', 'schema.org', 'example.com',
  'ejemplo.com', 'doe.com', 'freehtml5.co', 'themewagon.com', 'bootstrap',
  'popper', 'fontawesome', 'cloudflare.com', 'wordpress.org', 'gravatar.com'
];

function isCleanValidEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 80) return false;
  if (!lower.includes('@') || !lower.includes('.')) return false;
  
  // Reject software versions like popper.js@1.16.0 or bootstrap@5.3.3
  if (/@\d+\.\d+/i.test(lower) || /\.(js|css|png|jpg|jpeg|webp|gif|svg)@/i.test(lower)) return false;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.js')) return false;

  for (const junk of JUNK_DOMAINS) {
    if (lower.includes(junk)) return false;
  }
  return true;
}

async function scrapeEmailFromWebsite(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(t);

    if (!res.ok) return null;
    const html = await res.text();
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const matches = html.match(emailRegex) || [];

    const cleanEmails = matches.filter(isCleanValidEmail);
    if (cleanEmails.length > 0) {
      // Prioritize contact/info/taller or company specific gmail
      const priority = cleanEmails.find(e => /^(info|contacto|taller|comercial|ventas|administracion)/i.test(e) || e.includes('gmail.com'));
      return (priority || cleanEmails[0]).toLowerCase().trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function enrichLiveWebsites() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🌐 EXTRATOR DE E-MAILS REAIS DO HTML DOS SITES (STAGING & CRM)');
    console.log('========================================================================\n');

    // 1. Enrich Staging
    const staging = await client.query(`
      SELECT id, company_name, email, website 
      FROM core_comercial.lead_prospecting_results 
      WHERE website IS NOT NULL AND website != '' AND website != 'null';
    `);

    let stagingCount = 0;
    for (const lead of staging.rows) {
      let webUrl = lead.website.trim();
      if (!webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

      const scrapedEmail = await scrapeEmailFromWebsite(webUrl);
      if (scrapedEmail && scrapedEmail !== lead.email.toLowerCase().trim()) {
        try {
          await client.query(`
            UPDATE core_comercial.lead_prospecting_results
            SET email = $1, updated_at = NOW()
            WHERE id = $2;
          `, [scrapedEmail, lead.id]);
          stagingCount++;
          console.log(`🎯 [Staging] ${lead.company_name}: "${lead.email}" ➔ "${scrapedEmail}" (extraído do site!)`);
        } catch {}
      }
    }

    console.log(`\n✅ Staging: ${stagingCount} e-mails atualizados diretamente do site oficial!\n`);

  } finally {
    await client.end();
  }
}

enrichLiveWebsites();
