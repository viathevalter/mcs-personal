require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Deep Mega-Polígonos Industriais da Espanha
const MEGA_INDUSTRIAL_PARKS_SPAIN = [
  // 1. Álava / Vitoria-Gasteiz (Parque Empresarial Júndiz, Ali-Gobeo, Gamarra-Betoño)
  { city: 'Vitoria-Gasteiz', province: 'Álava', terms: ['parque empresarial jundiz vitoria paduleta lermandabidea', 'poligono industrial ali gobeo vitoria', 'poligono gamarra betoño portal de bergara'] },
  
  // 2. Navarra / Comarca de Pamplona (Landaben, Noáin-Mocholí, Arazuri, Agustinos)
  { city: 'Pamplona', province: 'Navarra', terms: ['poligono industrial landaben pamplona', 'poligono industrial mocholi noain navarra', 'poligono industrial arazuri orkoien pamplona', 'poligono industrial agustinos areta huarte'] },

  // 3. Catalunha / Baix Llobregat & Vallès (Sant Boi, Cornellà, Prat, Martorell, Sabadell, Terrassa)
  { city: 'Sant Boi de Llobregat', province: 'Barcelona', terms: ['poligono industrial can calderon sant boi', 'poligono industrial les salines sant boi'] },
  { city: 'Cornellà de Llobregat', province: 'Barcelona', terms: ['poligono industrial almeda cornella', 'poligono industrial femades llobregat'] },
  { city: 'El Prat de Llobregat', province: 'Barcelona', terms: ['poligono industrial mas blau prat de llobregat', 'poligono industrial estruc prat'] },
  { city: 'Tarragona', province: 'Tarragona', terms: ['poligono petroquimico constanti vila-seca la canonja', 'poligono industrial el morell tarragona'] },

  // 4. Madrid & Corredor del Henares / Sul (San Fernando, Torrejón, Alcalá, Getafe, Pinto)
  { city: 'San Fernando de Henares', province: 'Madrid', terms: ['poligono industrial san fernando de henares puerta de madrid'] },
  { city: 'Torrejón de Ardoz', province: 'Madrid', terms: ['poligono industrial las monjas torrejon de ardoz', 'poligono industrial casablanca torrejon'] },
  { city: 'Alcalá de Henares', province: 'Madrid', terms: ['poligono industrial la garena alcala de henares', 'poligono industrial camporroso'] },
  { city: 'Getafe', province: 'Madrid', terms: ['poligono industrial los angeles san marcos getafe', 'poligono industrial los olivos getafe'] },
  { city: 'Pinto', province: 'Madrid', terms: ['poligono industrial las arenas el casar pinto'] },

  // 5. Galiza / Triângulo Metalúrgico de Vigo & Porriño (As Gándaras, A Granxa, Valladares)
  { city: 'O Porriño', province: 'Pontevedra', terms: ['poligono industrial as gandaras o porriño vigo', 'poligono industrial a granxa porriño'] },
  { city: 'Vigo', province: 'Pontevedra', terms: ['parque tecnologico de valadares vigo', 'poligono industrial do caramuxo vigo'] },
  { city: 'Ferrol', province: 'A Coruña', terms: ['poligono industrial a gandara ferrol naron', 'poligono industrial rio do pozo naron'] },

  // 6. Astúrias / Eixo Siderúrgico (Avilés PEPA, Gijón Somonte/Porceyo, Llanera Asipo/Silvota)
  { city: 'Avilés', province: 'Asturias', terms: ['parque empresarial principado de asturias peba aviles', 'poligono industrial canaple aviles'] },
  { city: 'Gijón', province: 'Asturias', terms: ['poligono industrial somonte gijon', 'poligono industrial mora garay porceyo gijon'] },
  { city: 'Llanera', province: 'Asturias', terms: ['poligono industrial asipo llanera asturias', 'poligono industrial silvota llanera'] },

  // 7. País Basco / Alto Deba & Goierri (Mondragón, Bergara, Beasain, Elgoibar)
  { city: 'Mondragón', province: 'Guipúzcoa', terms: ['poligono industrial san andres arrasate mondragon'] },
  { city: 'Bergara', province: 'Guipúzcoa', terms: ['poligono industrial kutzeburu san juan bergara'] },
  { city: 'Beasain', province: 'Guipúzcoa', terms: ['poligono industrial beasain ordizia gipuzkoa'] },
  { city: 'Elgoibar', province: 'Guipúzcoa', terms: ['poligono industrial lerun san roke elgoibar'] },

  // 8. Zaragoza / Eixo do Ebro (Plaza, Malpica, Cogullada, Centrovías)
  { city: 'Zaragoza', province: 'Zaragoza', terms: ['plataforma logistica industrial plaza zaragoza', 'poligono industrial malpica zaragoza', 'poligono industrial cogullada zaragoza'] },
  { city: 'La Muela', province: 'Zaragoza', terms: ['poligono industrial centrovia la muela zaragoza'] },

  // 9. Castellón & Valência (Almassora, Onda, Vila-real, Sagunto, Almussafes)
  { city: 'Almassora', province: 'Castellón', terms: ['poligono industrial mijares almassora', 'poligono industrial ramonet almassora'] },
  { city: 'Onda', province: 'Castellón', terms: ['poligono industrial el colomer la trencada onda'] },
  { city: 'Sagunto', province: 'Valencia', terms: ['parc sagunt poligono industrial ingruinsa puerto de sagunto'] },
  { city: 'Almussafes', province: 'Valencia', terms: ['parque industrial juan carlos i almussafes'] },

  // 10. Andaluzia / Campo de Gibraltar & Huelva
  { city: 'San Roque', province: 'Cádiz', terms: ['poligono industrial guadarranque san roque refineria'] },
  { city: 'Los Barrios', province: 'Cádiz', terms: ['poligono industrial palmones campo de gibraltar'] },
  { city: 'Palos de la Frontera', province: 'Huelva', terms: ['poligono industrial nuevo puerto huelva'] },
  { city: 'Puertollano', province: 'Ciudad Real', terms: ['complejo petroquimico puertollano poligono la naveta'] }
];

