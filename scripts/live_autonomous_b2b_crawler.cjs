require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Strict timeout helper
function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  ]);
}

async function safeMxResolve(domain) {
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 2500);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

async function safeFetch(url, ms = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// 50 Províncias e Cidades Industriais
const SPANISH_REGIONS = [
  { prov: 'Barcelona', hubs: ['Barcelona', 'Martorell', 'Terrassa', 'Sabadell', 'Granollers', 'Sant Boi', 'Cornellà', 'Castellbisbal', 'Abrera', 'Rubí'] },
  { prov: 'Madrid', hubs: ['Madrid', 'Getafe', 'Pinto', 'Fuenlabrada', 'Alcalá de Henares', 'San Fernando de Henares', 'Torrejón de Ardoz', 'Coslada', 'Valdemoro'] },
  { prov: 'Valencia', hubs: ['Valencia', 'Sagunto', 'Almussafes', 'Paterna', 'Torrent', 'Alzira', 'Silla', 'Quart de Poblet', 'Ribarroja'] },
  { prov: 'Vizcaya', hubs: ['Bilbao', 'Barakaldo', 'Sestao', 'Durango', 'Zamudio', 'Basauri', 'Galdakao', 'Erandio', 'Amorebieta', 'Bermeo'] },
  { prov: 'Guipúzcoa', hubs: ['San Sebastián', 'Beasain', 'Elgoibar', 'Eibar', 'Mondragón', 'Bergara', 'Tolosa', 'Irun', 'Hernani', 'Ordizia', 'Azpeitia'] },
  { prov: 'Álava', hubs: ['Vitoria-Gasteiz', 'Llodio', 'Amurrio', 'Jundiz', 'Gamarra', 'Ali-Gobeo'] },
  { prov: 'Navarra', hubs: ['Pamplona', 'Tudela', 'Noáin', 'Landaben', 'Viana', 'Tafalla', 'Alsasua', 'Orcoyen', 'San Adrián'] },
  { prov: 'Asturias', hubs: ['Avilés', 'Gijón', 'Oviedo', 'Llanera', 'Corvera', 'Langreo', 'Mieres', 'Carreño', 'Siero'] },
  { prov: 'Tarragona', hubs: ['Tarragona', 'Vila-seca', 'Constantí', 'La Canonja', 'El Morell', 'Valls', 'Tortosa', 'Reus', 'Amposta'] },
  { prov: 'Pontevedra', hubs: ['Vigo', 'O Porriño', 'Pontevedra', 'Marín', 'Vilagarcía de Arousa', 'Mos', 'Redondela'] },
  { prov: 'A Coruña', hubs: ['A Coruña', 'Ferrol', 'Narón', 'Fene', 'Arteixo', 'As Pontes', 'Santiago de Compostela', 'Culleredo'] },
  { prov: 'Zaragoza', hubs: ['Zaragoza', 'PLAZA', 'Malpica', 'La Muela', 'Utebo', 'Épila', 'Calatayud', 'Ejea de los Caballeros'] },
  { prov: 'Cádiz', hubs: ['Cádiz', 'Algeciras', 'San Roque', 'Los Barrios', 'Puerto Real', 'Jerez de la Frontera', 'El Puerto de Santa María'] },
  { prov: 'Huelva', hubs: ['Huelva', 'Palos de la Frontera', 'San Juan del Puerto', 'Moguer', 'Aljaraque'] },
  { prov: 'Ciudad Real', hubs: ['Puertollano', 'Ciudad Real', 'Tomelloso', 'Alcázar de San Juan', 'Valdepeñas', 'Manzanares'] },
  { prov: 'Castellón', hubs: ['Castellón de la Plana', 'Onda', 'Vila-real', 'Almassora', 'l Alcora', 'Nules', 'Burriana'] },
  { prov: 'Sevilla', hubs: ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaíra', 'La Rinconada', 'Utrera', 'Carmona'] },
  { prov: 'Burgos', hubs: ['Burgos', 'Miranda de Ebro', 'Aranda de Duero', 'Briviesca'] },
  { prov: 'Valladolid', hubs: ['Valladolid', 'Laguna de Duero', 'Medina del Campo'] },
  { prov: 'Cantabria', hubs: ['Santander', 'Torrelavega', 'Camargo', 'Castro Urdiales', 'Reinosa', 'Los Corrales de Buelna'] },
  { prov: 'La Rioja', hubs: ['Logroño', 'Calahorra', 'Arnedo', 'Haro', 'Santo Domingo de la Calzada'] },
  { prov: 'Alicante', hubs: ['Alicante', 'Elche', 'Elda', 'Petrer', 'Ibi', 'Alcoy', 'Villena', 'San Vicente del Raspeig'] },
  { prov: 'Murcia', hubs: ['Murcia', 'Cartagena', 'Escombreras', 'Lorca', 'Molina de Segura', 'Alcantarilla', 'Yecla'] },
  { prov: 'Toledo', hubs: ['Toledo', 'Talavera de la Reina', 'Illescas', 'Seseña', 'Yuncos', 'Torrijos'] },
  { prov: 'Girona', hubs: ['Girona', 'Figueres', 'Olot', 'Blanes', 'Ripoll', 'Banyoles'] }
];

const SEARCH_TERMS_BY_CNAE = [
  {
    cnae: '3320',
    title: '🚰 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos',
    queries: ['taller montajes de tuberias industriales piping soldadura', 'instalaciones piping vapor gas condensados tuberias', 'empresa montajes mecanicos tuberias caldereria']
  },
  {
    cnae: '2529',
    title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión',
    queries: ['taller caldereria pesada grandes depositos tanques reactores', 'fabricacion aparatos a presion autoclaves caldereria industrial', 'caldereria media pesada silos tolvas recipientes presion']
  },
  {
    cnae: '2511',
    title: '🏗️ 3. CNAE 2511 - Estructuras Metálicas & Cerrajería Pesada',
    queries: ['empresa estructuras metalicas pesadas naves industriales', 'cerrajeria industrial puentes grua vigas celosias', 'construcciones metalicas naves industriales']
  },
  {
    cnae: '2562',
    title: '⚙️ 4. CNAE 2562 - Mecanizado Industrial CNC & Tornería',
    queries: ['taller mecanizado cnc fresado tornos verticales grandes', 'mecanizado de precision decoletaje piezas industriales', 'mandrinado rectificado mecanizado bajo plano']
  },
  {
    cnae: '3011',
    title: '⚓ 5. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros',
    queries: ['astilleros construccion y reparacion naval varaderos', 'talleres tuberia naval caldereria naval mantenimiento buques']
  },
  {
    cnae: '2893',
    title: '🥛 6. CNAE 2893 - Tubería Inox, Industria Agroalimentaria & Bodegas',
    queries: ['tuberias inox soldadura orbital instalaciones alimentarias', 'fabricacion depositos acero inoxidable almazaras bodegas']
  },
  {
    cnae: '2825',
    title: '🔥 7. CNAE 2825 & 3311 - Intercambiadores de Calor, Calderas & Paradas de Planta',
    queries: ['fabricacion intercambiadores de calor serpentines calderas industriales', 'mantenimiento paradas de planta petroquimica montajes industriales']
  },
  {
    cnae: '4299',
    title: '🌐 8. CNAE 4299 & 2420 - Redes de Tuberías Industriales, Gasoductos & Curvado',
    queries: ['montaje redes oleoductos gasoductos redes de vapor tuberias', 'curvado de tubos conformacion prefabricacion tuberia']
  },
  {
    cnae: 'MEGA',
    title: '🏢 9. Mega-Parques Industriales - Júndiz, Landaben, PLAZA, PEPA & Porriño',
    queries: ['parque empresarial jundiz vitoria talleres montajes caldereria', 'poligono industrial landaben pamplona mecanizado tuberia', 'poligono industrial as gandaras o porriño construcciones metalicas']
  }
];

function isCleanValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  let em = email.trim().toLowerCase();
  if (em.length < 6 || em.length > 80 || !em.includes('@') || !em.includes('.')) return false;
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.css|\.js|example\.com|wixpress|sentry|domain\.com|yourcompany|schema\.org|wordpress|cloudflare)/i.test(em)) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(em);
}

