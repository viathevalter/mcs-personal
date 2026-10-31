/**
 * MOTOR 100% ESTRITO HTML REAL - ESPANHA FECHAMENTO FINAL (ALBA 4811->5000 & LISETH 4810->5000)
 * PROIBIDO CHUTAR info@dominio.es!
 */
const dns = require('dns').promises;
const { Client } = require('pg');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '9.9.9.9']);

const DB_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const TRIANGULO_ID = 'a798620a-358a-4c6c-9db2-3a507c583cac';
const WISEOWE_ID = 'dae64d51-2181-4510-b14f-e63d2f111a8e';

const ALBA_ID = 'ca69863d-998b-4bad-865a-19720e7a1f67';
const LISETH_ID = 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa';

const TRIANGULO_STAGE_NOVO = '194d24b4-8e2c-4778-9200-639263e6de77';
const WISEOWE_STAGE_NOVO = '048f4587-f416-4fc2-b3c9-09c42347df95';

const TARGET_PER_COMMERCIAL = 5000;

const BLOCKED_DOMAINS = new Set([
  'exemple.com', 'example.com', 'dominio.es', 'tudominio.es', 'miempresa.es',
  'tuempresa.com', 'test.com', 'email.com', 'sentry.io', 'wixpress.com',
  'gmail.com', 'gmail.co', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
  'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'msn.com', 'telefonica.net',
  'terra.es', 'wanadoo.es', 'ya.com', 'ono.com', 'jazztel.es', 'movistar.es',
  'empresite.eleconomista.es', 'einforma.com', 'infocif.es', 'axesor.es',
  'paginasamarillas.es', 'kompass.com', 'europages.es', 'linkedin.com', 'facebook.com',
  'dream-theme.com', 'wordpress.org', 'wordpress.com', 'ionos.es', 'ionos.com', 'arsys.es', 'dinahosting.com'
]);

const PARKED_TITLE_REGEX = /bienvenido a hostinet|pr[oó]ximamente|web en venta|dominio en venta|domain for sale|sedoparking|parking|index of \/|default web site|security check|coming soon|en construction|403 forbidden|404 not found|servicio listo para iniciar|account suspended|cuenta suspendida/i;

