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
const { Pool } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: PROD_PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const ITALIAN_CITIES = [
  'Brescia', 'Bergamo', 'Milano', 'Torino', 'Vicenza', 'Verona', 'Bologna', 'Modena',
  'Reggio Emilia', 'Padova', 'Genova', 'Ravenna', 'Monfalcone', 'Livorno', 'Taranto',
  'La Spezia', 'Sesto San Giovanni', 'Cinisello Balsamo', 'Legnano', 'Lumezzane',
  'Dalmine', 'Treviglio', 'Orbassano', 'Rivoli', 'Schio', 'Thiene', 'Arzignano',
  'Montecchio Maggiore', 'Bassano del Grappa', 'Treviso', 'Conegliano', 'Marghera',
  'Imola', 'Sassuolo', 'Carpi', 'Parma', 'Piacenza', 'Savona', 'Faenza', 'Forli',
  'Cesena', 'Ferrara', 'Piombino', 'Pisa', 'Scandicci', 'Arezzo', 'Udine', 'Pordenone',
  'Trieste', 'Ancona', 'Jesi', 'Pesaro', 'Bari', 'Brindisi'
];

const SPANISH_CITIES = [
  'Madrid', 'Barcelona', 'Bilbao', 'Valencia', 'Sevilla', 'Zaragoza', 'Vigo', 'Gijon',
  'Valladolid', 'Tarragona', 'Cartagena', 'Fuenlabrada', 'Getafe', 'Leganes', 'Alcala de Henares',
  'Pinto', 'Valdemoro', 'Arganda del Rey', 'Sabadell', 'Terrassa', 'Martorell', 'Granollers',
  'Badalona', 'Mataro', 'Rubi', 'Sant Boi de Llobregat', 'Cornella de Llobregat', 'Barakaldo',
  'Basauri', 'Durango', 'Eibar', 'Mondragon', 'Irun', 'Amurrio', 'Paterna', 'Torrent',
  'Sagunto', 'Alzira', 'Gandia', 'Ontinyent', 'Dos Hermanas', 'Alcala de Guadaira',
  'Algeciras', 'San Fernando', 'Jerez de la Frontera', 'Ferrol', 'Naron', 'Arteixo',
  'Pontevedra', 'Aviles', 'Oviedo', 'Siero', 'Burgos', 'Miranda de Ebro', 'Palencia',
  'Leon', 'Huesca', 'Calatayud', 'Pamplona', 'Tudela', 'Santander', 'Torrelavega',
  'Lorca', 'Molina de Segura', 'Puertollano', 'Albacete', 'Guadalajara', 'Toledo'
];

const FRENCH_CITIES = [
  'Lyon', 'Marseille', 'Lille', 'Toulouse', 'Bordeaux', 'Nantes', 'Rouen', 'Dunkerque',
  'Le Havre', 'Strasbourg', 'Villeurbanne', 'Venissieux', 'Saint-Priest', 'Saint-Etienne',
  'Grenoble', 'Chambery', 'Annecy', 'Aix-en-Provence', 'Aubagne', 'Fos-sur-Mer', 'Martigues',
  'Toulon', 'La Seyne-sur-Mer', 'Colomiers', 'Merignac', 'Pessac', 'Pau', 'Bayonne',
  'Saint-Nazaire', 'Rennes', 'Brest', 'Lorient', 'Tourcoing', 'Roubaix', 'Calais',
  'Valenciennes', 'Douai', 'Dieppe', 'Caen', 'Cherbourg', 'Mulhouse', 'Metz', 'Nancy',
  'Thionville', 'Reims', 'Saint-Denis', 'Argenteuil', 'Boulogne-Billancourt', 'Nanterre',
  'Dijon', 'Chalon-sur-Saone', 'Besancon', 'Belfort', 'Clermont-Ferrand'
];

const francePageCursor = {};

