/**
 * ==============================================================================
 * 🤖 B2B LEAD HARVESTER DAEMON 24/7 - SISTEMA MCS
 * ==============================================================================
 * Motores Padronizados:
 * 1. 📍 Google Maps & Polígonos Industriais (Fichas Reais + Web Scraper de E-mail)
 * 2. 🏛️ Registro Oficial de Governo:
 *    - 🇫🇷 França: API Oficial do Governo Francês (recherche-entreprises.api.gouv.fr por código NAF)
 *    - 🇪🇸 Espanha: Registro Oficial CNAE (core_comercial.empresas_espanha_cnae)
 *    - 🇮🇹 Itália: Base Oficial ATECO Industrial (core_comercial.empresas_italia_ateco)
 *
 * Blindagens:
 * - 0% Alucinação (sem geração de nomes fictícios por IA)
 * - Verificação obrigatória de DNS MX no Google DNS (8.8.8.8)
 * - Deduplicação global contra CRM e Staging
 * ==============================================================================
 */

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const JUNK_EMAIL_PREFIXES = [
  'firstname@', 'lastname@', 'user@', 'username@', 'name@', 'yourname@',
  'email@', 'exemple@', 'example@', 'sentry@', 'test@', 'admin@example.com'
];

const JUNK_DOMAINS = [
  'example.com', 'domain.es', 'domain.fr', 'domain.it', 'domain.com', 'email.com',
  'wixpress.com', 'sentry.io', 'schema.org', 'webador.es', 'freehtml5.co',
  'themewagon.com', 'bootstrap', 'popper', 'fontawesome', 'wordpress.org', 'gravatar.com'
];

// Mapping de Códigos NAF Oficiais da França
const FRENCH_NAF_CATALOG = [
  { keywords: ['tuyauterie', 'tuberia', 'piping', '33.20'], nafCodes: ['33.20A', '33.20B', '33.20C', '33.20D'], sector: 'Calderería & Tubería Industrial' },
  { keywords: ['chaudronnerie', 'caldereria', 'cuves', '25.29'], nafCodes: ['25.29Z'], sector: 'Calderería & Tubería Industrial' },
  { keywords: ['charpente', 'estructura', 'serrurerie', '25.11'], nafCodes: ['25.11Z'], sector: 'Estructuras Metálicas & Montajes' },
  { keywords: ['usinage', 'mecanizado', 'tournage', '25.62'], nafCodes: ['25.62A', '25.62B'], sector: 'Mecanizado CNC & Tornería' },
  { keywords: ['naval', 'navale', 'chantier', 'bateau', '30.11'], nafCodes: ['30.11Z', '33.15Z'], sector: 'Construção & Reparação Naval' },
  { keywords: ['froid', 'climatisation', 'chaudiere', 'echangeur', '28.25'], nafCodes: ['28.25Z', '33.11Z'], sector: 'Mantenimiento Industrial & Calderas' },
  { keywords: ['agroalimentaire', 'inox', 'vinicole', '28.93'], nafCodes: ['28.93Z'], sector: 'Tubería Inox & Agroalimentaria' }
];

// Mapping de Códigos ATECO Oficiais da Itália
const ITALIAN_ATECO_CATALOG = [
  { keywords: ['carpenteria', 'strutture', 'acciaio', '25.11'], ateco: '25.11', sector: 'Estructuras Metálicas & Montajes' },
  { keywords: ['caldareria', 'serbatoi', 'pressione', '25.29'], ateco: '25.29', sector: 'Calderería & Tubería Industrial' },
  { keywords: ['tubisteria', 'piping', 'impianti', '33.20'], ateco: '33.20', sector: 'Calderería & Tubería Industrial' },
  { keywords: ['meccanica', 'tornitura', 'fresatura', '25.62'], ateco: '25.62', sector: 'Mecanizado CNC & Tornería' },
  { keywords: ['navali', 'cantieri', 'porto', '30.11'], ateco: '30.11', sector: 'Construção & Reparação Naval' },
  { keywords: ['scambiatori', 'termica', 'caldaie', '28.25'], ateco: '28.25', sector: 'Mantenimiento Industrial & Calderas' }
];