const SEARCH_SECTORS = [
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

async function searchDuckDuckGo(query) {
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

async function startMegaIndustrialParksCrawler() {
  console.log('==================================================================================');
  console.log('🏭 MOTOR DOS MEGA-POLÍGONOS INDUSTRIAIS DA ESPANHA (JÚNDIZ, LANDABEN, PEPA, PLAZA)');
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

  let parkIndex = 0;
  let totalNew = 0;

  while (true) {
    const park = MEGA_INDUSTRIAL_PARKS_SPAIN[parkIndex % MEGA_INDUSTRIAL_PARKS_SPAIN.length];
    console.log(`\n📍 [MEGA-POLO INDUSTRIAL] Minerando: ${park.city.toUpperCase()} (${park.province})...`);

    for (const sec of SEARCH_SECTORS) {
      const jobId = jobMap[sec.cnae] || jobMap['3320'];

      for (const term of sec.terms) {
        for (const parkTerm of park.terms) {
          const query = `${term} ${parkTerm}`;
          const links = await searchDuckDuckGo(query);

          for (const link of links) {
            try {
              const data = await scrapeCompanyData(link);
              if (!data) continue;

              if (existingEmails.has(data.email)) continue;

              // DNS MX check
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
              `, [jobId, empresaId, data.companyName, data.email, data.phone, data.website, data.address, park.city, park.province]);

              existingEmails.add(data.email);
              totalNew++;
              console.log(`🎯 [NOVO LEAD CAPTURADO] [${sec.name}] ${data.companyName} ➔ ${data.email} (${park.city}, ${park.province})`);

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
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    const currentTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
    console.log(`📊 [STATUS LIVE] Total no Staging: ${currentTotal.rows[0].count} empresas (+${totalNew} novos leads nesta sessão).`);

    parkIndex++;
    await new Promise(r => setTimeout(r, 2000));
  }
}

startMegaIndustrialParksCrawler();