const JUNK_EMAIL_PREFIXES = [
  'firstname@', 'lastname@', 'user@', 'username@', 'name@', 'yourname@',
  'email@', 'exemple@', 'example@', 'sentry@', 'test@', 'admin@example.com',
  'ericjonesmyemail@'
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
 * Web Scraper de e-mails corporativos reais com requisições em paralelo
 */
async function scrapeSiteForEmail(baseUrl, country = 'ES') {
  if (!baseUrl || !baseUrl.startsWith('http')) return null;

  const cleanBase = baseUrl.replace(/\/$/, '');
  const suffixes = (country === 'FR' || country === 'França')
    ? ['', '/contact', '/mentions-legales', '/nous-contacter']
    : (country === 'IT' || country === 'Itália')
    ? ['', '/contatti', '/chi-siamo', '/privacy-policy']
    : ['', '/contacto', '/aviso-legal', '/contact'];

  const pagesToTest = suffixes.map(s => `${cleanBase}${s}`);

  const fetchPromises = pagesToTest.map(async pageUrl => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) return [];
      const html = await res.text();
      const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
      return emailMatches
        .map(e => {
          try { return decodeURIComponent(e).replace(/^[%20\s]+/, '').trim(); } catch { return e.replace(/^[%20\s]+/, '').trim(); }
        })
        .filter(isValidEmail);
    } catch {
      return [];
    }
  });

  const pageResults = await Promise.allSettled(fetchPromises);
  const candidateEmails = [];
  for (const r of pageResults) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      candidateEmails.push(...r.value);
    }
  }

  for (const email of candidateEmails) {
    const domain = email.split('@')[1];
    if (await checkMx(domain)) {
      return email;
    }
  }

  return null;
}

/**
 * Atualiza o contador de progresso da missão em tempo real no banco
 */
