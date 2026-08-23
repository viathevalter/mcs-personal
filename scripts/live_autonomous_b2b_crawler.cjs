require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Strategic Industrial Hubs across Spain (Polos Petroquímicos, Portuários, Siderúrgicos e Industriais)
const STRATEGIC_SPANISH_HUBS = [
  // Polo Petroquímico & Catalunha
  { city: 'Tarragona', province: 'Tarragona', terms: ['poligono petroquimico constanti vila-seca la canonja', 'poligono industrial el morell tarragona'] },
  { city: 'Valls', province: 'Tarragona', terms: ['poligono industrial valls tarragona'] },
  { city: 'Martorell', province: 'Barcelona', terms: ['poligono industrial martorell abrera'] },
  { city: 'Granollers', province: 'Barcelona', terms: ['poligono industrial congost palou can carner'] },
  { city: 'Barberà del Vallès', province: 'Barcelona', terms: ['poligono industrial santiga can salvatella'] },
  { city: 'Castellbisbal', province: 'Barcelona', terms: ['poligono industrial sant vicenç del valles'] },
  { city: 'Sant Andreu de la Barca', province: 'Barcelona', terms: ['poligono industrial can magre'] },
  
  // Polo Siderúrgico & Astúrias
  { city: 'Avilés', province: 'Asturias', terms: ['parque empresarial principado de asturias peba aviles', 'poligono industrial canaple'] },
  { city: 'Gijón', province: 'Asturias', terms: ['poligono industrial mora garay somonte porceyo tremañes'] },
  { city: 'Corvera', province: 'Asturias', terms: ['poligono industrial los arroyos asturias'] },
  { city: 'Llanera', province: 'Asturias', terms: ['parque tecnologico de asturias poligono silvota asipo'] },

  // Polo Petroquímico & Andaluzia
  { city: 'San Roque', province: 'Cádiz', terms: ['poligono industrial guadarranque san roque refineria'] },
  { city: 'Los Barrios', province: 'Cádiz', terms: ['poligono industrial palmones campo de gibraltar'] },
  { city: 'Algeciras', province: 'Cádiz', terms: ['poligono industrial cortijo real algeciras puerto'] },
  { city: 'Palos de la Frontera', province: 'Huelva', terms: ['poligono industrial nuevo puerto huelva refineria'] },
  { city: 'Huelva', province: 'Huelva', terms: ['poligono industrial tartessos peguerillas punta del sebo'] },
  { city: 'Puertollano', province: 'Ciudad Real', terms: ['complejo petroquimico puertollano poligono la naveta'] },

  // Polo Metalúrgico & Valência / Castellón
  { city: 'Sagunto', province: 'Valencia', terms: ['parc sagunt poligono industrial ingruinsa puerto de sagunto'] },
  { city: 'Almussafes', province: 'Valencia', terms: ['parque industrial juan carlos i almussafes'] },
  { city: 'Paterna', province: 'Valencia', terms: ['poligono industrial fuente del jarro valencia'] },
  { city: 'Onda', province: 'Castellón', terms: ['poligono industrial el colomer la trencada onda'] },
  { city: 'Vila-real', province: 'Castellón', terms: ['poligono industrial travessa vila-real'] },

  // Polo Naval & Galiza
  { city: 'Vigo', province: 'Pontevedra', terms: ['zona franca de vigo beiramar bouzas poligono as gandaras'] },
  { city: 'Ferrol', province: 'A Coruña', terms: ['poligono industrial a gandara ferrol astillero navantia'] },
  { city: 'Narón', province: 'A Coruña', terms: ['poligono industrial rio do pozo naron'] },
  { city: 'Fene', province: 'A Coruña', terms: ['poligono industrial vilar do colo fene astillero'] },
  { city: 'Marín', province: 'Pontevedra', terms: ['puerto de marin pontevedra astillero nodosa'] },
  { city: 'Arteixo', province: 'A Coruña', terms: ['poligono industrial sabon arteixo coruña'] },

  // Polo Mecanizado & País Basco
  { city: 'Beasain', province: 'Guipúzcoa', terms: ['poligono industrial beasain ordizia lazkao'] },
  { city: 'Elgoibar', province: 'Guipúzcoa', terms: ['poligono industrial lerun san roke elgoibar'] },
  { city: 'Eibar', province: 'Guipúzcoa', terms: ['poligono industrial azitain eibar matsaria'] },
  { city: 'Mondragón', province: 'Guipúzcoa', terms: ['poligono industrial san andres arrasate mondragon'] },
  { city: 'Durango', province: 'Vizcaya', terms: ['poligono industrial montorreta tabira durango'] },
  { city: 'Zamudio', province: 'Vizcaya', terms: ['parque tecnologico de bizkaia torrelarragoiti zamudio'] },
  { city: 'Sestao', province: 'Vizcaya', terms: ['poligono industrial sestao bilbao ria'] },

  // Polo Inox / Alimentar & Vale do Ebro
  { city: 'Calahorra', province: 'La Rioja', terms: ['poligono industrial tejerias calahorra la rioja'] },
  { city: 'Tudela', province: 'Navarra', terms: ['poligono industrial municipal tudela navarra'] },
  { city: 'Viana', province: 'Navarra', terms: ['poligono industrial la albergueria viana'] },
  { city: 'Zaragoza', province: 'Zaragoza', terms: ['poligono industrial malpica plaza centrovias cogullada'] },
  { city: 'Épila', province: 'Zaragoza', terms: ['poligono industrial valdeconsejo el sabinar epila'] },

  // Polo Estruturas & Castela / Madrid
  { city: 'Miranda de Ebro', province: 'Burgos', terms: ['poligono industrial bayas irecorp miranda de ebro'] },
  { city: 'Aranda de Duero', province: 'Burgos', terms: ['poligono industrial allendeduero aranda'] },
  { city: 'Getafe', province: 'Madrid', terms: ['poligono industrial los angeles san marcos los olivos getafe'] },
  { city: 'Pinto', province: 'Madrid', terms: ['poligono industrial las arenas el casar pinto'] },
  { city: 'Fuenlabrada', province: 'Madrid', terms: ['poligono industrial cobo calleja cantueña fuenlabrada'] }
];