function isValidCompanyUrl(u) {
  if (!u || !u.startsWith('http')) return false;
  const bad = /(duckduckgo|bing|google|yahoo|wikipedia|facebook|instagram|linkedin|twitter|youtube|paginasamarillas|axesor|einforma|vulka|guias11811|infocif|camerdata|elpais|elmundo|boe\.es|expansion\.com)/i;
  return !bad.test(u);
}

// Multi-Search: Mojeek + DuckDuckGo + Bing
async function multiSearch(query) {
  const urls = new Set();

  // 1. Mojeek Search (sem restrições)
  try {
    const html = await safeFetch(`https://www.mojeek.com/search?q=${encodeURIComponent(query + ' contacto email espana')}`, 4000);
    if (html) {
      const matches = html.match(/<a[^>]+class="title"[^>]*href="([^"]+)"/gi) || [];
      for (const m of matches) {
        const u = m.match(/href="([^"]+)"/i);
        if (u && isValidCompanyUrl(u[1])) urls.add(u[1]);
      }
    }
  } catch {}

  // 2. DuckDuckGo HTML
  try {
    const ddgHtml = await safeFetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' contacto email')}`, 4000);
    if (ddgHtml) {
      const linkRegex = /<a[^>]+class="result__url"[^>]*href="([^"]+)"[^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(ddgHtml)) !== null) {
        let rawHref = match[1];
        if (rawHref.includes('uddg=')) {
          const extracted = decodeURIComponent(rawHref.split('uddg=')[1].split('&')[0]);
          if (isValidCompanyUrl(extracted)) urls.add(extracted);
        }
      }
    }
  } catch {}

  // 3. Bing Search
  try {
    const bHtml = await safeFetch(`https://www.bing.com/search?q=${encodeURIComponent(query + ' contacto email espana')}&setlang=es-es`, 4000);
    if (bHtml) {
      const bMatches = bHtml.match(/<a[^>]+href="(https?:\/\/[^"'\s>]+)"/gi) || [];
      for (const m of bMatches) {
        const hMatch = m.match(/href="(https?:\/\/[^"'\s>]+)"/i);
        if (hMatch && isValidCompanyUrl(hMatch[1])) urls.add(hMatch[1]);
      }
    }
  } catch {}

  return Array.from(urls);
}