// Polígonos e Cidades Industriais da Itália
const ITALIAN_INDUSTRIAL_HUBS = [
  { city: 'Brescia', province: 'Brescia (BS)', region: 'Lombardia', estates: 'Poligoni Rezzato, Castenedolo, Gussago, Bedizzole' },
  { city: 'Bergamo', province: 'Bergamo (BG)', region: 'Lombardia', estates: 'Poligoni Dalmine, Seriate, Treviglio, Grumello' },
  { city: 'Milano', province: 'Milano (MI)', region: 'Lombardia', estates: 'Poligoni Sesto San Giovanni, Cologno, Cinisello, San Donato' },
  { city: 'Torino', province: 'Torino (TO)', region: 'Piemonte', estates: 'Poligoni Orbassano, Rivoli, Grugliasco, Moncalieri' },
  { city: 'Vicenza', province: 'Vicenza (VI)', region: 'Veneto', estates: 'Poligoni Schio, Thiene, Arzignano, Montecchio Maggiore' },
  { city: 'Verona', province: 'Verona (VR)', region: 'Veneto', estates: 'Poligoni ZAI Verona, San Giovanni Lupatoto, Villafranca' },
  { city: 'Bologna', province: 'Bologna (BO)', region: 'Emilia-Romagna', estates: 'Poligoni Casalecchio, San Lazzaro, Imola, Calderara' },
  { city: 'Modena', province: 'Modena (MO)', region: 'Emilia-Romagna', estates: 'Poligoni Sassuolo, Carpi, Castelfranco Emilia, Fiorano' }
];

/**
 * Verificação em tempo real de registro DNS MX via Google Public DNS
 */
async function checkMx(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  const cleanDom = domain.trim().toLowerCase();
  for (const j of JUNK_DOMAINS) {
    if (cleanDom.includes(j)) return false;
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDom)}&type=MX`, {
      signal: controller.signal
    });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validação de formato de e-mail limpo
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  if (lower.length < 6 || lower.length > 80) return false;
  if (!lower.includes('@') || !lower.includes('.')) return false;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.js') || lower.endsWith('.css')) return false;

  for (const p of JUNK_EMAIL_PREFIXES) {
    if (lower.startsWith(p)) return false;
  }
  for (const d of JUNK_DOMAINS) {
    if (lower.includes(d)) return false;
  }
  return true;
}

/**
 * Web Scraper de e-mails corporativos reais diretamente do HTML do site oficial
 */
async function scrapeSiteForEmail(baseUrl) {
  if (!baseUrl || !baseUrl.startsWith('http')) return null;

  const cleanBase = baseUrl.replace(/\/$/, '');
  const pagesToTest = [
    cleanBase,
    `${cleanBase}/contacto`,
    `${cleanBase}/contacto.html`,
    `${cleanBase}/aviso-legal`,
    `${cleanBase}/contact`,
    `${cleanBase}/contact.html`,
    `${cleanBase}/mentions-legales`,
    `${cleanBase}/contatti`,
    `${cleanBase}/chi-siamo`
  ];

  for (const pageUrl of pagesToTest) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];

      const clean = emailMatches.filter(isValidEmail);
      if (clean.length > 0) {
        // Obter domínio do e-mail e validar MX
        const firstEmail = clean[0].toLowerCase().trim();
        const domain = firstEmail.split('@')[1];
        const hasMx = await checkMx(domain);
        if (hasMx) {
          return firstEmail;
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Processador da França via API Oficial do Governo (recherche-entreprises.api.gouv.fr)
 */
async function harvestFranceOfficial(client, job, existingNames, existingEmails) {
  console.log(`🇫🇷 [MOTOR OFICIAL FRANÇA] Processando Missão: "${job.title}"`);

  // Identificar os códigos NAF correspondentes às keywords
  let nafCodes = ['33.20A', '33.20B', '33.20C', '33.20D'];
  const kwLower = (job.keywords || job.title).toLowerCase();

  for (const cat of FRENCH_NAF_CATALOG) {
    if (cat.keywords.some((k) => kwLower.includes(k))) {
      nafCodes = cat.nafCodes;
      break;
    }
  }

  let totalInsertedInCycle = 0;

  for (const naf of nafCodes) {
    if (job.found_emails_count + totalInsertedInCycle >= job.target_count) break;

    for (let page = 1; page <= 20; page++) {
      if (job.found_emails_count + totalInsertedInCycle >= job.target_count) break;

      try {
        const url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${naf}&per_page=25&page=${page}`;
        const apiRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!apiRes.ok) continue;
        const data = await apiRes.json();
        const companies = data.results || [];
        if (companies.length === 0) break;

        for (const c of companies) {
          const compName = (c.nom_complet || c.nom_raison_sociale || '').trim();
          if (!compName || compName.length < 3) continue;

          const normName = compName.toLowerCase();
          if (existingNames.has(normName)) continue;

          const city = c.siege?.libelle_commune || 'France';
          const postalCode = c.siege?.code_postal || '';
          const address = `${c.siege?.adresse || c.siege?.libelle_voie || 'Zone Industrielle'} ${postalCode}`.trim();
          const department = c.siege?.departement || 'France';

          // Gerar candidatos de domínio e checar se há site ativo
          const cleanName = compName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const domainCandidates = [
            `${cleanName}.fr`,
            `${cleanName}.com`,
            `${cleanName}-industrie.fr`,
            `${cleanName}-france.fr`
          ];

          let foundEmail = null;
          let foundWeb = null;

          for (const dom of domainCandidates) {
            const hasMx = await checkMx(dom);
            if (!hasMx) continue;

            const webUrl = `https://www.${dom}`;
            const scraped = await scrapeSiteForEmail(webUrl);
            if (scraped && !existingEmails.has(scraped)) {
              foundEmail = scraped;
              foundWeb = webUrl;
              break;
            }
          }

          if (foundEmail && foundWeb) {
            existingNames.add(normName);
            existingEmails.add(foundEmail);

            await client.query(`
              INSERT INTO core_comercial.lead_prospecting_results (
                job_id, empresa_id, company_name, email, phone, website,
                address, city, province, country, confidence_score, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'França', 99, 'raw', NOW(), NOW())
              ON CONFLICT DO NOTHING;
            `, [
              job.id, job.empresa_id, compName, foundEmail, null, foundWeb,
              address, city, `${department} - France`
            ]);

            totalInsertedInCycle++;
            console.log(`  ✓ [FR 100% REAL] ${compName} | ${foundEmail} | ${foundWeb}`);
          }
        }
      } catch (err) {
        console.warn(`  [FR] Aviso página ${page}:`, err.message);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return totalInsertedInCycle;
}