const LATAM_REGEX = /yucat[aá]n|cdmx|m[eé]xico|colombia|bogot[aá]|medell[ií]n|argentina|buenos aires|chile|santiago de chile|per[uú]|lima|e\.i\.r\.l|s\.a\. de c\.v\.|\+52|\+57|\+54|\+56|\+51|honduras|guatemala|costa rica|ecuador|venezuela/i;

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
    .replace(/\[at\]|\(at\)|\[arroba\]|\(arroba\)/gi, '@');

  const cfMatches = html.match(/data-cfemail=["']([a-fA-F0-9]+)["']/g) || [];
  for (const m of cfMatches) {
    const hex = m.replace(/data-cfemail=["']|["']/g, '');
    const decoded = decodeCfEmail(hex);
    if (decoded && decoded.includes('@')) html += ` ${decoded} `;
  }

  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const validSame = [];
  const validCorp = [];

  for (const rawE of matches) {
    const e = rawE.toLowerCase().trim().replace(/^[.,;:]+|[.,;:]+$/g, '');
    if (e.length < 6 || e.length > 80) continue;
    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|ico|pdf|mp4|mp3|zip)$/i.test(e)) continue;
    if (/^(2x|3x|100x|200x|300x|400x|500x)/i.test(e)) continue;
    if (e.includes('sentry') || e.includes('wix') || e.includes('wordpress') || e.includes('prestashop') || e.includes('example') || e.includes('exemple') || e.includes('dominio') || e.includes('tuempresa') || e.includes('usuario@') || e.includes('nombre@') || e.includes('email@') || e.includes('correo@') || e.startsWith('webmaster@')) continue;

    const [user, dom] = e.split('@');
    if (!user || !dom || BLOCKED_DOMAINS.has(dom)) continue;
    if (!/^[a-z0-9.-]+\.[a-z]{2,8}$/.test(dom)) continue;

    if (dom === targetDomain || dom.endsWith(`.${targetDomain}`)) {
      if (!validSame.includes(e)) validSame.push(e);
    } else {
      if (!validCorp.includes(e)) validCorp.push(e);
    }
  }

  return validSame.length > 0 ? validSame : validCorp;
}

async function fetchHtml(url, timeoutMs = 2200) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
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

const visitedDomains = new Set();

async function verifyAndScrapeRealSpanishSite(domain, fallbackName) {
  if (visitedDomains.has(domain)) return null;
  visitedDomains.add(domain);

  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1300))
    ]);
    if (!Array.isArray(mx) || mx.length === 0) return null;
  } catch {
    return null;
  }

  const baseUrls = [`https://${domain}`, `https://www.${domain}`];
  let homeHtml = null;
  let workingBase = null;
  for (const b of baseUrls) {
    const h = await fetchHtml(b, 2200);
    if (h && h.length > 250) {
      homeHtml = h;
      workingBase = b;
      break;
    }
  }
  if (!homeHtml || !workingBase) return null;

  let cleanTitle = fallbackName;
  const tMatch = homeHtml.match(/<title[^>]*>([\s\S]{2,120}?)<\/title>/i);
  if (tMatch) {
    const t = tMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (PARKED_TITLE_REGEX.test(t)) return null;
    const firstPart = t.split(/[|\-–—·•]/)[0].trim();
    if (firstPart.length >= 3 && !/^(inicio|home|bienvenido|portada|index)$/i.test(firstPart)) {
      cleanTitle = firstPart.slice(0, 120);
    }
  }

  const bodySample = homeHtml.slice(0, 15000);
  if (PARKED_TITLE_REGEX.test(bodySample.slice(0, 2500))) return null;
  if (domain.endsWith('.com') && LATAM_REGEX.test(bodySample)) return null;

  let foundPhone = null;
  const pm = homeHtml.match(/(?:\+34\s?)?[689]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
  if (pm) foundPhone = pm[0].trim();

  let emails = extractRealEmailsFromHtml(homeHtml, domain);
  if (emails.length === 0) {
    const subPaths = ['/contacto', '/aviso-legal', '/contact'];
    const linkMatches = homeHtml.match(/href=["']([^"']*(?:contact|aviso|legal)[^"']*)["']/gi) || [];
    for (const lm of linkMatches.slice(0, 2)) {
      const href = lm.replace(/^href=["']|["']$/gi, '').trim();
      if (href.startsWith('/') && !subPaths.includes(href)) subPaths.unshift(href);
    }
    for (const sp of subPaths.slice(0, 2)) {
      const subHtml = await fetchHtml(`${workingBase}${sp}`, 1900);
      if (subHtml && subHtml.length > 200) {
        if (!foundPhone) {
          const pm2 = subHtml.match(/(?:\+34\s?)?[689]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
          if (pm2) foundPhone = pm2[0].trim();
        }
        const subE = extractRealEmailsFromHtml(subHtml, domain);
        if (subE.length > 0) {
          emails = subE;
          break;
        }
      }
    }
  }

  if (emails.length === 0) return null;

  return {
    email: emails[0],
    phone: foundPhone,
    companyName: cleanTitle || fallbackName
  };
}

const HIGH_HIT_SECTORS = [
  { prefix: 'reformas', label: 'Construcción & Rehabilitación' },
  { prefix: 'construcciones', label: 'Construcción & Obra Civil' },
  { prefix: 'instalaciones', label: 'Instalaciones Industriales' },
  { prefix: 'talleres', label: 'Mecanizado & Talleres' },
  { prefix: 'carpinteria', label: 'Carpintería Metálica & Madera' },
  { prefix: 'cerrajeria', label: 'Cerrajería & Estructuras Metálicas' },
  { prefix: 'fontaneria', label: 'Fontanería & Tuberías' },
  { prefix: 'electricidad', label: 'Instalaciones Eléctricas' },
  { prefix: 'pinturas', label: 'Pintura Industrial & Decorativa' },
  { prefix: 'transportes', label: 'Logística & Transporte' },
  { prefix: 'mudanzas', label: 'Mudanzas & Logística' },
  { prefix: 'aluminios', label: 'Carpintería de Aluminio & PVC' },
  { prefix: 'cristaleria', label: 'Vidrio & Cerramientos' },
  { prefix: 'toldos', label: 'Toldos & Estructuras' },
  { prefix: 'persianas', label: 'Persianas & Cerramientos' },
  { prefix: 'puertas', label: 'Puertas & Automatismos' },
  { prefix: 'ventanas', label: 'Ventanas & Cerramientos' },
  { prefix: 'muebles', label: 'Industria del Mueble' },
  { prefix: 'maderas', label: 'Industria Maderera' },
  { prefix: 'imprenta', label: 'Artes Gráficas & Packaging' },
  { prefix: 'graficas', label: 'Artes Gráficas' },
  { prefix: 'rotulos', label: 'Rotulación & Estructuras' },
  { prefix: 'limpiezas', label: 'Limpieza Industrial' },
  { prefix: 'desatascos', label: 'Saneamientos & Tuberías' },
  { prefix: 'cerrajeros', label: 'Cerrajería 24h & Metálica' },
  { prefix: 'fontaneros', label: 'Fontanería & Calefacción' },
  { prefix: 'electricistas', label: 'Instalaciones Eléctricas' },
  { prefix: 'pintores', label: 'Pintura & Revestimientos' },
  { prefix: 'asesoria', label: 'Asesoría Empresarial' },
  { prefix: 'gestoria', label: 'Gestión Empresarial' },
  { prefix: 'inmobiliaria', label: 'Inmobiliaria & Naves' },
  { prefix: 'abogados', label: 'Servicios Jurídicos' }
];

const SUFFIXES_AND_CITIES = [
  'madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza', 'malaga', 'murcia', 'bilbao',
  'alicante', 'cordoba', 'valladolid', 'vigo', 'gijon', 'hospitalet', 'vitoria', 'coruna',
  'elche', 'granada', 'terrassa', 'badalona', 'oviedo', 'cartagena', 'sabadell', 'jerez',
  'pamplona', 'almeria', 'leganes', 'donostia', 'burgos', 'albacete', 'castellon',
  'santander', 'getafe', 'alcorcon', 'logrono', 'badajoz', 'salamanca', 'huelva', 'marbella',
  'lleida', 'tarragona', 'leon', 'cadiz', 'jaen', 'ourense', 'lugo', 'girona', 'caceres',
  'santiago', 'pontevedra', 'toledo', 'guadalajara', 'palencia', 'zamora', 'avila', 'segovia',
  'cuenca', 'soria', 'huesca', 'teruel', 'algeciras', 'ferrol', 'aviles', 'naron', 'porrino',
  'arteixo', 'barakaldo', 'getxo', 'irun', 'basauri', 'portugalete', 'santurtzi', 'durango',
  'ermua', 'mondragon', 'arrasate', 'bergara', 'azpeitia', 'azkoitia', 'beasain', 'tolosa',
  'andoain', 'hernani', 'renteria', 'oiartzun', 'zarautz', 'eibar', 'elgoibar',
  'llodio', 'amurrio', 'alsasua', 'tudela', 'estella', 'tafalla', 'calahorra', 'arnedo',
  'haro', 'miranda', 'aranda', 'ponferrada', 'astorga', 'benavente', 'medina', 'bejar',
  'plasencia', 'merida', 'donbenito', 'almendralejo', 'zafra', 'puertollano', 'tomelloso',
  'alcazar', 'valdepenas', 'manzanares', 'almansa', 'hellin', 'villarrobledo', 'yecla',
  'jumilla', 'lorca', 'molina', 'alcantarilla', 'cieza', 'totana', 'mazarron', 'aguilas',
  'orihuela', 'torrevieja', 'alcoy', 'elda', 'petrer', 'villena', 'ibi', 'onil', 'castalla',
  'novelda', 'crevillente', 'denia', 'benidorm', 'gandia', 'ontinyent', 'xativa', 'alzira',
  'sueca', 'cullera', 'sagunto', 'paterna', 'torrent', 'mislata', 'quart', 'manises',
  'aldaia', 'alaquas', 'xirivella', 'catarroja', 'silla', 'picassent', 'ribarroja', 'cheste',
  'requena', 'utiel', 'lliria', 'benicarlo', 'vinaros', 'vilareal', 'burriana', 'onda',
  'almassora', 'vallduxo', 'nules', 'segorbe', 'alcaniz', 'andorra', 'monzon', 'barbastro',
  'fraga', 'binefar', 'jaca', 'calatayud', 'ejea', 'tarazona', 'caspe', 'utebo',
  'cuarte', 'zuera', 'tortosa', 'amposta', 'reus', 'valls', 'vendrell',
  'calafell', 'vilafranca', 'vilanova', 'sitges', 'viladecans', 'prat', 'cornella',
  'esplugues', 'santboi', 'santfeliu', 'molins', 'martorell', 'abrera', 'igualada', 'manresa',
  'berga', 'vic', 'manlleu', 'torello', 'ripoll', 'olot', 'figueres', 'blanes', 'lloret',
  'palamos', 'palafrugell', 'salt', 'banyoles', 'granollers', 'mollet', 'parets', 'montornes',
  'cardedeu', 'celoni', 'mataro', 'premia', 'masnou', 'calella', 'pineda', 'tordera',
  'rubi', 'santcugat', 'cerdanyola', 'ripollet', 'montcada', 'barbera', 'castellar',
  'sentmenat', 'polinya', 'palau', 'tarrega', 'balaguer', 'mollerussa', 'cervera',
  'fuenlabrada', 'mostoles', 'parla', 'pinto', 'valdemoro', 'aranjuez', 'arganda', 'rivas',
  'coslada', 'sanfernando', 'torrejon', 'alcala', 'alcobendas', 'sansebastian', 'trescantos',
  'colmenar', 'lasrozas', 'majadahonda', 'boadilla', 'villaviciosa', 'navalcarnero',
  'humanes', 'moraleja', 'azuqueca', 'cabanillas', 'illescas',
  'garcia', 'martinez', 'lopez', 'sanchez', 'gonzalez', 'gomez', 'fernandez', 'perez',
  'rodriguez', 'martin', 'jimenez', 'ruiz', 'hernandez', 'diaz', 'moreno', 'alvarez',
  'munoz', 'romero', 'alonso', 'gutierrez', 'navarro', 'torres', 'dominguez', 'vazquez',
  'ramos', 'gil', 'ramirez', 'serrano', 'blanco', 'suarez', 'molina', 'morales', 'ortega',
  'delgado', 'castro', 'ortiz', 'rubio', 'marin', 'sanz', 'nunez', 'iglesias', 'medina',
  'garrido', 'cortes', 'castillo', 'santos', 'lozano', 'guerrero', 'cano', 'prieto',
  'mendez', 'cruz', 'calvo', 'gallego', 'vidal', 'marquez', 'herrera', 'pena',
  'flores', 'cabrera', 'campos', 'vega', 'fuentes', 'carrasco', 'diez', 'caballero',
  'reyes', 'nieto', 'aguilar', 'pascual', 'herrero', 'santana', 'lorenzo', 'hidalgo',
  'montero', 'ibanez', 'gimenez', 'ferrer', 'duran', 'vicente', 'benitez', 'mora',
  'arias', 'vargas', 'carmona', 'crespo', 'roman', 'pastor', 'soto', 'saez',
  'velasco', 'soler', 'moya', 'esteban', 'parra', 'bravo', 'gallardo', 'rojas', 'pardo',
  'merino', 'franco', 'espinosa', 'izquierdo', 'lara', 'silva', 'rivera',
  'casado', 'arroyo', 'redondo', 'camacho', 'rey', 'vera', 'otero', 'luque', 'galan',
  'montes', 'rios', 'sierra', 'segura', 'carrillo', 'marcos', 'marti', 'soriano', 'mendoza',
  'robles', 'vila', 'valero', 'palacios', 'exposito', 'benito', 'varela', 'andres',
  'macias', 'pereira', 'guerra', 'heredia', 'bueno', 'villar', 'mateo', 'contreras',
  'guillen', 'mateos', 'escudero', 'casas', 'aparicio', 'rivero', 'estevez',
  'beltran', 'padilla', 'gracia', 'rico', 'calderon', 'abad', 'galvez', 'conde', 'salas',
  'jurado', 'quintana', 'plaza', 'acosta', 'blazquez', 'roca', 'bermudez',
  'costa', 'miguel', 'santamaria', 'salazar', 'guzman', 'serra', 'villanueva', 'cuesta',
  'alva', 'trujillo', 'hurtado', 'pacheco', 'simon', 'lazaro', 'pons', 'riera', 'planas',
  'norte', 'sur', 'levante', 'centro', 'iberica', 'hispania', 'peninsular', 'europa',
  'atlantico', 'mediterraneo', 'cantabrico', 'ebro', 'duero', 'tajo', 'guadalquivir',
  'asturias', 'galicia', 'cantabria', 'navarra', 'rioja', 'aragon', 'cataluna', 'valencia',
  'murcia', 'andalucia', 'extremadura', 'mancha', 'leon', 'castilla', 'canarias', 'baleares'
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const existingRes = await client.query(`
    SELECT lower(trim(email)) as email
    FROM core_comercial.leads
    WHERE email IS NOT NULL
  `);

  const existingEmails = new Set();
  const existingDomains = new Set();

  for (const r of existingRes.rows) {
    if (r.email) {
      existingEmails.add(r.email);
      const d = r.email.split('@')[1];
      if (d) {
        existingDomains.add(d);
        visitedDomains.add(d);
      }
    }
  }

  const countRes = await client.query(`
    SELECT
      assigned_to,
      count(*) FILTER (
        WHERE NOT ('Bounce' = ANY(COALESCE(tags, ARRAY[]::text[])))
          AND NOT ('E-mail Inválido' = ANY(COALESCE(tags, ARRAY[]::text[])))
          AND NOT EXISTS (
            SELECT 1 FROM core_comercial.marketing_campaign_queue q
            WHERE q.lead_id = leads.id AND q.status = 'sent'
          )
      ) as virgin_cnt
    FROM core_comercial.leads
    WHERE assigned_to IN ($1, $2)
    GROUP BY assigned_to
  `, [ALBA_ID, LISETH_ID]);

  let albaCount = 0;
  let lisethCount = 0;
  for (const r of countRes.rows) {
    if (r.assigned_to === ALBA_ID) albaCount = parseInt(r.virgin_cnt, 10) || 0;
    if (r.assigned_to === LISETH_ID) lisethCount = parseInt(r.virgin_cnt, 10) || 0;
  }

  console.log(`🇪🇸 [ESPANHA FECHAMENTO 5000] Alba: ${albaCount}/${TARGET_PER_COMMERCIAL} | Liseth: ${lisethCount}/${TARGET_PER_COMMERCIAL}`);

  const combinations = [];
  for (const sec of HIGH_HIT_SECTORS) {
    for (const suf of SUFFIXES_AND_CITIES) {
      const cleanSuf = suf.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (!cleanSuf) continue;
      const defaultName = `${sec.prefix.charAt(0).toUpperCase() + sec.prefix.slice(1)} ${suf.charAt(0).toUpperCase() + suf.slice(1)} S.L.`;

      // Reversed .com (never tested before!)
      const domRevCom = `${cleanSuf}${sec.prefix}.com`;
      if (!existingDomains.has(domRevCom)) combinations.push({ domain: domRevCom, defaultName, sector: sec.label });

      // Hyphenated .es & .com
      const domHyphEs = `${sec.prefix}-${cleanSuf}.es`;
      if (!existingDomains.has(domHyphEs)) combinations.push({ domain: domHyphEs, defaultName, sector: sec.label });

      const domHyphCom = `${sec.prefix}-${cleanSuf}.com`;
      if (!existingDomains.has(domHyphCom)) combinations.push({ domain: domHyphCom, defaultName, sector: sec.label });
    }
  }

  console.log(`Total combinações inéditas (.com invertido + hifenizados): ${combinations.length}`);

  const CHUNK_SIZE = 70;
  for (let i = 0; i < combinations.length; i += CHUNK_SIZE) {
    if (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL) break;

    const chunk = combinations.slice(i, i + CHUNK_SIZE);
    const verifiedChunk = (await Promise.all(chunk.map(async cand => {
      if (existingDomains.has(cand.domain)) return null;
      const scraped = await verifyAndScrapeRealSpanishSite(cand.domain, cand.defaultName);
      if (!scraped) return null;
      return { ...cand, ...scraped };
    }))).filter(Boolean);

    for (const item of verifiedChunk) {
      if (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL) break;
      const emailDomain = item.email.split('@')[1];
      if (existingDomains.has(item.domain) || existingDomains.has(emailDomain) || existingEmails.has(item.email)) continue;

      existingDomains.add(item.domain);
      existingDomains.add(emailDomain);
      existingEmails.add(item.email);

      let assignAlba = false;
      if (albaCount < TARGET_PER_COMMERCIAL && lisethCount < TARGET_PER_COMMERCIAL) {
        assignAlba = (TARGET_PER_COMMERCIAL - albaCount) >= (TARGET_PER_COMMERCIAL - lisethCount);
      } else if (albaCount < TARGET_PER_COMMERCIAL) {
        assignAlba = true;
      }

      try {
        if (assignAlba) {
          await client.query(`
            INSERT INTO core_comercial.leads (
              name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              ARRAY['Espanha', 'B2B', $8, 'HTML Verificado 100% Real', 'Mailing Alba - Inéditos Espanha 2026'],
              NOW(), NOW()
            )
          `, [
            item.companyName,
            item.companyName,
            item.email,
            item.phone || null,
            TRIANGULO_ID,
            ALBA_ID,
            TRIANGULO_STAGE_NOVO,
            item.sector
          ]);
          albaCount++;
        } else {
          await client.query(`
            INSERT INTO core_comercial.leads (
              name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              ARRAY['Espanha', 'B2B', $8, 'HTML Verificado 100% Real', 'Mailing Liseth - Inéditos Espanha 2026'],
              NOW(), NOW()
            )
          `, [
            item.companyName,
            item.companyName,
            item.email,
            item.phone || null,
            WISEOWE_ID,
            LISETH_ID,
            WISEOWE_STAGE_NOVO,
            item.sector
          ]);
          lisethCount++;
        }

        const totalDone = albaCount + lisethCount;
        if (totalDone % 25 === 0 || (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL)) {
          console.log(`🇪🇸 [ESPANHA 100% HTML REAL] Alba: ${albaCount}/${TARGET_PER_COMMERCIAL} | Liseth: ${lisethCount}/${TARGET_PER_COMMERCIAL} | Último: ${item.companyName} (${item.email})`);
        }
      } catch {
        // ignore duplicate
      }
    }
  }

  console.log(`✅ [ESPANHA ESTRITO HTML CONCLUÍDO] Alba: ${albaCount} | Liseth: ${lisethCount}`);
  await client.end();
}

main().catch(console.error);