async function scrapeCompanyData(siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    const origin = parsed.origin;
    let domain = parsed.hostname.replace(/^www\./, '');

    const pages = [
      origin,
      `${origin}/contacto`,
      `${origin}/contacto.html`,
      `${origin}/aviso-legal`,
      `${origin}/aviso-legal.html`,
      `${origin}/contact`
    ];

    const foundEmails = new Set();
    let companyName = '';
    let phone = '';
    let address = '';

    for (const p of pages) {
      const html = await safeFetch(p, 3000);
      if (!html) continue;

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
    }

    if (foundEmails.size === 0) return null;

    const chosenEmail = Array.from(foundEmails).find(e => /^(info|contacto|comercial|ventas|taller|administracion|proyectos|caldereria|tuberia|pedidos)/i.test(e)) || Array.from(foundEmails)[0];

    function isGenericScrapedName(name) {
      if (!name || typeof name !== 'string') return true;
      const n = name.trim().toLowerCase();
      if (n.length < 3) return true;
      const generic = ['aviso legal', 'inicio', 'home', 'contacto', 'contacte', 'contact', 'politica', 'privacidad', 'cookies', 'index', 'welcome', 'bienvenido', 'enlaces', 'pagina', 'formulario', 'empresa de desarrollo web', 'error 404', 'not found', 'quienes somos', 'sobre nosotros', 'servicios', 'productos'];
      return generic.some(g => n === g || n.startsWith(g + ' ') || n.startsWith(g + '-') || n.startsWith(g + '|'));
    }

    let finalName = companyName;
    if (isGenericScrapedName(finalName)) {
      const dPart = domain.split('.')[0].replace(/[-_]/g, ' ');
      finalName = dPart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      if (!finalName.toLowerCase().includes('s.l') && !finalName.toLowerCase().includes('s.a')) {
        finalName = `${finalName} S.L.`;
      }
    }

    return {
      domain,
      website: origin,
      companyName: finalName || `${domain.split('.')[0].toUpperCase()} S.L.`,
      email: chosenEmail,
      phone: phone || '+34 91 000 00 00',
      address: address || 'Polígono Industrial'
    };
  } catch {
    return null;
  }
}