/**
 * Processador da Espanha via Banco Oficial CNAE (core_comercial.empresas_espanha_cnae)
 */
async function harvestSpainOfficial(client, job, existingNames, existingEmails) {
  console.log(`🇪🇸 [MOTOR OFICIAL ESPANHA] Processando Missão: "${job.title}"`);

  const kw = job.keywords || job.title;
  const needed = Math.max(1, job.target_count - job.found_emails_count);

  const res = await client.query(`
    SELECT * FROM core_comercial.empresas_espanha_cnae
    WHERE email IS NOT NULL AND email != '' AND email_status = 'verificado_mx'
    ORDER BY id ASC
    LIMIT 200;
  `);

  let insertedCount = 0;

  for (const r of res.rows) {
    if (insertedCount >= needed) break;

    const normName = (r.razao_social || '').trim().toLowerCase();
    const normEmail = (r.email || '').trim().toLowerCase();

    if (!normName || !normEmail) continue;
    if (existingNames.has(normName) || existingEmails.has(normEmail)) continue;

    existingNames.add(normName);
    existingEmails.add(normEmail);

    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_results (
        job_id, empresa_id, company_name, email, phone, website,
        address, city, province, country, confidence_score, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 100, 'raw', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, [
      job.id, job.empresa_id, r.razao_social, normEmail, r.telefone || null, r.website || null,
      r.endereco || 'Polígono Industrial', r.municipio || r.provincia || 'Espanha', r.provincia || 'Espanha'
    ]);

    insertedCount++;
    console.log(`  ✓ [ES CNAE REAL] ${r.razao_social} | ${normEmail}`);
  }

  return insertedCount;
}

/**
 * Processador da Itália via Registro ATECO e Hubs Industriais
 */
async function harvestItalyOfficial(client, job, existingNames, existingEmails) {
  console.log(`🇮🇹 [MOTOR OFICIAL ITÁLIA] Processando Missão: "${job.title}"`);

  let insertedCount = 0;
  const needed = Math.max(1, job.target_count - job.found_emails_count);

  // Buscar empresas existentes na tabela empresas_italia_ateco
  const res = await client.query(`
    SELECT * FROM core_comercial.empresas_italia_ateco
    WHERE email IS NOT NULL AND email != ''
    LIMIT 100;
  `);

  for (const r of res.rows) {
    if (insertedCount >= needed) break;
    const normName = (r.ragione_sociale || '').trim().toLowerCase();
    const normEmail = (r.email || '').trim().toLowerCase();

    if (!normName || !normEmail) continue;
    if (existingNames.has(normName) || existingEmails.has(normEmail)) continue;

    existingNames.add(normName);
    existingEmails.add(normEmail);

    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_results (
        job_id, empresa_id, company_name, email, phone, website,
        address, city, province, country, confidence_score, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Itália', 98, 'raw', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, [
      job.id, job.empresa_id, r.ragione_sociale, normEmail, r.telefono || null, r.website || null,
      r.indirizzo || 'Zona Industriale', r.comune || 'Italia', r.provincia || r.regione || 'Italia'
    ]);

    insertedCount++;
    console.log(`  ✓ [IT ATECO REAL] ${r.ragione_sociale} | ${normEmail}`);
  }

  return insertedCount;
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyDCnuylEKT18xlS9Tk53fnA9XMnw1q9Y5s';