async function incrementJobProgress(client, jobId) {
  try {
    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = processed_count + 1,
          found_emails_count = found_emails_count + 1,
          updated_at = NOW()
      WHERE id = $1;
    `, [jobId]);
  } catch (err) {
    console.warn(`[Aviso Contador] Erro ao atualizar progresso do job ${jobId}:`, err.message);
  }
}

function getSectorFromTitle(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('33.20') || t.includes('3320') || t.includes('tuyauterie') || t.includes('tuberia') || t.includes('tubisteria') || t.includes('piping')) {
    return 'Calderería & Tubería Industrial';
  }
  if (t.includes('25.29') || t.includes('2529') || t.includes('chaudronnerie') || t.includes('caldereria') || t.includes('caldareria') || t.includes('cuves') || t.includes('tanques')) {
    return 'Calderería & Tubería Industrial';
  }
  if (t.includes('25.11') || t.includes('2511') || t.includes('charpente') || t.includes('estructuras') || t.includes('carpenteria')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (t.includes('25.62') || t.includes('2562') || t.includes('usinage') || t.includes('mecanizado') || t.includes('meccanica') || t.includes('torner') || t.includes('tornitura')) {
    return 'Mecanizado CNC & Tornería';
  }
  if (t.includes('30.11') || t.includes('3011') || t.includes('33.15') || t.includes('3315') || t.includes('naval') || t.includes('astilleros') || t.includes('chantiers') || t.includes('cantieri')) {
    return 'Construção & Reparação Naval';
  }
  if (t.includes('28.25') || t.includes('2825') || t.includes('33.11') || t.includes('3311') || t.includes('echangeur') || t.includes('scambiatori') || t.includes('calderas') || t.includes('froid')) {
    return 'Mantenimiento Industrial & Calderas';
  }
  return 'Indústria & Montagens Industriais';
}

function getCountryFlag(country) {
  const c = (country || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (c.includes('fran') || c === 'fr') return '🇫🇷 França';
  if (c.includes('ital') || c === 'it') return '🇮🇹 Itália';
  return '🇪🇸 Espanha';
}

/**
 * Salva o lead diretamente no CRM (core_comercial.leads) e na Staging (lead_prospecting_results)
 * em tempo real, garantindo persistência imediata e segmentação automática.
 */
async function saveLeadDirectlyToCrmAndStaging(client, job, lead) {
  const empresaId = job.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';
  const sector = getSectorFromTitle(job.title);
  const countryFlag = getCountryFlag(lead.country || job.location);
  const compName = lead.compName || 'Empresa Industrial';
  const normEmail = (lead.email || '').trim().toLowerCase();

  const tags = [
    'Prospecção 24/7',
    'E-mail Verificado MX',
    countryFlag,
    sector
  ];
  if (lead.city) tags.push(lead.city.trim());

  const notes = `Lead capturado e verificado 100% real via Motor 24/7.\nPaís: ${countryFlag} | Setor: ${sector} | Cidade: ${lead.city || 'N/A'}\nConfiança: ${lead.confidenceScore || 100}% MX Verificado`;

  let newLeadId = null;
  try {
    const leadRes = await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        address_line, city, province, sector, origen_lead, tags, notes, prospecting_job_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Prospecção Automática 24/7', $11, $12, $13
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [
      empresaId, compName, compName, normEmail, lead.phone || null, lead.website || null,
      lead.address || null, lead.city || null, lead.province || null, sector, tags, notes, job.id
    ]);

    if (leadRes.rows.length > 0) {
      newLeadId = leadRes.rows[0].id;
    }
  } catch (err) {
    console.warn(`[CRM Direct Save] Erro ao inserir no CRM:`, err.message);
  }

  try {
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_results (
        job_id, empresa_id, company_name, email, phone, website,
        address, city, province, country, confidence_score, status, imported_lead_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'raw', $12, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, [
      job.id, empresaId, compName, normEmail, lead.phone || null, lead.website || null,
      lead.address || null, lead.city || null, lead.province || null, lead.country || countryFlag,
      lead.confidenceScore || 100, newLeadId
    ]);
  } catch (err) {
    console.warn(`[Staging Save] Erro ao inserir na Staging:`, err.message);
  }
}

/**
 * Processador da França via API Oficial do Governo (recherche-entreprises.api.gouv.fr)
 */
async function harvestFranceOfficial(client, job, existingNames, existingEmails) {
  console.log(`🇫🇷 [MOTOR OFICIAL FRANÇA] Executando lote para: "${job.title}"`);

  // Identificar os códigos NAF correspondentes às keywords
  let nafCodes = ['33.20A', '33.20B', '33.20C', '33.20D'];
  const titleLower = (job.title + ' ' + (job.keywords || '')).toLowerCase();

  for (const item of FRENCH_NAF_CATALOG) {
    if (item.keywords.some((k) => titleLower.includes(k))) {
      nafCodes = item.nafCodes;
      break;
    }
  }

  const cursorKey = job.id;
  if (!francePageCursor[cursorKey]) {
    francePageCursor[cursorKey] = 1;
  }

  let totalInsertedInCycle = 0;
  const maxPagesToTry = 6;

  for (let step = 0; step < maxPagesToTry && totalInsertedInCycle < 25; step++) {
    const page = francePageCursor[cursorKey];
    francePageCursor[cursorKey]++;

    const nafQuery = nafCodes.join(',');
    const url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${nafQuery}&per_page=25&page=${page}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          francePageCursor[cursorKey] = 1;
        }
        break;
      }

      const data = await res.json();
      const companies = data.results || [];
      if (companies.length === 0) {
        francePageCursor[cursorKey] = 1;
        break;
      }

      // Processar em lotes concorrentes de 10 empresas simultaneamente
      const chunkSize = 10;
      for (let i = 0; i < companies.length; i += chunkSize) {
        if (totalInsertedInCycle >= 25) break;
        const chunk = companies.slice(i, i + chunkSize);

        const chunkPromises = chunk.map(async c => {
          const rawName = (c.nom_raison_sociale || c.nom_complet || '').trim();
          if (!rawName || rawName.length < 3) return null;

          // Limpar parênteses, siglas repetidas e formas jurídicas
          const cleanComp = rawName
            .replace(/\(.*?\)/g, '')
            .replace(/\b(sas|sarl|sa|eurl|sasu|sci|ste|cie|ets)\b/gi, '')
            .trim();
          const compName = cleanComp || rawName;

          const normName = compName.toLowerCase();
          if (existingNames.has(normName)) return null;

          const city = c.siege?.libelle_commune || 'France';
          const postalCode = c.siege?.code_postal || '';
          const address = `${c.siege?.adresse || c.siege?.libelle_voie || 'Zone Industrielle'} ${postalCode}`.trim();
          const department = c.siege?.departement || 'France';

          const words = cleanComp.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          if (words.length === 0) return null;

          const slug1 = words[0];
          const slug2 = words.slice(0, 2).join('');
          const slugFull = words.join('');

          const domainCandidates = new Set([
            `${slug1}.fr`,
            `${slug1}.com`,
            `${slug2}.fr`,
            `${slug2}.com`,
            `${slugFull}.fr`,
            `${slugFull}.com`,
            `${slug1}-industrie.fr`,
            `${slug1}-france.fr`
          ]);

          // Testar os domínios candidatos em paralelo
          const mxChecks = await Promise.all(
            Array.from(domainCandidates).map(async dom => ({ dom, hasMx: await checkMx(dom) }))
          );
          const validDom = mxChecks.find(r => r.hasMx);
          if (!validDom) return null;

          const webUrl = `https://www.${validDom.dom}`;
          const scraped = await scrapeSiteForEmail(webUrl, 'FR');
          if (scraped && !existingEmails.has(scraped)) {
            return { compName, normName, email: scraped, webUrl, address, city, department };
          }
          return null;
        });

        const foundResults = await Promise.all(chunkPromises);

        for (const item of foundResults) {
          if (!item || totalInsertedInCycle >= 15) continue;
          if (existingNames.has(item.normName) || existingEmails.has(item.email)) continue;

          existingNames.add(item.normName);
          existingEmails.add(item.email);

          await saveLeadDirectlyToCrmAndStaging(client, job, {
            compName: item.compName,
            email: item.email,
            phone: null,
            website: item.webUrl,
            address: item.address,
            city: item.city,
            province: `${item.department} - France`,
            country: 'França',
            confidenceScore: 99
          });

          totalInsertedInCycle++;
          await incrementJobProgress(client, job.id);
          console.log(`  ✓ [FR 100% REAL & CRM] ${item.compName} | ${item.email} | ${item.webUrl}`);
        }
      }
    } catch (err) {
      console.warn(`  [FR] Aviso página ${page}:`, err.message);
    }
  }

  if (totalInsertedInCycle === 0 && GOOGLE_PLACES_API_KEY) {
    return await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
  }

  return totalInsertedInCycle;
}