// Expanded High-Demand Industrial Sectors
const EXPANDED_SEARCH_SECTORS = [
  { cnae: '3320', name: 'Tubería Industrial & Piping', terms: ['taller montajes de tuberias industriales piping soldadura tig', 'empresa instalaciones piping vapor gas condensados tuberias'] },
  { cnae: '2529', name: 'Calderería Pesada & Tanques', terms: ['taller caldereria pesada grandes depositos tanques presion reactores', 'fabricacion aparatos a presion autoclaves caldereria pesada'] },
  { cnae: '2511', name: 'Estructuras Metálicas & Cerrajería', terms: ['empresa estructuras metalicas pesadas naves industriales puentes grua', 'taller cerrajeria industrial caldereria estructural'] },
  { cnae: '2562', name: 'Mecanizado CNC & Tornería', terms: ['taller mecanizado cnc fresado tornos verticales piezas grandes mecanizadas', 'mecanizado de precision decoletaje caldereria'] },
  { cnae: '3011', name: 'Construcción Naval & Astilleros', terms: ['astilleros reparacion naval talleres de tuberias navales varaderos', 'caldereria naval montajes navales mantenimiento buques'] },
  { cnae: '2893', name: 'Tubería Inox & Agroalimentar', terms: ['tuberias inox soldadura orbital instalaciones alimentarias bodegas', 'fabricacion depositos acero inoxidable almazaras lacteas'] },
  { cnae: '3320', name: 'Intercambiadores de Calor & Paradas', terms: ['fabricacion intercambiadores de calor serpentines calderas industriales', 'mantenimiento de paradas de planta petroquimica montajes industriales'] },
  { cnae: '3320', name: 'Redes de Tuberías & Curvado', terms: ['montaje de oleoductos gasoductos redes de tuberias industriales', 'curvado de tubos conformacion prefabricacion tuberia industrial'] }
];

function isCleanValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const em = email.trim().toLowerCase();
  if (em.length < 6 || em.length > 80 || !em.includes('@') || !em.includes('.')) return false;
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.css|\.js|example\.com|wixpress|sentry|domain\.com|yourcompany|schema\.org|wordpress|cloudflare)/i.test(em)) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(em);
}

async function searchDuckDuckGoAndAds(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' contacto email')}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(t);
    if (!res.ok) return [];

    const html = await res.text();
    const linkRegex = /<a[^>]+class="result__url"[^>]*href="([^"]+)"[^>]*>/gi;
    let match;
    const urls = [];
    while ((match = linkRegex.exec(html)) !== null) {
      let rawHref = match[1];
      if (rawHref.includes('uddg=')) {
        const extracted = decodeURIComponent(rawHref.split('uddg=')[1].split('&')[0]);
        if (extracted.startsWith('http') && !extracted.includes('duckduckgo') && !extracted.includes('wikipedia') && !extracted.includes('facebook') && !extracted.includes('linkedin') && !extracted.includes('youtube') && !extracted.includes('instagram') && !extracted.includes('paginasamarillas') && !extracted.includes('einforma') && !extracted.includes('axesor') && !extracted.includes('vulka') && !extracted.includes('guias11811')) {
          urls.push(extracted);
        }
      }
    }
    return urls;
  } catch {
    return [];
  }
}

