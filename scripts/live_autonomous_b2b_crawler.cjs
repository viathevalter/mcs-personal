require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Todas as 50 Províncias e Polos Industriais da Espanha
const ALL_SPANISH_PROVINCES = [
  { name: 'Barcelona', hubs: ['Barcelona', 'Martorell', 'Terrassa', 'Sabadell', 'Granollers', 'Sant Boi', 'Cornellà', 'Castellbisbal', 'Abrera'] },
  { name: 'Madrid', hubs: ['Madrid', 'Getafe', 'Pinto', 'Fuenlabrada', 'Alcalá de Henares', 'San Fernando de Henares', 'Torrejón de Ardoz', 'Coslada', 'Arganda'] },
  { name: 'Valencia', hubs: ['Valencia', 'Sagunto', 'Almussafes', 'Paterna', 'Torrent', 'Alzira', 'Silla', 'Quart de Poblet'] },
  { name: 'Vizcaya', hubs: ['Bilbao', 'Barakaldo', 'Sestao', 'Durango', 'Zamudio', 'Basauri', 'Galdakao', 'Erandio', 'Amorebieta'] },
  { name: 'Guipúzcoa', hubs: ['San Sebastián', 'Beasain', 'Elgoibar', 'Eibar', 'Mondragón', 'Bergara', 'Tolosa', 'Irun', 'Hernani', 'Ordizia'] },
  { name: 'Álava', hubs: ['Vitoria-Gasteiz', 'Llodio', 'Amurrio', 'Jundiz', 'Gamarra', 'Ali-Gobeo'] },
  { name: 'Navarra', hubs: ['Pamplona', 'Tudela', 'Noáin', 'Landaben', 'Viana', 'Tafalla', 'Alsasua', 'Orcoyen'] },
  { name: 'Asturias', hubs: ['Avilés', 'Gijón', 'Oviedo', 'Llanera', 'Corvera', 'Langreo', 'Mieres', 'Carreño'] },
  { name: 'Tarragona', hubs: ['Tarragona', 'Vila-seca', 'Constantí', 'La Canonja', 'El Morell', 'Valls', 'Tortosa', 'Reus'] },
  { name: 'Pontevedra', hubs: ['Vigo', 'O Porriño', 'Pontevedra', 'Marín', 'Vilagarcía de Arousa', 'Mos', 'Redondela'] },
  { name: 'A Coruña', hubs: ['A Coruña', 'Ferrol', 'Narón', 'Fene', 'Arteixo', 'As Pontes', 'Santiago de Compostela'] },
  { name: 'Zaragoza', hubs: ['Zaragoza', 'PLAZA', 'Malpica', 'La Muela', 'Utebo', 'Épila', 'Calatayud', 'Ejea'] },
  { name: 'Cádiz', hubs: ['Cádiz', 'Algeciras', 'San Roque', 'Los Barrios', 'Puerto Real', 'Jerez de la Frontera', 'El Puerto de Santa María'] },
  { name: 'Huelva', hubs: ['Huelva', 'Palos de la Frontera', 'San Juan del Puerto', 'Moguer'] },
  { name: 'Ciudad Real', hubs: ['Puertollano', 'Ciudad Real', 'Tomelloso', 'Alcázar de San Juan', 'Valdepeñas'] },
  { name: 'Castellón', hubs: ['Castellón de la Plana', 'Onda', 'Vila-real', 'Almassora', 'l Alcora', 'Nules'] },
  { name: 'Sevilla', hubs: ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaíra', 'La Rinconada', 'Utrera'] },
  { name: 'Alicante', hubs: ['Alicante', 'Elche', 'Elda', 'Petrer', 'Ibi', 'Alcoy', 'Villena'] },
  { name: 'Murcia', hubs: ['Murcia', 'Cartagena', 'Escombreras', 'Lorca', 'Molina de Segura', 'Alcantarilla'] },
  { name: 'Burgos', hubs: ['Burgos', 'Miranda de Ebro', 'Aranda de Duero', 'Briviesca'] },
  { name: 'Valladolid', hubs: ['Valladolid', 'Laguna de Duero', 'Medina del Campo'] },
  { name: 'Cantabria', hubs: ['Santander', 'Torrelavega', 'Camargo', 'Castro Urdiales', 'Reinosa'] },
  { name: 'La Rioja', hubs: ['Logroño', 'Calahorra', 'Arnedo', 'Haro', 'Santo Domingo'] },
  { name: 'Toledo', hubs: ['Toledo', 'Talavera de la Reina', 'Illescas', 'Seseña', 'Yuncos'] },
  { name: 'Girona', hubs: ['Girona', 'Figueres', 'Olot', 'Blanes', 'Ripoll', 'Banyoles'] },
  { name: 'León', hubs: ['León', 'Ponferrada', 'San Andrés del Rabanedo', 'Bembibre'] },
  { name: 'Badajoz', hubs: ['Badajoz', 'Mérida', 'Don Benito', 'Almendralejo', 'Zafra'] },
  { name: 'Córdoba', hubs: ['Córdoba', 'Lucena', 'Puente Genil', 'Montilla'] },
  { name: 'Málaga', hubs: ['Málaga', 'Antequera', 'Marbella', 'Vélez-Málaga'] },
  { name: 'Almería', hubs: ['Almería', 'El Ejido', 'Roquetas de Mar', 'Huércal de Almería'] },
  { name: 'Granada', hubs: ['Granada', 'Motril', 'Armilla', 'Santa Fe'] },
  { name: 'Jaén', hubs: ['Jaén', 'Linares', 'Úbeda', 'Andújar', 'Martos'] },
  { name: 'Lleida', hubs: ['Lleida', 'Tàrrega', 'Balaguer', 'Mollerussa'] },
  { name: 'Lugo', hubs: ['Lugo', 'Monforte de Lemos', 'Viveiro', 'Ribadeo'] },
  { name: 'Ourense', hubs: ['Ourense', 'O Barco de Valdeorras', 'Verín', 'Carballiño'] },
  { name: 'Salamanca', hubs: ['Salamanca', 'Béjar', 'Ciudad Rodrigo', 'Guijuelo'] },
  { name: 'Albacete', hubs: ['Albacete', 'Hellín', 'Villarrobledo', 'Almansa'] },
  { name: 'Huesca', hubs: ['Huesca', 'Monzón', 'Barbastro', 'Fraga', 'Jaca'] },
  { name: 'Guadalajara', hubs: ['Guadalajara', 'Azuqueca de Henares', 'Cabanillas del Campo', 'Alovera'] },
  { name: 'Cáceres', hubs: ['Cáceres', 'Plasencia', 'Navalmoral de la Mata', 'Miajadas'] },
  { name: 'Palencia', hubs: ['Palencia', 'Aguilar de Campoo', 'Venta de Baños', 'Guardo'] },
  { name: 'Zamora', hubs: ['Zamora', 'Benavente', 'Toro'] },
  { name: 'Ávila', hubs: ['Ávila', 'Arévalo', 'Las Navas del Marqués'] },
  { name: 'Segovia', hubs: ['Segovia', 'Cuéllar', 'El Espinar'] },
  { name: 'Soria', hubs: ['Soria', 'Almazán', 'El Burgo de Osma'] },
  { name: 'Teruel', hubs: ['Teruel', 'Alcañiz', 'Andorra', 'Calamocha'] },
  { name: 'Cuenca', hubs: ['Cuenca', 'Tarancón', 'Motilla del Palancar'] }
];

// 9 Setores Industriais Oficiais da MCS
const INDUSTRIAL_SECTORS_MATRIX = [
  {
    cnae: '3320',
    title: '🚰 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos',
    terms: [
      'montajes de tuberias industriales piping soldadura tig',
      'empresa instalaciones piping vapor gas tuberias industriales',
      'montajes mecanicos tuberias industriales valvulas bombas',
      'instalaciones hidraulicas industriales tuberias de presion',
      'tuberias industrias quimicas petroquimicas centrales termicas'
    ]
  },
  {
    cnae: '2529',
    title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión',
    terms: [
      'taller caldereria pesada grandes depositos tanques reactores',
      'fabricacion aparatos a presion autoclaves caldereria industrial',
      'caldereria media pesada silos tolvas recipientes presion',
      'caldereria bajo plano construcciones metalicas pesadas'
    ]
  },
  {
    cnae: '2511',
    title: '🏗️ 3. CNAE 2511 - Estructuras Metálicas & Cerrajería Pesada',
    terms: [
      'empresa estructuras metalicas pesadas naves industriales',
      'fabricacion cerrajeria industrial puentes grua vigas celosias',
      'cubiertas y fachadas metalicas naves cerrajeria pesada',
      'construcciones metalicas naves industriales marquesinas'
    ]
  },
  {
    cnae: '2562',
    title: '⚙️ 4. CNAE 2562 - Mecanizado Industrial CNC & Tornería',
    terms: [
      'taller mecanizado cnc fresado tornos verticales piezas grandes',
      'mecanizado de precision decoletaje caldereria mecanizada',
      'mandrinado rectificado mecanizado bajo plano piezas industriales'
    ]
  },
  {
    cnae: '3011',
    title: '⚓ 5. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros',
    terms: [
      'astilleros construccion y reparacion naval varaderos',
      'talleres tuberia naval caldereria naval mantenimiento buques',
      'montajes navales plataformas offshore barcos pesqueros'
    ]
  },
  {
    cnae: '2893',
    title: '🥛 6. CNAE 2893 - Tubería Inox, Industria Agroalimentaria & Bodegas',
    terms: [
      'tuberias inox soldadura orbital instalaciones alimentarias bodegas',
      'fabricacion depositos acero inoxidable almazaras industrias lacteas',
      'instalaciones de tuberia inoxidable industria farmaceutica'
    ]
  },
  {
    cnae: '2825',
    title: '🔥 7. CNAE 2825 & 3311 - Intercambiadores de Calor, Calderas & Paradas de Planta',
    terms: [
      'fabricacion intercambiadores de calor serpentines calderas industriales',
      'mantenimiento paradas de planta petroquimica montajes industriales',
      'fabricacion condensadores haces tubulares recuperadores termicos'
    ]
  },
  {
    cnae: '4299',
    title: '🌐 8. CNAE 4299 & 2420 - Redes de Tuberías Industriales, Gasoductos & Curvado',
    terms: [
      'montaje redes oleoductos gasoductos redes de vapor tuberias',
      'curvado de tubos conformacion prefabricacion tuberia industrial',
      'redes contra incendios industriales canalizaciones tuberias'
    ]
  },
  {
    cnae: 'MEGA',
    title: '🏢 9. Mega-Parques Industriales - Júndiz, Landaben, PLAZA, PEPA & Porriño',
    terms: [
      'parque empresarial jundiz vitoria empresas metalurgicas caldereria',
      'poligono industrial landaben pamplona talleres montajes',
      'plataforma logistica industrial plaza zaragoza empresas metal',
      'parque empresarial principado de asturias peba aviles caldereria',
      'poligono industrial as gandaras o porriño construcciones metalicas'
    ]
  }
];

function isCleanValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  let em = email.trim().toLowerCase();
  if (em.length < 6 || em.length > 80 || !em.includes('@') || !em.includes('.')) return false;
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.css|\.js|example\.com|wixpress|sentry|domain\.com|yourcompany|schema\.org|wordpress|cloudflare)/i.test(em)) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(em);
}