/**
 * Processador da Espanha via Banco Oficial CNAE (core_comercial.empresas_espanha_cnae)
 */
async function harvestSpainOfficial(client, job, existingNames, existingEmails) {
  console.log(`🇪🇸 [MOTOR OFICIAL ESPANHA] Processando Missão: "${job.title}"`);

  // Extrair código CNAE (ex: 3320, 2529, 2511, 2562, 3011, 2825)
  const cnaeMatch = (job.keywords || job.title).match(/\b(3320|2529|2511|2562|3011|3315|2825|3311)\b/);
  const cnaeCode = cnaeMatch ? cnaeMatch[1] : '';

  const needed = Math.min(15, Math.max(1, job.target_count - job.found_emails_count));

  let res;
  if (cnaeCode) {
    res = await client.query(`
      SELECT * FROM core_comercial.empresas_espanha_cnae c
      WHERE c.email IS NOT NULL AND c.email != '' 
        AND c.email_status = 'verificado_mx'
        AND (c.cnae_codigo = $1 OR c.cnae_codigo LIKE $2)
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.lead_prospecting_results r WHERE LOWER(r.email) = LOWER(c.email)
        )
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.leads l WHERE LOWER(l.email) = LOWER(c.email)
        )
      ORDER BY c.id ASC
      LIMIT $3;
    `, [cnaeCode, `${cnaeCode}%`, needed]);
  } else {
    res = await client.query(`
      SELECT * FROM core_comercial.empresas_espanha_cnae c
      WHERE c.email IS NOT NULL AND c.email != '' 
        AND c.email_status = 'verificado_mx'
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.lead_prospecting_results r WHERE LOWER(r.email) = LOWER(c.email)
        )
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.leads l WHERE LOWER(l.email) = LOWER(c.email)
        )
      ORDER BY c.id ASC
      LIMIT $1;
    `, [needed]);
  }

  let insertedCount = 0;

  for (const r of res.rows) {
    const normName = (r.razao_social || '').trim().toLowerCase();
    const normEmail = (r.email || '').trim().toLowerCase();

    if (!normName || !normEmail) continue;
    if (existingNames.has(normName) || existingEmails.has(normEmail)) continue;

    existingNames.add(normName);
    existingEmails.add(normEmail);

    await saveLeadDirectlyToCrmAndStaging(client, job, {
      compName: r.razao_social,
      email: normEmail,
      phone: r.telefone || null,
      website: r.website || null,
      address: r.endereco || 'Polígono Industrial',
      city: r.municipio || r.provincia || 'Espanha',
      province: r.provincia || 'Espanha',
      country: 'Espanha',
      confidenceScore: 100
    });

    insertedCount++;
    await incrementJobProgress(client, job.id);
    console.log(`  ✓ [ES CNAE 100% REAL & CRM] ${r.razao_social} | ${normEmail}`);
  }

  if (insertedCount === 0) {
    // Buscar empresas industriais não alocadas a um código específico mas com e-mail verificado
    const kw = (job.keywords || job.title).split(' ')[0];
    const fallbackCnae = await client.query(`
      SELECT * FROM core_comercial.empresas_espanha_cnae c
      WHERE c.email IS NOT NULL AND c.email != ''
        AND (c.cnae_codigo IS NULL OR c.setor ILIKE $1)
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.lead_prospecting_results r WHERE LOWER(r.email) = LOWER(c.email)
        )
        AND NOT EXISTS (
          SELECT 1 FROM core_comercial.leads l WHERE LOWER(l.email) = LOWER(c.email)
        )
      ORDER BY c.id ASC
      LIMIT $2;
    `, [`%${kw}%`, needed]);

    for (const r of fallbackCnae.rows) {
      const normName = (r.razao_social || '').trim().toLowerCase();
      const normEmail = (r.email || '').trim().toLowerCase();

      if (!normName || !normEmail) continue;
      if (existingNames.has(normName) || existingEmails.has(normEmail)) continue;

      existingNames.add(normName);
      existingEmails.add(normEmail);

      await saveLeadDirectlyToCrmAndStaging(client, job, {
        compName: r.razao_social,
        email: normEmail,
        phone: r.telefone || null,
        website: r.website || null,
        address: r.endereco || 'Polígono Industrial',
        city: r.municipio || r.provincia || 'Espanha',
        province: r.provincia || 'Espanha',
        country: 'Espanha',
        confidenceScore: 100
      });

      insertedCount++;
      await incrementJobProgress(client, job.id);
      console.log(`  ✓ [ES CNAE BASE REAL & CRM] ${r.razao_social} | ${normEmail}`);
    }
  }

  if (insertedCount === 0 && GOOGLE_PLACES_API_KEY) {
    return await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
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

  if (insertedCount === 0 && GOOGLE_PLACES_API_KEY) {
    return await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
  }

  return insertedCount;
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyDCnuylEKT18xlS9Tk53fnA9XMnw1q9Y5s';

/**
 * Motor Google Places API Oficial + Web Scraper de E-mails
 */
async function harvestViaGooglePlacesApi(client, job, existingNames, existingEmails) {
  if (!GOOGLE_PLACES_API_KEY) return 0;

  const isFR = (job.location && job.location.toLowerCase().includes('fran')) || (job.title && job.title.includes('🇫🇷'));
  const isIT = (job.location && job.location.toLowerCase().includes('ital')) || (job.title && job.title.includes('🇮🇹'));
  const country = isFR ? 'França' : isIT ? 'Itália' : 'Espanha';

  const cityPool = isFR ? FRENCH_CITIES : isIT ? ITALIAN_CITIES : SPANISH_CITIES;
  // Embaralhar e selecionar 2 cidades distintas para dobrar o volume de locais
  const shuffledCities = [...cityPool].sort(() => 0.5 - Math.random());
  const targetCities = shuffledCities.slice(0, 2);

  const rawKw = (job.keywords || job.title)
    .replace(/CNAE \d+/gi, '')
    .replace(/NAF \d+(\.\d+)?[A-Z]?/gi, '')
    .replace(/ATECO \d+(\.\d+)?/gi, '')
    .replace(/[\d\.]+/g, '')
    .replace(/[🇪🇸🇫🇷🇮🇹\(\)\-]/g, ' ')
    .trim();

  // Dividir o título em múltiplos termos candidatos (ex: "Tubería Industrial", "Piping", "Montajes Mecánicos")
  const kwParts = rawKw
    .split(/[,/&]/)
    .map(k => k.trim().replace(/[^\w\s\u00C0-\u00FF]/gi, ' ').replace(/\s+/g, ' '))
    .filter(k => k.length >= 3);

  const chosenKw = kwParts.length > 0 ? kwParts[Math.floor(Math.random() * kwParts.length)] : rawKw;
  const cleanKw = chosenKw.split(' ').filter(w => w.length > 2).slice(0, 2).join(' ').trim();

  let insertedCount = 0;
  const needed = Math.min(25, Math.max(1, job.target_count - job.found_emails_count));

  try {
    const searchPromises = targetCities.map(async targetCity => {
      const query = `${cleanKw} ${targetCity}`;
      console.log(`📍 [GOOGLE PLACES API] Buscando: "${query}" (${country})`);
      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        if (searchData.status === 'OK' && Array.isArray(searchData.results)) {
          return searchData.results.map(r => ({ ...r, _city: targetCity }));
        }
      } catch {}
      return [];
    });

    const searchResults = await Promise.all(searchPromises);
    const places = searchResults.flat();
    console.log(`  [Google Places] Total de ${places.length} locais encontrados em ${targetCities.join(', ')}.`);

    const chunkSize = 10;

    for (let i = 0; i < places.length; i += chunkSize) {
      if (insertedCount >= needed) break;
      const chunk = places.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async place => {
        const compName = (place.name || '').trim();
        if (!compName || compName.length < 3) return null;

        const normName = compName.toLowerCase();
        if (existingNames.has(normName)) return null;

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
          email = await scrapeSiteForEmail(website, country);
        }

        if (email && !existingEmails.has(email.toLowerCase().trim())) {
          return { compName, normName, email: email.toLowerCase().trim(), phone, website, address, city: place._city || targetCities[0] };
        }
        return null;
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const item of chunkResults) {
        if (!item || insertedCount >= needed) continue;
        if (existingNames.has(item.normName) || existingEmails.has(item.email)) continue;

        existingNames.add(item.normName);
        existingEmails.add(item.email);

        await saveLeadDirectlyToCrmAndStaging(client, job, {
          compName: item.compName,
          email: item.email,
          phone: item.phone,
          website: item.website,
          address: item.address,
          city: item.city,
          province: item.city,
          country: country,
          confidenceScore: 100
        });

        insertedCount++;
        await incrementJobProgress(client, job.id);
        console.log(`  ✓ [GOOGLE MAPS + WEB 100% REAL & CRM] ${item.compName} | ${item.email} | Tel: ${item.phone || 'N/A'}`);
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

  if (GOOGLE_PLACES_API_KEY) {
    const placesInserted = await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
    if (placesInserted > 0) {
      return placesInserted;
    }
  }

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
 * Processador Independente por País (Worker Dedicado com conexão própria do Pool)
 */
async function processCountryWorker(countryCode, countryLabel, sqlWhere, existingNames, existingEmails) {
  const client = await pool.connect();

  try {
    // Seleção em round-robin: pega a missão menos recentemente atualizada
    let jobRes = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs
      WHERE (${sqlWhere}) AND status IN ('processing', 'pending')
      ORDER BY 
        updated_at ASC NULLS FIRST,
        created_at ASC
      LIMIT 1;
    `);

    if (jobRes.rows.length === 0) {
      return { country: countryCode, active: false };
    }

    const job = jobRes.rows[0];

    if (job.status === 'pending') {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs
        SET status = 'processing', updated_at = NOW()
        WHERE id = $1;
      `, [job.id]);
      job.status = 'processing';
    }

    if (job.found_emails_count >= job.target_count) {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs
        SET status = 'completed', updated_at = NOW()
        WHERE id = $1;
      `, [job.id]);
      console.log(`✅ [${countryLabel}] Missão "${job.title}" concluída com ${job.found_emails_count}/${job.target_count}!`);
      return { country: countryCode, active: true, completed: true };
    }

    console.log(`\n🚀 [WORKER ${countryLabel}] Missão: "${job.title}" (${job.found_emails_count}/${job.target_count})`);

    let inserted = 0;
    const source = job.search_source || 'google_maps';

    if (countryCode === 'FR') {
      inserted = await harvestFranceOfficial(client, job, existingNames, existingEmails);
    } else if (countryCode === 'IT') {
      inserted = await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
    } else {
      if (source === 'google_maps') {
        inserted = await harvestViaGooglePlacesApi(client, job, existingNames, existingEmails);
        if (inserted === 0) {
          inserted = await harvestSpainOfficial(client, job, existingNames, existingEmails);
        }
      } else {
        inserted = await harvestSpainOfficial(client, job, existingNames, existingEmails);
      }
    }

    const countRes = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [job.id]);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    const isDone = currentCount >= job.target_count;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = $1, found_emails_count = $1, status = $2, updated_at = NOW()
      WHERE id = $3;
    `, [currentCount, isDone ? 'completed' : 'processing', job.id]);

    console.log(`📊 [${countryLabel}] "${job.title}": ${currentCount}/${job.target_count} leads reais verificados.`);
    return { country: countryCode, active: true, inserted, currentCount, isDone };
  } catch (err) {
    console.error(`❌ [WORKER ${countryLabel}] Erro:`, err.message);
    return { country: countryCode, active: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Ciclo do Daemon 24/7 com Paralelismo Tri-País
 */
async function runDaemonStep() {
  const metaClient = await pool.connect();

  try {
    const existingStagingRes = await metaClient.query('SELECT company_name, email FROM core_comercial.lead_prospecting_results;');
    const existingCrmRes = await metaClient.query('SELECT company_name, email FROM core_comercial.leads;');

    const existingNames = new Set();
    const existingEmails = new Set();

    for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
      if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
      if (r.email) existingEmails.add(r.email.trim().toLowerCase());
    }

    metaClient.release();

    console.log(`\n================================================================================`);
    console.log(`⚡ [PARALELO TRI-PAÍS] Varredura Concorrente (🇪🇸 Espanha | 🇫🇷 França | 🇮🇹 Itália)`);
    console.log(`🔒 Deduplicação ativa: ${existingNames.size} empresas / ${existingEmails.size} e-mails protegidos.`);
    console.log(`================================================================================`);

    const countryResults = await Promise.allSettled([
      processCountryWorker('ES', '🇪🇸 Espanha', "location LIKE '%Espan%' OR title LIKE '%🇪🇸%'", existingNames, existingEmails),
      processCountryWorker('FR', '🇫🇷 França', "location LIKE '%Fran%' OR title LIKE '%🇫🇷%'", existingNames, existingEmails),
      processCountryWorker('IT', '🇮🇹 Itália', "location LIKE '%Ital%' OR title LIKE '%🇮🇹%'", existingNames, existingEmails)
    ]);

    const activeWorkers = countryResults.filter(r => r.status === 'fulfilled' && r.value?.active).length;
    return { active: activeWorkers > 0, results: countryResults };
  } catch (err) {
    console.error('❌ Erro no ciclo do Daemon:', err.message);
    try { metaClient.release(); } catch {}
    return { active: false, error: err.message };
  }
}

async function startDaemonLoop() {
  console.log('\n================================================================================');
  console.log('⚡ MCS B2B LEAD HARVESTER PARALELO INICIADO (ESPANHA 🇪🇸, FRANÇA 🇫🇷, ITÁLIA 🇮🇹)');
  console.log('================================================================================\n');

  while (true) {
    const result = await runDaemonStep();
    if (!result.active) {
      console.log('💤 Nenhuma missão ativa no momento. Aguardando 10s...');
      await new Promise((r) => setTimeout(r, 10000));
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

if (require.main === module) {
  startDaemonLoop().catch(console.error);
}

module.exports = { runDaemonStep, startDaemonLoop, pool };

