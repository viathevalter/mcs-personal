const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const JUNK_DOMAINS = [
  'webador.es', 'wixpress.com', 'sentry.io', 'schema.org', 'example.com',
  'ejemplo.com', 'doe.com', 'freehtml5.co', 'themewagon.com', 'bootstrap',
  'popper', 'fontawesome', 'cloudflare.com', 'wordpress.org', 'gravatar.com',
  'google.com', 'facebook.com', 'instagram.com'
];

function isCleanValidEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 80) return false;
  if (!lower.includes('@') || !lower.includes('.')) return false;
  
  if (/@\d+\.\d+/i.test(lower) || /\.(js|css|png|jpg|jpeg|webp|gif|svg)@/i.test(lower)) return false;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.js') || lower.endsWith('.css')) return false;

  for (const junk of JUNK_DOMAINS) {
    if (lower.includes(junk)) return false;
  }
  return true;
}

async function scrapeRealEmailsFromSite(baseUrl) {
  if (!baseUrl || !baseUrl.startsWith('http')) return [];
  const urlsToTry = [
    baseUrl,
    baseUrl.replace(/\/$/, '') + '/contacto',
    baseUrl.replace(/\/$/, '') + '/contacto.html',
    baseUrl.replace(/\/$/, '') + '/aviso-legal',
    baseUrl.replace(/\/$/, '') + '/contact'
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      const matches = html.match(emailRegex) || [];
      const clean = matches.filter(isCleanValidEmail);

      if (clean.length > 0) {
        return clean.map(e => e.toLowerCase().trim());
      }
    } catch {}
  }
  return [];
}

async function strictAuditAndPurge() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🛡️ AUDITORIA RIGOROSA: APENAS E-MAILS REAIS DO HTML (EXPURGO TOTAL)');
    console.log('========================================================================\n');

    // 1. Audit Staging Results
    const stagingLeads = await client.query(`
      SELECT id, job_id, company_name, email, website, phone, city, province 
      FROM core_comercial.lead_prospecting_results;
    `);

    console.log(`Analisando ${stagingLeads.rows.length} leads em Staging...`);

    let stagingConfirmed = 0;
    let stagingUpdated = 0;
    let stagingDeleted = 0;

    for (const lead of stagingLeads.rows) {
      let webUrl = (lead.website || '').trim();
      if (webUrl && !webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

      const scrapedEmails = await scrapeRealEmailsFromSite(webUrl);

      if (scrapedEmails.length > 0) {
        const bestEmail = scrapedEmails.find(e => /^(info|contacto|taller|comercial|ventas|administracion)/i.test(e) || e.includes('gmail.com') || e.includes('hotmail')) || scrapedEmails[0];

        if (bestEmail === lead.email.toLowerCase().trim()) {
          console.log(`✅ [CONFIRMADO NO SITE] ${lead.company_name} ➔ ${bestEmail}`);
          stagingConfirmed++;
        } else {
          console.log(`🔄 [ATUALIZADO COM E-MAIL DO SITE] ${lead.company_name} ➔ ${bestEmail} (anterior: ${lead.email})`);
          try {
            await client.query(`
              UPDATE core_comercial.lead_prospecting_results
              SET email = $1, confidence_score = 100, updated_at = NOW()
              WHERE id = $2;
            `, [bestEmail, lead.id]);
            stagingUpdated++;
          } catch {
            await client.query(`DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;`, [lead.id]);
            stagingDeleted++;
          }
        }
      } else {
        // No real email found in HTML: PURGE IT!
        console.log(`❌ [SEM E-MAIL NO SITE / DELETADO] ${lead.company_name} (${lead.email}) - Site sem e-mail público.`);
        await client.query(`DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;`, [lead.id]);
        stagingDeleted++;
      }
    }

    console.log('\n========================================================================');
    console.log(`📊 RESULTADO DO STAGING:`);
    console.log(`- Confirmados 100% no site: ${stagingConfirmed}`);
    console.log(`- Atualizados com o e-mail real do site: ${stagingUpdated}`);
    console.log(`- Deletados por não ter e-mail no site: ${stagingDeleted}`);
    console.log('========================================================================\n');

    // Sync active jobs counters
    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs j
      SET 
        processed_count = (SELECT count(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id),
        found_emails_count = (SELECT count(*) FROM core_comercial.lead_prospecting_results r WHERE r.job_id = j.id),
        updated_at = NOW();
    `);

  } finally {
    await client.end();
  }
}

strictAuditAndPurge();