async function startResilientProspectingEngine() {
  console.log('==================================================================================');
  console.log('🔥 MOTOR INDUSTRIAL AUTÔNOMO V4.0 (RESILIENTE + TIMEOUT + MULTI-BUSCADORES 24/7)');
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
    else if (j.title.includes('2825')) jobMap['2825'] = j.id;
    else if (j.title.includes('4299')) jobMap['4299'] = j.id;
    else if (j.title.includes('Mega')) jobMap['MEGA'] = j.id;
  }
  const empresaId = jobsRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const existRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL;');
  const existingEmails = new Set(existRes.rows.map(r => r.email));
  console.log(`🔒 Base atual em Staging: ${existingEmails.size} empresas.`);

  let cycle = 0;
  let totalNew = 0;

  while (true) {
    cycle++;
    const region = SPANISH_REGIONS[cycle % SPANISH_REGIONS.length];
    console.log(`\n📍 [CICLO ${cycle}] Minerando Província: ${region.prov.toUpperCase()} (${region.hubs.slice(0, 5).join(', ')})...`);

    for (const hub of region.hubs) {
      for (const sec of SEARCH_TERMS_BY_CNAE) {
        const jobId = jobMap[sec.cnae] || jobMap['3320'];

        for (const queryTerm of sec.queries) {
          const fullQuery = `${queryTerm} ${hub} ${region.prov}`;
          
          let links = [];
          try {
            links = await multiSearch(fullQuery);
          } catch {}

          for (const link of links) {
            try {
              const data = await scrapeCompanyData(link);
              if (!data) continue;

              const cleanEmail = data.email.toLowerCase().trim();
              if (existingEmails.has(cleanEmail)) continue;

              // MX Check with strict timeout
              const hasMx = await safeMxResolve(data.domain);
              if (!hasMx) continue;

              // 1. Insert into Staging
              await client.query(`
                INSERT INTO core_comercial.lead_prospecting_results (
                  job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
                )
                ON CONFLICT DO NOTHING;
              `, [jobId, empresaId, data.companyName, cleanEmail, data.phone, data.website, data.address, hub, region.prov]);

              // 2. Direct Sync into CRM Leads table
              await client.query(`
                INSERT INTO core_comercial.leads (
                  empresa_id, name, company_name, email, phone, website, city, province, address_line, sector, cargo, origen_lead, notes, tags, prospecting_job_id, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Diretoria / Compras / Técnico', 'prospeccao_b2b', $11, ARRAY['Prospecção Autônoma B2B', $10], $12, NOW(), NOW()
                )
                ON CONFLICT (lower(TRIM(BOTH FROM email))) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text)) DO UPDATE SET
                  company_name = EXCLUDED.company_name,
                  phone = COALESCE(NULLIF(core_comercial.leads.phone, ''), EXCLUDED.phone),
                  website = COALESCE(NULLIF(core_comercial.leads.website, ''), EXCLUDED.website),
                  updated_at = NOW();
              `, [empresaId, data.companyName, data.companyName, cleanEmail, data.phone, data.website, hub, region.prov, data.address, sec.title.replace(/^[^\w\s]+/, '').trim(), `Lead qualificado importado da Máquina de Leads em ${hub}, ${region.prov}.`, jobId]);

              existingEmails.add(cleanEmail);
              totalNew++;
              console.log(`🎯 [NOVO LEAD CAPTURADO] [${sec.cnae}] ${data.companyName} ➔ ${cleanEmail} (${hub}, ${region.prov})`);

              // Update job count live
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

          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    const currentTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
    const currentCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');
    console.log(`📊 [STATUS LIVE] Staging: ${currentTotal.rows[0].count} | CRM: ${currentCrm.rows[0].count} (+${totalNew} novos nesta sessão).`);

    await new Promise(r => setTimeout(r, 1200));
  }
}

startResilientProspectingEngine();