async function scrapeCompanyData(siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    const origin = parsed.origin;
    const domain = parsed.hostname.replace(/^www\./, '');

    const pagesToTry = [origin, `${origin}/contacto`, `${origin}/contacto.html`, `${origin}/aviso-legal`, `${origin}/aviso-legal.html`, `${origin}/contacte`, `${origin}/contact`];
    const foundEmails = new Set();
    let companyName = '';
    let phone = '';
    let address = '';

    for (const page of pagesToTry) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(page, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: controller.signal
        });
        clearTimeout(t);
        if (!res.ok) continue;

        const html = await res.text();

        if (!companyName) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            companyName = titleMatch[1].replace(/[-|_|\|].*$/, '').trim();
          }
        }

        if (!phone) {
          const phoneMatch = html.match(/(\+34\s?[9|8|6|7]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|[9|8|6|7]\d{2}\s?\d{3}\s?\d{3})/);
          if (phoneMatch) phone = phoneMatch[0].trim();
        }

        if (!address) {
          const addrMatch = html.match(/(Pol[í|i]gono\s+Industrial\s+[^,<"\n]+|C\/\s+[^,<"\n]+|Calle\s+[^,<"\n]+|Avda\.\s+[^,<"\n]+|Parque\s+Empresarial\s+[^,<"\n]+)/i);
          if (addrMatch) address = addrMatch[0].trim();
        }

        const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
        for (const em of emailMatches) {
          if (isCleanValidEmail(em)) {
            foundEmails.add(em.toLowerCase().trim());
          }
        }

        if (foundEmails.size > 0 && phone) break;
      } catch {}
    }

    if (foundEmails.size === 0) return null;

    const chosenEmail = Array.from(foundEmails).find(e => /^(info|contacto|comercial|ventas|taller|administracion|proyectos|caldereria|tuberia|pedidos)/i.test(e)) || Array.from(foundEmails)[0];

    return {
      domain,
      website: origin,
      companyName: companyName || `${domain.split('.')[0].toUpperCase()} S.L.`,
      email: chosenEmail,
      phone: phone || '+34 91 000 00 00',
      address: address || 'Polígono Industrial'
    };
  } catch {
    return null;
  }
}

async function startExpandedStrategicHubCrawler() {
  console.log('==================================================================================');
  console.log('🌍 MOTOR ESTRATÉGICO EXPANDIDO B2B ESPANHA (POLOS PETROQUÍMICOS & SIDERÚRGICOS 24/7)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const jobsRes = await client.query('SELECT id, title, empresa_id FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');
  const jobMap = {};
  for (const j of jobsRes.rows) {
    if (j.title.includes('3320')) jobMap['3320'] = j.id;
    else if (j.title.includes('2529')) jobMap['2529'] = j.id;
    else if (j.title.includes('2511')) jobMap['2511'] = j.id;
    else if (j.title.includes('2562')) jobMap['2562'] = j.id;
    else if (j.title.includes('3011')) jobMap['3011'] = j.id;
    else if (j.title.includes('2893')) jobMap['2893'] = j.id;
  }
  const empresaId = jobsRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const existRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL;');
  const existingEmails = new Set(existRes.rows.map(r => r.email));
  console.log(`🔒 Base atual no Staging: ${existingEmails.size} empresas verificadas.`);

  let hubIndex = 0;
  let totalNewCaptured = 0;

  while (true) {
    const hub = STRATEGIC_SPANISH_HUBS[hubIndex % STRATEGIC_SPANISH_HUBS.length];
    console.log(`\n📍 [POLO INDUSTRIAL] Minerando: ${hub.city.toUpperCase()} (${hub.province})...`);

    for (const sec of EXPANDED_SEARCH_SECTORS) {
      const jobId = jobMap[sec.cnae] || jobMap['3320'];

      for (const term of sec.terms) {
        for (const hubTerm of hub.terms) {
          const query = `${term} ${hubTerm}`;
          const links = await searchDuckDuckGoAndAds(query);

          for (const link of links) {
            try {
              const data = await scrapeCompanyData(link);
              if (!data) continue;

              if (existingEmails.has(data.email)) continue;

              // DNS MX validation
              const mx = await dns.resolveMx(data.domain).catch(() => []);
              if (!Array.isArray(mx) || mx.length === 0) continue;

              // Insert into staging
              await client.query(`
                INSERT INTO core_comercial.lead_prospecting_results (
                  job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
                )
                ON CONFLICT DO NOTHING;
              `, [jobId, empresaId, data.companyName, data.email, data.phone, data.website, data.address, hub.city, hub.province]);

              existingEmails.add(data.email);
              totalNewCaptured++;
              console.log(`🎯 [NOVO LEAD CAPTURADO] [${sec.name}] ${data.companyName} ➔ ${data.email} (${hub.city}, ${hub.province})`);

              // Update job counter live
              await client.query(`
                UPDATE core_comercial.lead_prospecting_jobs
                SET found_emails_count = (SELECT count(email) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
                    processed_count = (SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
                    status = 'processing',
                    updated_at = NOW()
                WHERE id = $1;
              `, [jobId]);
            } catch {}
          }
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }

    const currentTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
    console.log(`📊 [STATUS LIVE] Total no Staging: ${currentTotal.rows[0].count} empresas (+${totalNewCaptured} novos leads nesta sessão).`);

    hubIndex++;
    await new Promise(r => setTimeout(r, 2000));
  }
}

startExpandedStrategicHubCrawler();