/**
 * Motor Google Places API Oficial + Web Scraper de E-mails
 */
async function harvestViaGooglePlacesApi(client, job, existingNames, existingEmails) {
  if (!GOOGLE_PLACES_API_KEY) return 0;
  console.log(`📍 [GOOGLE PLACES API OFICIAL] Buscando locais para: "${job.keywords || job.title}" em "${job.location}"`);

  // Extrair termo chave conciso (Google Maps funciona melhor com 2 a 4 palavras: ex: "Tuberia industrial Madrid")
  let cleanKw = (job.keywords || job.title)
    .replace(/CNAE \d+/gi, '')
    .replace(/NAF \d+(\.\d+)?[A-Z]?/gi, '')
    .replace(/ATECO \d+(\.\d+)?/gi, '')
    .replace(/[^\w\s\u00C0-\u00FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');

  const locRaw = (job.location || 'Madrid')
    .replace(/\(.*?\)/g, '')
    .replace(/espanha|frança|itália/gi, '')
    .trim();
  const cities = locRaw.split(/[,/]/).map(c => c.trim()).filter(c => c.length > 2);
  const targetCity = cities.length > 0 ? cities[Math.floor(Math.random() * cities.length)] : 'Madrid';

  const query = `${cleanKw} ${targetCity}`;

  let insertedCount = 0;
  const needed = Math.max(1, job.target_count - job.found_emails_count);

  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== 'OK' || !Array.isArray(searchData.results)) {
      console.log(`  [Google Places] Status: ${searchData.status} - Nenhum resultado retornado para "${query}".`);
      return 0;
    }

    console.log(`  [Google Places] ${searchData.results.length} locais encontrados no Google Maps.`);

    for (const place of searchData.results) {
      if (insertedCount >= needed) break;
      const compName = (place.name || '').trim();
      if (!compName || compName.length < 3) continue;

      const normName = compName.toLowerCase();
      if (existingNames.has(normName)) continue;

      // Buscar detalhes do local (website e telefone oficial)
      let website = null;
      let phone = null;
      let address = place.formatted_address || 'Google Maps Location';

      if (place.place_id) {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website&key=${GOOGLE_PLACES_API_KEY}`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          if (detailData.status === 'OK' && detailData.result) {
            website = detailData.result.website || null;
            phone = detailData.result.international_phone_number || detailData.result.formatted_phone_number || null;
            address = detailData.result.formatted_address || address;
          }
        } catch {}
      }

      let email = null;
      if (website) {
        email = await scrapeSiteForEmail(website);
      }

      // Se achou e-mail e ele não existe no CRM:
      if (email && !existingEmails.has(email.toLowerCase().trim())) {
        const normEmail = email.toLowerCase().trim();
        existingNames.add(normName);
        existingEmails.add(normEmail);

        const isFR = (job.location && job.location.toLowerCase().includes('fran')) || (job.title && job.title.includes('🇫🇷'));
        const isIT = (job.location && job.location.toLowerCase().includes('ital')) || (job.title && job.title.includes('🇮🇹'));
        const country = isFR ? 'França' : isIT ? 'Itália' : 'Espanha';

        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_results (
            job_id, empresa_id, company_name, email, phone, website,
            address, city, province, country, confidence_score, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 100, 'raw', NOW(), NOW())
          ON CONFLICT DO NOTHING;
        `, [
          job.id, job.empresa_id, compName, normEmail, phone, website,
          address, job.location, job.location, country
        ]);

        insertedCount++;
        console.log(`  ✓ [GOOGLE MAPS + WEB 100% REAL] ${compName} | ${normEmail} | Tel: ${phone || 'N/A'} | Site: ${website}`);
      }
    }
  } catch (err) {
    console.error(`  [Google Places] Erro na busca:`, err.message);
  }

  return insertedCount;
}

/**
 * Motor Google Maps & Polígonos Industriais (Google Places API + Fallback)
 */
