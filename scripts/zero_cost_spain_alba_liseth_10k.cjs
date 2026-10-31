/**
 * MOTOR 100% GRATUITO (CUSTO € 0,00 - SEM GOOGLE MAPS E SEM IA PAGA) - WAVE 3 FINAL (5.000 ALBA + 5.000 LISETH)
 */
const dns = require('dns').promises;
const { Pool } = require('pg');

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
  'gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
  'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'msn.com', 'telefonica.net',
  'terra.es', 'wanadoo.es', 'ya.com', 'ono.com', 'jazztel.es', 'movistar.es',
  'empresite.eleconomista.es', 'einforma.com', 'infocif.es', 'axesor.es',
  'paginasamarillas.es', 'kompass.com', 'europages.es', 'linkedin.com', 'facebook.com'
]);

const PARKED_MX_PATTERNS = [
  'sedoparking', 'parkingcrew', 'bodis', 'above.com', 'afternic', 'dan.com', 'eftydns', 'parklogic'
];

const SECTORS = [
  { prefix: 'carpinteria', label: 'Carpintería Metálica & Industrial' },
  { prefix: 'cerrajerias', label: 'Cerrajería & Estructuras Metálicas' },
  { prefix: 'ventanas', label: 'Cerramientos & Carpintería Metálica' },
  { prefix: 'puertas', label: 'Puertas Industriales & Automatismos' },
  { prefix: 'persianas', label: 'Cerramientos & Persianas Industriales' },
  { prefix: 'toldos', label: 'Estructuras & Cubiertas' },
  { prefix: 'cristaleria', label: 'Vidrio & Cerramientos Industriales' },
  { prefix: 'marmoles', label: 'Piedra Natural & Maquinaria' },
  { prefix: 'granitos', label: 'Piedra & Transformación Industrial' },
  { prefix: 'pavimentos', label: 'Pavimentos Industriales' },
  { prefix: 'impermeabilizaciones', label: 'Impermeabilización & Cubiertas' },
  { prefix: 'fachadas', label: 'Fachadas & Estructuras' },
  { prefix: 'demoliciones', label: 'Demoliciones & Obra Civil' },
  { prefix: 'aridos', label: 'Áridos & Canteras' },
  { prefix: 'carrocerias', label: 'Carrocerías & Calderería Pesada' },
  { prefix: 'remolques', label: 'Fabricación de Remolques & Metalmecánica' },
  { prefix: 'reformas', label: 'Construcción & Rehabilitación Industrial' },
  { prefix: 'mudanzas', label: 'Logística & Transporte' },
  { prefix: 'comercial', label: 'Suministro & Distribución Industrial' },
  { prefix: 'grupo', label: 'Grupo Empresarial & Industrial' },
  { prefix: 'industrial', label: 'Servicios Industriales' },
  { prefix: 'sistemas', label: 'Sistemas & Ingeniería Industrial' },
  { prefix: 'tecnologia', label: 'Tecnología & Automatización' },
  { prefix: 'plasticos', label: 'Plásticos & Moldes Industriales' },
  { prefix: 'envases', label: 'Envases & Embalajes Industriales' },
  { prefix: 'embalajes', label: 'Embalaje Industrial' },
  { prefix: 'moldes', label: 'Moldes & Matricería' },
  { prefix: 'compresores', label: 'Compresores & Neumática' },
  { prefix: 'bombas', label: 'Bombas & Fluidos Industriales' },
  { prefix: 'calderas', label: 'Calderas & Térmica Industrial' },
  { prefix: 'refrigeracion', label: 'Frío & Refrigeración Industrial' },
  { prefix: 'ventilacion', label: 'Ventilación & Climatización' },
  { prefix: 'solar', label: 'Energía Solar & Fotovoltaica' },
  { prefix: 'electromecanica', label: 'Electromecánica Industrial' }
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

const mxCache = new Map();
async function verifyCorporateMx(domain) {
  if (!domain || BLOCKED_DOMAINS.has(domain)) return false;
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))
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

