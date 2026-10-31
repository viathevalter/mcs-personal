/**
 * MOTOR 100% GRATUITO (CUSTO € 0,00 - SEM GOOGLE MAPS E SEM IA PAGA)
 * CAPTURA DE 5.000 NOVOS LEADS B2B INDUSTRIAIS NA FRANÇA PARA FATUMATA (WISEOWE)
 * Fonte: API Oficial Governo Francês (INSEE / SIRENE recherche-entreprises.api.gouv.fr) + DNS MX + Web Scraper
 */
const dns = require('dns').promises;
const { Pool } = require('pg');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '9.9.9.9']);

const DB_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const WISEOWE_ID = 'dae64d51-2181-4510-b14f-e63d2f111a8e';
const FATUMATA_ID = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';
const WISEOWE_STAGE_NOVO = '048f4587-f416-4fc2-b3c9-09c42347df95';
const TARGET_NEW_LEADS = 5000;

const NAF_CODES = [
  { code: '25.11Z', label: 'Structures métalliques et parties de structures' },
  { code: '25.12Z', label: 'Menuiserie métallique' },
  { code: '25.29Z', label: 'Chaudronnerie, réservoirs et conteneurs métalliques' },
  { code: '25.21Z', label: 'Chaudières et radiateurs industriels' },
  { code: '25.50A', label: 'Forge, estampage, matriçage' },
  { code: '25.50B', label: 'Découpage, emboutissage' },
  { code: '25.61Z', label: 'Traitement et revêtement des métaux' },
  { code: '25.62A', label: 'Décolletage' },
  { code: '25.62B', label: 'Mécanique industrielle et usinage' },
  { code: '33.11Z', label: 'Réparation d ouvrages en métaux' },
  { code: '33.12Z', label: 'Maintenance et réparation de machines industrielles' },
  { code: '33.14Z', label: 'Maintenance d équipements électriques industriels' },
  { code: '33.15Z', label: 'Réparation et maintenance navale' },
  { code: '33.20A', label: 'Installation de structures métalliques, chaudronnées et de tuyauterie' },
  { code: '33.20B', label: 'Installation de machines et équipements mécaniques' },
  { code: '33.20C', label: 'Installation d équipements de contrôle des processus industriels' },
  { code: '33.20D', label: 'Maintenance d équipements industriels' },
  { code: '28.11Z', label: 'Moteurs et turbines industriels' },
  { code: '28.12Z', label: 'Équipements hydrauliques et pneumatiques' },
  { code: '28.13Z', label: 'Pompes et compresseurs industriels' },
  { code: '28.14Z', label: 'Robinetterie industrielle' },
  { code: '28.21Z', label: 'Fours et brûleurs industriels' },
  { code: '28.22Z', label: 'Matériel de levage et de manutention' },
  { code: '28.25Z', label: 'Équipements aérauliques et frigorifiques industriels' },
  { code: '28.29A', label: 'Équipements d emballage et de conditionnement' },
  { code: '28.29B', label: 'Machines et équipements d usage général' },
  { code: '28.41Z', label: 'Machines-outils pour le travail des métaux' },
  { code: '28.91Z', label: 'Machines pour la métallurgie' },
  { code: '28.92Z', label: 'Machines pour l extraction ou la construction' },
  { code: '28.93Z', label: 'Machines pour l industrie agroalimentaire' },
  { code: '28.99B', label: 'Machines spécialisées industrielles' },
  { code: '30.11Z', label: 'Construction de navires et de structures flottantes' },
  { code: '30.20Z', label: 'Construction ferroviaire' },
  { code: '43.21A', label: 'Travaux d installation électrique industrielle' },
  { code: '43.22A', label: 'Travaux d installation d eau et de gaz' },
  { code: '43.22B', label: 'Installation d équipements thermiques et de climatisation' },
  { code: '43.29A', label: 'Travaux d isolation industrielle' },
  { code: '43.29B', label: 'Autres travaux d installation industrielle' },
  { code: '43.99B', label: 'Montage de structures métalliques' },
  { code: '43.99C', label: 'Travaux de maçonnerie générale et gros oeuvre industriel' },
  { code: '24.10Z', label: 'Sidérurgie' },
  { code: '24.20Z', label: 'Tubes, tuyaux, profilés creux en acier' },
  { code: '24.33Z', label: 'Profilage à froid par formage ou pliage' },
  { code: '24.51Z', label: 'Fonderie de fonte' },
  { code: '24.52Z', label: 'Fonderie d acier' }
];

const DEPARTMENTS = [
  '69', '59', '13', '31', '44', '33', '38', '67', '76', '42', '01', '74', '62', '35', '57',
  '68', '49', '85', '77', '78', '91', '92', '93', '94', '95', '29', '56', '22', '14', '27',
  '50', '61', '72', '53', '45', '37', '41', '28', '18', '36', '21', '71', '89', '58', '25',
  '39', '70', '90', '51', '10', '52', '08', '54', '55', '88', '80', '60', '02', '63', '03',
  '15', '43', '26', '07', '73', '34', '30', '66', '11', '81', '82', '12', '46', '32', '65',
  '09', '83', '06', '84', '04', '05', '64', '40', '24', '47', '16', '17', '79', '86', '87',
  '19', '23', '75'
];