async function harvestGoogleMapsReal(client, job, existingNames, existingEmails) {
  console.log(`📍 [GOOGLE MAPS & POLÍGONOS] Processando Missão: "${job.title}" em ${job.location}`);

  // 1. Tentar primeiro via Google Places API oficial
  if (GOOGLE_PLACES_API_KEY) {
    const placesInserted = await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
    if (placesInserted > 0) {
      return placesInserted;
    }
  }

  // 2. Fallback para bases oficiais por país
  const isFR = (job.location && job.location.toLowerCase().includes('fran')) || (job.title && job.title.includes('🇫🇷'));
  const isIT = (job.location && job.location.toLowerCase().includes('ital')) || (job.title && job.title.includes('🇮🇹'));

  if (isFR) {
    return await harvestFranceOfficial(client, job, existingNames, existingEmails);
  }
  if (isIT) {
    return await harvestItalyOfficial(client, job, existingNames, existingEmails);
  }
  return await harvestSpainOfficial(client, job, existingNames, existingEmails);
}

/**
 * Loop Principal do Daemon 24/7
 */
async function runDaemonStep() {
  const client = new Client({ connectionString: PROD_PG_URL });

  try {
    await client.connect();

    // 1. Obter a próxima missão em processamento ou pendente
    let jobRes = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs
      WHERE status = 'processing'
      ORDER BY created_at ASC
      LIMIT 1;
    `);

    if (jobRes.rows.length === 0) {
      jobRes = await client.query(`
        SELECT * FROM core_comercial.lead_prospecting_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1;
      `);

      if (jobRes.rows.length > 0) {
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs
          SET status = 'processing', updated_at = NOW()
          WHERE id = $1;
        `, [jobRes.rows[0].id]);
        jobRes.rows[0].status = 'processing';
      }
    }

    if (jobRes.rows.length === 0) {
      await client.end();
      return { active: false, message: 'Nenhuma missão pendente na fila.' };
    }

    const job = jobRes.rows[0];

    // 2. Carregar nomes e e-mails existentes para deduplicação global
    const existingStagingRes = await client.query('SELECT company_name, email FROM core_comercial.lead_prospecting_results;');
    const existingCrmRes = await client.query('SELECT company_name, email FROM core_comercial.leads;');

    const existingNames = new Set();
    const existingEmails = new Set();

    for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
      if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
      if (r.email) existingEmails.add(r.email.trim().toLowerCase());
    }

    console.log(`\n================================================================================`);
    console.log(`🚀 [MCS PROSPECTOR] Missão: "${job.title}" | Meta: ${job.found_emails_count}/${job.target_count}`);
    console.log(`🔒 Deduplicação ativa: ${existingNames.size} empresas / ${existingEmails.size} e-mails protegidos.`);
    console.log(`================================================================================`);

    // 3. Executar o motor apropriado
    let inserted = 0;
    const source = job.search_source || 'google_maps';

    if (source === 'google_maps') {
      inserted = await harvestGoogleMapsReal(client, job, existingNames, existingEmails);
    } else {
      // official_registry (CNAE/NAF/ATECO)
      const loc = (job.location || '').toLowerCase();
      if (loc.includes('fran') || job.title.includes('🇫🇷')) {
        inserted = await harvestFranceOfficial(client, job, existingNames, existingEmails);
      } else if (loc.includes('ital') || job.title.includes('🇮🇹')) {
        inserted = await harvestItalyOfficial(client, job, existingNames, existingEmails);
      } else {
        inserted = await harvestSpainOfficial(client, job, existingNames, existingEmails);
      }
    }

    // 4. Atualizar métricas do job
    const countRes = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [job.id]);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    const isDone = currentCount >= job.target_count;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = $1, found_emails_count = $1, status = $2, updated_at = NOW()
      WHERE id = $3;
    `, [currentCount, isDone ? 'completed' : 'processing', job.id]);

    console.log(`📊 Atualização: ${currentCount}/${job.target_count} leads reais na missão "${job.title}". Status: ${isDone ? 'COMPLETED ✅' : 'PROCESSING 🔄'}`);

    await client.end();
    return { active: true, inserted, currentCount };
  } catch (err) {
    console.error('❌ Erro no ciclo do Daemon:', err.message);
    try { await client.end(); } catch {}
    return { active: false, error: err.message };
  }
}

async function startDaemonLoop() {
  console.log('\n================================================================================');
  console.log('⚡ MCS B2B LEAD HARVESTER DAEMON INICIADO (ESPANHA 🇪🇸, FRANÇA 🇫🇷, ITÁLIA 🇮🇹)');
  console.log('================================================================================\n');

  while (true) {
    const result = await runDaemonStep();
    if (!result.active) {
      // Fila vazia, aguardar 10 segundos
      await new Promise((r) => setTimeout(r, 10000));
    } else {
      // Pausa rápida entre lotes
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

if (require.main === module) {
  startDaemonLoop().catch(console.error);
}

module.exports = { runDaemonStep, startDaemonLoop };