async function scrapeSpanishWebsite(domain, defaultName) {
  const urls = [`https://${domain}`, `https://www.${domain}`];
  let foundEmail = null;
  let foundPhone = null;
  let foundTitle = null;

  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1800);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();

      if (!foundTitle) {
        const tMatch = html.match(/<title[^>]*>([^<]{3,90})<\/title>/i);
        if (tMatch) {
          const cleanT = tMatch[1].replace(/\s+/g, ' ').split(/[|\-–—]/)[0].trim();
          if (cleanT.length >= 4 && !/403|404|error|index of|parking|domain/i.test(cleanT)) {
            foundTitle = cleanT;
          }
        }
      }

      if (!foundPhone) {
        const pMatch = html.match(/(?:\+34\s?)?[689]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
        if (pMatch) foundPhone = pMatch[0].trim();
      }

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

  return {
    email: foundEmail || `info@${domain}`,
    phone: foundPhone,
    companyName: (foundTitle || defaultName).slice(0, 120)
  };
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 6 });

  const existingRes = await pool.query(`
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
      if (d) existingDomains.add(d);
    }
  }

  const countRes = await pool.query(`
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

  console.log(`🇪🇸 [ESPANHA WAVE 3 INÍCIO] Alba: ${albaCount}/${TARGET_PER_COMMERCIAL} | Liseth: ${lisethCount}/${TARGET_PER_COMMERCIAL}`);

  const combinations = [];
  for (const sec of SECTORS) {
    for (const suf of SUFFIXES_AND_CITIES) {
      const cleanSuf = suf.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (!cleanSuf) continue;
      const defaultName = `${sec.prefix.charAt(0).toUpperCase() + sec.prefix.slice(1)} ${suf.charAt(0).toUpperCase() + suf.slice(1)} S.L.`;

      const domEs1 = `${sec.prefix}${cleanSuf}.es`;
      if (!existingDomains.has(domEs1)) combinations.push({ domain: domEs1, defaultName, sector: sec.label });

      const domEs2 = `${cleanSuf}${sec.prefix}.es`;
      if (!existingDomains.has(domEs2)) combinations.push({ domain: domEs2, defaultName, sector: sec.label });

      const domCom = `${sec.prefix}${cleanSuf}.com`;
      if (!existingDomains.has(domCom)) combinations.push({ domain: domCom, defaultName, sector: sec.label });
    }
  }

  console.log(`Total de combinações industriais (Wave 3) para varredura DNS MX + Web: ${combinations.length}`);

  const CHUNK_SIZE = 50;
  for (let i = 0; i < combinations.length; i += CHUNK_SIZE) {
    if (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL) break;

    const chunk = combinations.slice(i, i + CHUNK_SIZE);
    const verifiedChunk = (await Promise.all(chunk.map(async cand => {
      if (existingDomains.has(cand.domain)) return null;
      const mxOk = await verifyCorporateMx(cand.domain);
      if (!mxOk) return null;
      const scraped = await scrapeSpanishWebsite(cand.domain, cand.defaultName);
      return {
        ...cand,
        email: scraped.email.toLowerCase().trim(),
        phone: scraped.phone,
        companyName: scraped.companyName
      };
    }))).filter(Boolean);

    for (const item of verifiedChunk) {
      if (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL) break;
      if (existingDomains.has(item.domain) || existingEmails.has(item.email)) continue;

      existingDomains.add(item.domain);
      existingEmails.add(item.email);

      let assignAlba = false;
      if (albaCount < TARGET_PER_COMMERCIAL && lisethCount < TARGET_PER_COMMERCIAL) {
        assignAlba = (TARGET_PER_COMMERCIAL - albaCount) >= (TARGET_PER_COMMERCIAL - lisethCount);
      } else if (albaCount < TARGET_PER_COMMERCIAL) {
        assignAlba = true;
      } else {
        assignAlba = false;
      }

      try {
        if (assignAlba) {
          await pool.query(`
            INSERT INTO core_comercial.leads (
              name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              ARRAY['Espanha', 'B2B', $8, 'Mailing Alba - Inéditos Espanha 2026'],
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
          await pool.query(`
            INSERT INTO core_comercial.leads (
              name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              ARRAY['Espanha', 'B2B', $8, 'Mailing Liseth - Inéditos Espanha 2026'],
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
        if (totalDone % 50 === 0 || (albaCount >= TARGET_PER_COMMERCIAL && lisethCount >= TARGET_PER_COMMERCIAL)) {
          console.log(`🇪🇸 [ESPANHA PROGRESSO] Alba: ${albaCount}/${TARGET_PER_COMMERCIAL} | Liseth: ${lisethCount}/${TARGET_PER_COMMERCIAL} | Último: ${item.companyName} (${item.email})`);
        }
      } catch {
        // ignore duplicate error
      }
    }
  }

  console.log(`✅ [ESPANHA WAVE 3 CONCLUÍDO] Alba: ${albaCount} | Liseth: ${lisethCount}`);
  await pool.end();
}

main().catch(console.error);
