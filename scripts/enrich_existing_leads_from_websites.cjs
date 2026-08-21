const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function scrapeEmailFromWebsite(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(t);

    if (!res.ok) return null;
    const html = await res.text();
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = html.match(emailRegex) || [];

    const validEmails = matches.filter(e => {
      const lower = e.toLowerCase();
      return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.webp') &&
             !lower.includes('sentry') && !lower.includes('wixpress') && !lower.includes('schema.org') &&
             !lower.includes('example.com') && !lower.includes('domain.es') && !lower.includes('email.com');
    });

    if (validEmails.length > 0) {
      return validEmails[0].toLowerCase().trim();
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function enrichAllLeadsFromWebsites() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🕷️ INICIANDO ENRIQUECEDOR DE E-MAILS REAIS VIA SCRAPING DE WEBSITES');
    console.log('========================================================================\n');

    // 1. Enrich Staging Leads
    const stagingLeads = await client.query(`
      SELECT id, company_name, email, website 
      FROM core_comercial.lead_prospecting_results 
      WHERE website IS NOT NULL AND website != '' AND website != 'null';
    `);

    console.log(`Verificando websites de ${stagingLeads.rows.length} leads em Staging...`);

    let stagingUpdated = 0;
    for (const lead of stagingLeads.rows) {
      let webUrl = lead.website.trim();
      if (!webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

      const realScrapedEmail = await scrapeEmailFromWebsite(webUrl);
      if (realScrapedEmail && realScrapedEmail !== lead.email.toLowerCase().trim()) {
        console.log(`🎯 [Staging] ${lead.company_name}: Atualizado "${lead.email}" ➔ "${realScrapedEmail}" (extraído do site!)`);
        await client.query(`
          UPDATE core_comercial.lead_prospecting_results
          SET email = $1, updated_at = NOW()
          WHERE id = $2;
        `, [realScrapedEmail, lead.id]);
        stagingUpdated++;
      }
    }

    console.log(`\n✅ Staging enriquecido: ${stagingUpdated} e-mails atualizados com o e-mail real do site!\n`);

    // 2. Enrich CRM Leads
    const crmLeads = await client.query(`
      SELECT id, company_name, email, website 
      FROM core_comercial.leads 
      WHERE website IS NOT NULL AND website != '' AND website != 'null'
      ORDER BY created_at DESC
      LIMIT 300;
    `);

    console.log(`Verificando websites de ${crmLeads.rows.length} leads recentes no CRM...`);

    let crmUpdated = 0;
    for (const lead of crmLeads.rows) {
      let webUrl = lead.website.trim();
      if (!webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

      const realScrapedEmail = await scrapeEmailFromWebsite(webUrl);
      if (realScrapedEmail && realScrapedEmail !== lead.email.toLowerCase().trim()) {
        console.log(`🎯 [CRM] ${lead.company_name}: Atualizado "${lead.email}" ➔ "${realScrapedEmail}"`);
        try {
          await client.query(`
            UPDATE core_comercial.leads
            SET email = $1, updated_at = NOW()
            WHERE id = $2;
          `, [realScrapedEmail, lead.id]);
          crmUpdated++;
        } catch (e) {
          // Ignore if unique constraint collides with existing lead
        }
      }
    }

    console.log(`\n✅ CRM enriquecido: ${crmUpdated} e-mails atualizados com o e-mail real do site!`);

  } finally {
    await client.end();
  }
}

enrichAllLeadsFromWebsites();