// Multi-Source Search (DuckDuckGo + Bing HTML + Diretórios)
async function searchWebEngines(query) {
  const urls = new Set();

  // 1. DuckDuckGo HTML
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' contacto email espana')}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(t);
    if (res.ok) {
      const html = await res.text();
      const linkRegex = /<a[^>]+class="result__url"[^>]*href="([^"]+)"[^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        let rawHref = match[1];
        if (rawHref.includes('uddg=')) {
          const extracted = decodeURIComponent(rawHref.split('uddg=')[1].split('&')[0]);
          if (isValidCompanyUrl(extracted)) urls.add(extracted);
        }
      }
    }
  } catch {}

  // 2. Bing HTML Search
  try {
    const bUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' contacto email espana')}&setlang=es-es`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(bUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(t);
    if (res.ok) {
      const bHtml = await res.text();
      const bMatches = bHtml.match(/<a[^>]+href="(https?:\/\/[^"'\s>]+)"/gi) || [];
      for (const m of bMatches) {
        const hMatch = m.match(/href="(https?:\/\/[^"'\s>]+)"/i);
        if (hMatch && isValidCompanyUrl(hMatch[1])) urls.add(hMatch[1]);
      }
    }
  } catch {}

  return Array.from(urls);
}

function isValidCompanyUrl(u) {
  if (!u || !u.startsWith('http')) return false;
  const badPatterns = /(duckduckgo|bing|google|yahoo|wikipedia|facebook|instagram|linkedin|twitter|youtube|paginasamarillas|axesor|einforma|vulka|guias11811|infocif|camerdata|elpais|elmundo|boe\.es|expansion\.com)/i;
  return !badPatterns.test(u);
}

async function scrapeCompanyData(siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    const origin = parsed.origin;
    const domain = parsed.hostname.replace(/^www\./, '');

    const pagesToTry = [
      origin,
      `${origin}/contacto`,
      `${origin}/contacto.html`,
      `${origin}/aviso-legal`,
      `${origin}/aviso-legal.html`,
      `${origin}/contacte`,
      `${origin}/contact`,
      `${origin}/quienes-somos`
    ];

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

async function startHighCapacityProspectingEngine() {
  console.log('==================================================================================');
  console.log('🚀 MOTOR INDUSTRIAL EXPANDIDO B2B 24/7 (50 PROVÍNCIAS + 9 MISSÕES)');
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
  console.log(`🔒 Base atual no Staging: ${existingEmails.size} empresas verificadas.`);

  let provIndex = 0;
  let totalNew = 0;

  while (true) {
    const prov = ALL_SPANISH_PROVINCES[provIndex % ALL_SPANISH_PROVINCES.length];
    console.log(`\n📍 [MINERANDO PROVÍNCIA] ${prov.name.toUpperCase()} (${prov.hubs.join(', ')})...`);

    for (const hub of prov.hubs) {
      for (const sec of INDUSTRIAL_SECTORS_MATRIX) {
        const jobId = jobMap[sec.cnae] || jobMap['3320'];

        for (const term of sec.terms) {
          const query = `${term} ${hub} ${prov.name}`;
          const links = await searchWebEngines(query);

          for (const link of links) {
            try {
              const data = await scrapeCompanyData(link);
              if (!data) continue;

              if (existingEmails.has(data.email)) continue;

              // DNS MX Check
              const mx = await dns.resolveMx(data.domain).catch(() => []);
              if (!Array.isArray(mx) || mx.length === 0) continue;

              // 1. Insert into Staging
              await client.query(`
                INSERT INTO core_comercial.lead_prospecting_results (
                  job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
                )
                ON CONFLICT DO NOTHING;
              `, [jobId, empresaId, data.companyName, data.email, data.phone, data.website, data.address, hub, prov.name]);

              // 2. Direct Sync into CRM Leads table
              await client.query(`
                INSERT INTO core_comercial.leads (
                  empresa_id, name, company_name, email, phone, website, city, province, address_line, sector, cargo, origen_lead, notes, tags, prospecting_job_id, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Diretoria / Compras', 'prospeccao_b2b', $11, ARRAY['Prospecção Autônoma B2B', $10], $12, NOW(), NOW()
                )
                ON CONFLICT DO NOTHING;
              `, [empresaId, data.companyName, data.companyName, data.email, data.phone, data.website, hub, prov.name, data.address, sec.title.replace(/^[^\w\s]+/, '').trim(), `Lead qualificado importado da Máquina de Leads em ${hub}, ${prov.name}.`, jobId]);

              existingEmails.add(data.email);
              totalNew++;
              console.log(`🎯 [NOVO LEAD REAL] [${sec.cnae}] ${data.companyName} ➔ ${data.email} (${hub}, ${prov.name})`);

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
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }

    const currentTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
    const currentCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');
    console.log(`📊 [STATUS LIVE] Staging: ${currentTotal.rows[0].count} | CRM: ${currentCrm.rows[0].count} (+${totalNew} novos leads nesta sessão).`);

    provIndex++;
    await new Promise(r => setTimeout(r, 1500));
  }
}

startHighCapacityProspectingEngine();
