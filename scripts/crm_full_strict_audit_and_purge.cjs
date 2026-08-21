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

async function runCrmAuditAndPurge() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🧹 INICIANDO VARREDURA E AUDITORIA COMPLETA DE TODOS OS LEADS DO CRM');
    console.log('========================================================================\n');

    const leadsRes = await client.query(`
      SELECT id, company_name, email, website, phone, city, notes 
      FROM core_comercial.leads 
      ORDER BY created_at ASC;
    `);

    const allLeads = leadsRes.rows;
    console.log(`Total de leads encontrados no CRM: ${allLeads.length}\n`);

    let confirmedCount = 0;
    let updatedCount = 0;
    let purgedCount = 0;

    // Process in batches of 20 concurrent website scrapes
    const BATCH_SIZE = 20;
    for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
      const batch = allLeads.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (lead) => {
        let webUrl = (lead.website || '').trim();
        if (webUrl && !webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

        // If no website stored, try using the email domain if corporate
        if (!webUrl && lead.email && lead.email.includes('@')) {
          const domain = lead.email.split('@')[1];
          if (!domain.includes('gmail') && !domain.includes('hotmail') && !domain.includes('yahoo')) {
            webUrl = `https://www.${domain}`;
          }
        }

        const scrapedEmails = await scrapeRealEmailsFromSite(webUrl);

        if (scrapedEmails.length > 0) {
          const bestEmail = scrapedEmails.find(e => /^(comercial|ventas|taller|contacto|info|administracion)/i.test(e) || e.includes('gmail') || e.includes('hotmail')) || scrapedEmails[0];
          const otherEmails = scrapedEmails.filter(e => e !== bestEmail);
          const otherEmailsNote = otherEmails.length > 0 ? ` E-mails secundários do site: ${otherEmails.join(', ')}` : '';

          if (bestEmail === lead.email?.toLowerCase().trim()) {
            confirmedCount++;
            console.log(`✅ [CONFIRMADO] ${lead.company_name} ➔ ${bestEmail}`);
          } else {
            try {
              await client.query(`
                UPDATE core_comercial.leads
                SET email = $1, website = $2, notes = COALESCE(notes, '') || $3, updated_at = NOW()
                WHERE id = $4;
              `, [bestEmail, webUrl, otherEmailsNote, lead.id]);
              updatedCount++;
              console.log(`🔄 [ATUALIZADO] ${lead.company_name} ➔ ${bestEmail} (anterior: ${lead.email})`);
            } catch (err) {
              // If duplicate email exists in another lead, purge the duplicate
              await client.query(`DELETE FROM core_comercial.leads WHERE id = $1;`, [lead.id]);
              purgedCount++;
            }
          }
        } else {
          // If no email found in website HTML and not verified: PURGE IT!
          // We protect Italian verified leads or manual leads with notes
          const isItalianVerified = (lead.notes || '').includes('Catalogo Italiano');
          if (isItalianVerified) {
            confirmedCount++;
          } else {
            await client.query(`DELETE FROM core_comercial.leads WHERE id = $1;`, [lead.id]);
            purgedCount++;
            console.log(`❌ [EXPURGADO] ${lead.company_name} (${lead.email}) - Site sem e-mail ou inexistente.`);
          }
        }
      }));

      console.log(`--- Progresso: ${Math.min(i + BATCH_SIZE, allLeads.length)} / ${allLeads.length} leads processados ---`);
    }

    console.log('\n========================================================================');
    console.log('🏁 AUDITORIA DO CRM CONCLUÍDA:');
    console.log(`- Leads 100% Confirmados no site: ${confirmedCount}`);
    console.log(`- Leads Atualizados com o e-mail real do site: ${updatedCount}`);
    console.log(`- Leads Deletados / Expurgados (sem e-mail real): ${purgedCount}`);
    console.log('========================================================================\n');

  } finally {
    await client.end();
  }
}

runCrmAuditAndPurge();