const BLOCKED_DOMAINS = new Set([
  'exemple.com', 'exemple.fr', 'example.com', 'domaine.fr', 'domaine.com',
  'votredomaine.fr', 'monsite.fr', 'test.com', 'test.fr', 'email.com',
  'sentry.io', 'wixpress.com', 'orange.fr', 'wanadoo.fr', 'free.fr',
  'sfr.fr', 'laposte.net', 'bbox.fr', 'neuf.fr', 'aliceadsl.fr',
  'club-internet.fr', 'numericable.fr', 'noos.fr', 'voila.fr', 'cegetel.net',
  'gmail.com', 'hotmail.fr', 'hotmail.com', 'outlook.fr', 'outlook.com',
  'yahoo.fr', 'yahoo.com', 'live.fr', 'live.com', 'icloud.com', 'msn.com', 'aol.com',
  'societe.com', 'pappers.fr', 'verif.com', 'infogreffe.fr', 'pagesjaunes.fr',
  'kompass.com', 'europages.fr', 'linkedin.com', 'facebook.com'
]);

const PARKED_MX_PATTERNS = [
  'sedoparking', 'parkingcrew', 'bodis', 'above.com', 'afternic', 'dan.com', 'eftydns', 'parklogic'
];

const STOP_WORDS = new Set([
  'sas', 'sarl', 'sa', 'eurl', 'snc', 'sci', 'sca', 'societe', 'entreprise', 'etablissements',
  'etablissement', 'ets', 'groupe', 'holding', 'france', 'francaise', 'atelier', 'ateliers',
  'compagnie', 'cie', 'nouvelle', 'exploitation', 'diffusion', 'services', 'service', 'le', 'la',
  'les', 'de', 'du', 'des', 'et', 'en', 'au', 'aux', 'sur', 'sous', 'pour', 'par', 'avec', 'sans'
]);

function extractBrandSlugs(rawName, sigle) {
  const candidates = new Set();
  if (sigle && sigle.trim().length >= 3) {
    const s = sigle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (s.length >= 3 && s.length <= 20) candidates.add(s);
  }

  // Extract parenthetical acronym if present e.g. "ATELIER MECANIQUE (AMC)"
  const parenMatch = rawName.match(/\(([A-Za-z0-9\-]{3,16})\)/);
  if (parenMatch) {
    const p = parenMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '');
    if (p.length >= 3 && !STOP_WORDS.has(p)) candidates.add(p);
  }

  const cleaned = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  if (cleaned.length === 0) return [];

  // 1 word
  if (cleaned[0].length >= 4 && cleaned[0].length <= 22) {
    candidates.add(cleaned[0]);
  }
  // 2 words combined and hyphenated
  if (cleaned.length >= 2) {
    const c2 = `${cleaned[0]}${cleaned[1]}`;
    const h2 = `${cleaned[0]}-${cleaned[1]}`;
    if (c2.length >= 4 && c2.length <= 24) candidates.add(c2);
    if (h2.length >= 5 && h2.length <= 26) candidates.add(h2);
  }
  // 3 words combined
  if (cleaned.length >= 3) {
    const c3 = `${cleaned[0]}${cleaned[1]}${cleaned[2]}`;
    const h3 = `${cleaned[0]}-${cleaned[1]}-${cleaned[2]}`;
    if (c3.length >= 5 && c3.length <= 24) candidates.add(c3);
    if (h3.length >= 7 && h3.length <= 28) candidates.add(h3);
  }

  return Array.from(candidates).slice(0, 4);
}

const mxCache = new Map();
async function verifyCorporateMx(domain) {
  if (!domain || BLOCKED_DOMAINS.has(domain)) return false;
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1800))
    ]);
    if (!Array.isArray(mx) || mx.length === 0) {
      mxCache.set(domain, false);
      return false;
    }
    const valid = mx.some(r => {
      const ex = (r.exchange || '').toLowerCase().trim();
      return ex.length > 3 && !PARKED_MX_PATTERNS.some(p => ex.includes(p));
    });
    mxCache.set(domain, valid);
    return valid;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}

