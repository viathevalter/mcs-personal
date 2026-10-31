/**
 * AUDITORIA PROFUNDA HTML REAL (ZERO CHUTE DE E-MAIL) - CONEXÃO ÚNICA OTIMIZADA
 * Verifica cada site capturado hoje nas páginas /, /contacto, /aviso-legal, /contact, /mentions-legales.
 * - Decodifica e-mails protegidos (mailto:, entidades HTML &#64;, Cloudflare data-cfemail)
 * - Se o e-mail estiver literalmente escrito no HTML de um site empresarial ativo: ATUALIZA com o e-mail e telefone reais.
 * - Se o site não abrir, for página estacionada (Hostinet/Próximamente/En venta), for da América Latina ou NÃO tiver e-mail no HTML: DELETA DO BANCO!
 */
const { Client } = require('pg');

const DB_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ALBA_ID = 'ca69863d-998b-4bad-865a-19720e7a1f67';
const LISETH_ID = 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa';
const FATUMATA_ID = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';

const BLOCKED_DOMAINS = new Set([
  'exemple.com', 'exemple.fr', 'example.com', 'domaine.fr', 'domaine.com',
  'votredomaine.fr', 'monsite.fr', 'dominio.es', 'tudominio.es', 'miempresa.es',
  'tuempresa.com', 'test.com', 'test.fr', 'email.com', 'sentry.io', 'wixpress.com',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'bbox.fr',
  'neuf.fr', 'aliceadsl.fr', 'gmail.com', 'hotmail.com', 'hotmail.es', 'hotmail.fr',
  'outlook.com', 'outlook.es', 'outlook.fr', 'yahoo.es', 'yahoo.fr', 'yahoo.com',
  'live.com', 'live.fr', 'icloud.com', 'msn.com', 'telefonica.net', 'terra.es',
  'wanadoo.es', 'ya.com', 'ono.com', 'jazztel.es', 'movistar.es'
]);

const PARKED_TITLE_REGEX = /bienvenido a hostinet|pr[oó]ximamente|web en venta|dominio en venta|domain for sale|sedoparking|parking|index of \/|default web site|security check|coming soon|en construction|site en maintenance|page par d[eé]faut|ovhcloud|f[eé]licitations|congratulations|403 forbidden|404 not found|error 404|acceso denegado|servicio listo para iniciar/i;

const LATAM_REGEX = /yucat[aá]n|cdmx|m[eé]xico|colombia|bogot[aá]|medell[ií]n|argentina|buenos aires|chile|santiago de chile|per[uú]|lima|e\.i\.r\.l|s\.a\. de c\.v\.|\+52|\+57|\+54|\+56|\+51/i;

function decodeCfEmail(encodedString) {
  try {
    let email = '';
    const r = parseInt(encodedString.substr(0, 2), 16);
    for (let n = 2; encodedString.length - n; n += 2) {
      const i = parseInt(encodedString.substr(n, 2), 16) ^ r;
      email += String.fromCharCode(i);
    }
    return email;
  } catch {
    return '';
  }
}

function extractRealEmailsFromHtml(rawHtml, targetDomain) {
  if (!rawHtml) return [];
  let html = rawHtml
    .replace(/&#64;/g, '@')
    .replace(/&#x40;/gi, '@')
    .replace(/&#46;/g, '.')
    .replace(/&#x2e;/gi, '.')
    .replace(/\[at\]|\(at\)|\[arroba\]|\(arroba\)/gi, '@')
    .replace(/\[dot\]|\(dot\)|\[punto\]|\(punto\)/gi, '.');

  // Decode Cloudflare protected emails
  const cfMatches = html.match(/data-cfemail=["']([a-fA-F0-9]+)["']/g) || [];
  for (const m of cfMatches) {
    const hex = m.replace(/data-cfemail=["']|["']/g, '');
    const decoded = decodeCfEmail(hex);
    if (decoded && decoded.includes('@')) {
      html += ` ${decoded} `;
    }
  }

  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const validSameDomain = [];
  const validOtherCorp = [];

  for (const rawE of matches) {
    const e = rawE.toLowerCase().trim().replace(/^[.,;:]+|[.,;:]+$/g, '');
    if (e.length < 6 || e.length > 80) continue;
    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|ico|pdf|mp4|mp3|zip)$/i.test(e)) continue;
    if (/^(2x|3x|100x|200x|300x|400x|500x|600x|700x|800x|1024x)/i.test(e)) continue;
    if (e.includes('sentry') || e.includes('wix') || e.includes('wordpress') || e.includes('woocommerce') || e.includes('prestashop') || e.includes('example') || e.includes('exemple') || e.includes('domaine') || e.includes('tuempresa') || e.includes('dominio') || e.includes('usuario@') || e.includes('nombre@') || e.includes('email@') || e.includes('correo@') || e.includes('votre@') || e.includes('nom@')) continue;

    const parts = e.split('@');
    if (parts.length !== 2) continue;
    const [user, dom] = parts;
    if (!user || !dom || BLOCKED_DOMAINS.has(dom)) continue;
    if (!/^[a-z0-9.-]+\.[a-z]{2,8}$/.test(dom)) continue;

    if (dom === targetDomain || dom.endsWith(`.${targetDomain}`)) {
      if (!validSameDomain.includes(e)) validSameDomain.push(e);
    } else {
      if (!validOtherCorp.includes(e)) validOtherCorp.push(e);
    }
  }

  return validSameDomain.length > 0 ? validSameDomain : validOtherCorp;
}

async function fetchHtmlWithTimeout(url, timeoutMs = 2400) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,fr-FR,fr;q=0.8,en;q=0.7'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function auditDomainRealHtml(domain, country) {
  const baseUrls = [`https://${domain}`, `https://www.${domain}`, `http://${domain}`];
  let homeHtml = null;
  let workingBase = null;

  for (const b of baseUrls) {
    const h = await fetchHtmlWithTimeout(b, 2400);
    if (h && h.length > 250) {
      homeHtml = h;
      workingBase = b;
      break;
    }
  }

  if (!homeHtml || !workingBase) {
    return { valid: false, reason: 'site_unreachable' };
  }

  let cleanTitle = null;
  const tMatch = homeHtml.match(/<title[^>]*>([\s\S]{2,120}?)<\/title>/i);
  if (tMatch) {
    const t = tMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (PARKED_TITLE_REGEX.test(t)) {
      return { valid: false, reason: 'parked_or_placeholder_title' };
    }
    const firstPart = t.split(/[|\-–—·•]/)[0].trim();
    if (firstPart.length >= 3 && !/^(inicio|home|accueil|bienvenue|bienvenido|welcome|portada|index)$/i.test(firstPart)) {
      cleanTitle = firstPart.slice(0, 120);
    } else if (t.length >= 4) {
      cleanTitle = t.slice(0, 120);
    }
  }

  const bodySample = homeHtml.slice(0, 15000);
  if (PARKED_TITLE_REGEX.test(bodySample.slice(0, 2500))) {
    return { valid: false, reason: 'parked_body' };
  }
  if (country === 'ES' && domain.endsWith('.com') && LATAM_REGEX.test(bodySample)) {
    return { valid: false, reason: 'latam_site' };
  }

  let foundPhone = null;
  if (country === 'FR') {
    const pm = homeHtml.match(/(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/);
    if (pm) foundPhone = pm[0].trim();
  } else {
    const pm = homeHtml.match(/(?:\+34\s?)?[689]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
    if (pm) foundPhone = pm[0].trim();
  }

  let realEmails = extractRealEmailsFromHtml(homeHtml, domain);

  if (realEmails.length === 0) {
    const subPaths = country === 'FR'
      ? ['/contact', '/mentions-legales', '/nous-contacter']
      : ['/contacto', '/aviso-legal', '/contact'];

    const linkMatches = homeHtml.match(/href=["']([^"']*(?:contact|aviso|mention|legal)[^"']*)["']/gi) || [];
    for (const lm of linkMatches.slice(0, 2)) {
      const href = lm.replace(/^href=["']|["']$/gi, '').trim();
      if (href.startsWith('/') && !subPaths.includes(href)) {
        subPaths.unshift(href);
      }
    }

    for (const sp of subPaths.slice(0, 2)) {
      const subHtml = await fetchHtmlWithTimeout(`${workingBase}${sp}`, 2000);
      if (subHtml && subHtml.length > 200) {
        if (!foundPhone) {
          const pm = country === 'FR'
            ? subHtml.match(/(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/)
            : subHtml.match(/(?:\+34\s?)?[689]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
          if (pm) foundPhone = pm[0].trim();
        }
        const subEmails = extractRealEmailsFromHtml(subHtml, domain);
        if (subEmails.length > 0) {
          realEmails = subEmails;
          break;
        }
      }
    }
  }

  if (realEmails.length === 0) {
    return { valid: false, reason: 'no_email_in_html' };
  }

  return {
    valid: true,
    email: realEmails[0],
    phone: foundPhone,
    companyName: cleanTitle
  };
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const res = await client.query(`
    SELECT id, email, company_name, phone, assigned_to
    FROM core_comercial.leads
    WHERE created_at >= CURRENT_DATE
      AND assigned_to IN ($1, $2, $3)
      AND NOT ('HTML Verificado 100% Real' = ANY(COALESCE(tags, ARRAY[]::text[])))
    ORDER BY id ASC
  `, [ALBA_ID, LISETH_ID, FATUMATA_ID]);

  const leadsToday = res.rows;
  console.log(`🔍 Iniciando Auditoria HTML Real em ${leadsToday.length} leads capturados hoje...`);

  let keptAndVerified = 0;
  let deletedFakeOrNoHtmlEmail = 0;
  const CHUNK_SIZE = 60;

  for (let i = 0; i < leadsToday.length; i += CHUNK_SIZE) {
    const chunk = leadsToday.slice(i, i + CHUNK_SIZE);

    // 1. Run HTTP scraping in parallel (no DB connections used here)
    const auditResults = await Promise.all(chunk.map(async lead => {
      const email = (lead.email || '').toLowerCase().trim();
      const domain = email.split('@')[1];
      const country = lead.assigned_to === FATUMATA_ID ? 'FR' : 'ES';
      if (!domain) return { lead, audit: { valid: false } };
      const audit = await auditDomainRealHtml(domain, country);
      return { lead, audit };
    }));

    // 2. Apply DB mutations using the single client connection
    const idsToDelete = [];
    const itemsToUpdate = [];

    for (const { lead, audit } of auditResults) {
      if (!audit.valid) {
        idsToDelete.push(lead.id);
      } else {
        itemsToUpdate.push({ lead, audit });
      }
    }

    if (idsToDelete.length > 0) {
      await client.query(`DELETE FROM core_comercial.leads WHERE id = ANY($1::uuid[])`, [idsToDelete]);
      deletedFakeOrNoHtmlEmail += idsToDelete.length;
    }

    for (const { lead, audit } of itemsToUpdate) {
      const finalName = (audit.companyName && audit.companyName.length >= 3) ? audit.companyName : lead.company_name;
      const finalPhone = audit.phone || lead.phone || null;
      try {
        await client.query(`
          UPDATE core_comercial.leads
          SET email = $1,
              company_name = $2,
              name = $2,
              phone = $3,
              tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'HTML Verificado 100% Real'),
              updated_at = NOW()
          WHERE id = $4
        `, [audit.email, finalName, finalPhone, lead.id]);
        keptAndVerified++;
      } catch {
        await client.query(`DELETE FROM core_comercial.leads WHERE id = $1`, [lead.id]);
        deletedFakeOrNoHtmlEmail++;
      }
    }

    if ((i + CHUNK_SIZE) % 300 === 0 || (i + CHUNK_SIZE) >= leadsToday.length) {
      console.log(`📊 [AUDITORIA HTML] Processados: ${Math.min(i + CHUNK_SIZE, leadsToday.length)}/${leadsToday.length} | ✅ E-mail Lido no HTML: ${keptAndVerified} | 🗑️ Deletados (Sem e-mail no HTML): ${deletedFakeOrNoHtmlEmail}`);
    }
  }

  const finalRes = await client.query(`
    SELECT
      assigned_to,
      count(*) FILTER (
        WHERE NOT ('Bounce' = ANY(COALESCE(tags, ARRAY[]::text[])))
          AND NOT ('E-mail Inválido' = ANY(COALESCE(tags, ARRAY[]::text[])))
          AND NOT EXISTS (
            SELECT 1 FROM core_comercial.marketing_campaign_queue q
            WHERE q.lead_id = leads.id AND q.status = 'sent'
          )
      ) as virgin_cnt,
      count(*) FILTER (WHERE 'HTML Verificado 100% Real' = ANY(COALESCE(tags, ARRAY[]::text[]))) as html_verified_today
    FROM core_comercial.leads
    WHERE assigned_to IN ($1, $2, $3)
    GROUP BY assigned_to
  `, [ALBA_ID, LISETH_ID, FATUMATA_ID]);

  console.log('\n=== RESULTADO PÓS-LIMPEZA ESTRITA (SÓ E-MAILS 100% REAIS LIDOS NO HTML) ===');
  for (const r of finalRes.rows) {
    const name = r.assigned_to === ALBA_ID ? 'Alba (ES)' : r.assigned_to === LISETH_ID ? 'Liseth (ES)' : 'Fatumata (FR)';
    console.log(`${name}: Total Inéditos 100% Reais = ${r.virgin_cnt} (Capturados hoje com e-mail lido no HTML = ${r.html_verified_today})`);
  }

  await client.end();
}

main().catch(console.error);