async function scrapeWebsiteForFrenchEmailAndPhone(domain) {
  const urls = [`https://${domain}`, `https://www.${domain}`, `https://${domain}/contact`, `https://${domain}/mentions-legales`];
  let foundEmail = null;
  let foundPhone = null;

  for (const url of urls.slice(0, 2)) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();

      // Phone regex (+33 or 01..09 XX XX XX XX)
      if (!foundPhone) {
        const pMatch = html.match(/(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/);
        if (pMatch) foundPhone = pMatch[0].trim();
      }

      // Email regex matching this domain or corporate domain
      const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      for (const rawE of emails) {
        const e = rawE.toLowerCase().trim();
        if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|ttf)$/i.test(e)) continue;
        const d = e.split('@')[1];
        if (!d || BLOCKED_DOMAINS.has(d)) continue;
        if (d === domain || d.endsWith(`.${domain}`)) {
          foundEmail = e;
          break;
        }
      }
      if (foundEmail) break;
    } catch {
      // ignore timeout
    }
  }

  return { email: foundEmail || `contact@${domain}`, phone: foundPhone };
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 6 });

  const existingRes = await pool.query(`
    SELECT lower(trim(email)) as email, lower(trim(company_name)) as cname
    FROM core_comercial.leads
    WHERE email IS NOT NULL
  `);

  const existingEmails = new Set();
  const existingDomains = new Set();
  const existingNames = new Set();

  for (const r of existingRes.rows) {
    if (r.email) {
      existingEmails.add(r.email);
      const d = r.email.split('@')[1];
      if (d) existingDomains.add(d);
    }
    if (r.cname) existingNames.add(r.cname);
  }

  const countVirginRes = await pool.query(`
    SELECT count(*) as cnt
    FROM core_comercial.leads l
    WHERE l.empresa_id = $1
      AND l.assigned_to = $2
      AND NOT ('Bounce' = ANY(COALESCE(l.tags, ARRAY[]::text[])))
      AND NOT ('E-mail Inválido' = ANY(COALESCE(l.tags, ARRAY[]::text[])))
      AND NOT EXISTS (
        SELECT 1 FROM core_comercial.marketing_campaign_queue q
        WHERE q.lead_id = l.id AND q.status = 'sent'
      )
  `, [WISEOWE_ID, FATUMATA_ID]);

  let currentNewCount = parseInt(countVirginRes.rows[0].cnt, 10) || 0;
  console.log(`🇫🇷 [FRANÇA - FATUMATA] Leads inéditos atuais: ${currentNewCount} / Meta: ${TARGET_NEW_LEADS}`);

  for (const dept of DEPARTMENTS) {
    if (currentNewCount >= TARGET_NEW_LEADS) break;

    for (const naf of NAF_CODES) {
      if (currentNewCount >= TARGET_NEW_LEADS) break;

      for (let page = 1; page <= 8; page++) {
        if (currentNewCount >= TARGET_NEW_LEADS) break;

        const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(naf.code)}&departement=${dept}&etat_administratif=A&per_page=25&page=${page}`;
        let results = [];
        try {
          const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
          if (res.status === 429) {
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          if (!res.ok) break;
          const data = await res.json();
          results = data.results || [];
          if (results.length === 0) break;
        } catch {
          break;
        }

        const batchPromises = results.map(async company => {
          const rawName = (company.nom_raison_sociale || company.nom_complet || '').trim();
          if (!rawName || rawName.length < 3) return null;
          const normName = rawName.toLowerCase();
          if (existingNames.has(normName)) return null;

          const slugs = extractBrandSlugs(rawName, company.sigle);
          if (slugs.length === 0) return null;

          let validDomain = null;
          for (const slug of slugs) {
            const domFr = `${slug}.fr`;
            if (!existingDomains.has(domFr) && !BLOCKED_DOMAINS.has(domFr)) {
              const ok = await verifyCorporateMx(domFr);
              if (ok) {
                validDomain = domFr;
                break;
              }
            }
          }

          if (!validDomain) return null;
          if (existingDomains.has(validDomain)) return null;

          const scraped = await scrapeWebsiteForFrenchEmailAndPhone(validDomain);
          const email = scraped.email.toLowerCase().trim();
          if (existingEmails.has(email) || existingDomains.has(validDomain)) return null;

          const siege = company.siege || {};
          const city = siege.libelle_commune || `Dept ${dept}`;

          return {
            companyName: rawName.slice(0, 140),
            normName,
            email,
            domain: validDomain,
            phone: scraped.phone || null,
            city,
            sector: naf.label
          };
        });

        const resolved = (await Promise.all(batchPromises)).filter(Boolean);

        for (const item of resolved) {
          if (currentNewCount >= TARGET_NEW_LEADS) break;
          if (existingDomains.has(item.domain) || existingEmails.has(item.email) || existingNames.has(item.normName)) continue;

          existingDomains.add(item.domain);
          existingEmails.add(item.email);
          existingNames.add(item.normName);

          try {
            await pool.query(`
              INSERT INTO core_comercial.leads (
                name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                ARRAY['França', 'B2B', $8, $9, 'Mailing Fatumata - Novos Capturados França 2026'],
                NOW(), NOW()
              )
            `, [
              item.companyName,
              item.companyName,
              item.email,
              item.phone,
              WISEOWE_ID,
              FATUMATA_ID,
              WISEOWE_STAGE_NOVO,
              item.sector,
              item.city
            ]);
            currentNewCount++;
            if (currentNewCount % 25 === 0 || currentNewCount >= TARGET_NEW_LEADS) {
              console.log(`🇫🇷 [FATUMATA PROGRESSO] ${currentNewCount}/${TARGET_NEW_LEADS} leads inéditos | Último: ${item.companyName} (${item.email})`);
            }
          } catch {
            // ignore duplicate constraint
          }
        }
      }
    }
  }

  console.log(`✅ [FRANÇA CONCLUÍDO] Total de leads inéditos para Fatumata: ${currentNewCount}`);
  await pool.end();
}

main().catch(console.error);
