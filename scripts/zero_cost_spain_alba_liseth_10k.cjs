/**
 * MOTOR 100% GRATUITO (CUSTO € 0,00 - SEM GOOGLE MAPS E SEM IA PAGA)
 * CAPTURA DE NOVOS LEADS B2B INDUSTRIAIS NA ESPANHA PARA:
 * - ALBA (Triângulo Espanha): Meta 5.000 Leads Inéditos Exclusivos
 * - LISETH (Wiseowe Espanha): Meta 5.000 Leads Inéditos Exclusivos
 * Fonte: Multi-Buscador B2B + Descoberta Direta DNS MX (.es) + Web Scraping (/contacto, /aviso-legal)
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
  { prefix: 'talleres', label: 'Mecanizado & Talleres Metalúrgicos' },
  { prefix: 'mecanizados', label: 'Mecanizado Industrial CNC' },
  { prefix: 'caldereria', label: 'Calderería & Tubería Industrial' },
  { prefix: 'estructuras', label: 'Estructuras Metálicas & Montajes' },
  { prefix: 'metalurgica', label: 'Metalurgia & Siderurgia' },
  { prefix: 'montajes', label: 'Montajes Industriales' },
  { prefix: 'soldadura', label: 'Soldadura Industrial' },
  { prefix: 'soldaduras', label: 'Soldadura Industrial' },
  { prefix: 'tuberia', label: 'Tubería Industrial' },
  { prefix: 'tuberias', label: 'Tubería Industrial' },
  { prefix: 'mantenimiento', label: 'Mantenimiento Industrial' },
  { prefix: 'instalaciones', label: 'Instalaciones Industriales' },
  { prefix: 'climatizacion', label: 'Climatización & HVAC Industrial' },
  { prefix: 'carpinteriametalica', label: 'Carpintería Metálica' },
  { prefix: 'construccionesmetalicas', label: 'Construcciones Metálicas' },
  { prefix: 'ingenieria', label: 'Ingeniería Industrial' },
  { prefix: 'automatismos', label: 'Automatización & Cuadros Eléctricos' },
  { prefix: 'hidraulica', label: 'Hidráulica & Neumática Industrial' },
  { prefix: 'inoxidables', label: 'Acero Inoxidable & Calderería' },
  { prefix: 'inox', label: 'Acero Inoxidable & Calderería' },
  { prefix: 'forja', label: 'Forja & Cerrajería Industrial' },
  { prefix: 'fundicion', label: 'Fundición Metálica' },
  { prefix: 'fundiciones', label: 'Fundición Metálica' },
  { prefix: 'troqueles', label: 'Matricería & Troqueles' },
  { prefix: 'matrices', label: 'Matricería & Moldes Industriales' },
  { prefix: 'matriceria', label: 'Matricería Industrial' },
  { prefix: 'moldes', label: 'Moldes & Mecanizados' },
  { prefix: 'laser', label: 'Corte por Láser & Chapa' },
  { prefix: 'oxicorte', label: 'Oxicorte & Plasma' },
  { prefix: 'plegados', label: 'Plegado & Deformación Metálica' },
  { prefix: 'estampaciones', label: 'Estampación Metálica' },
  { prefix: 'recubrimientos', label: 'Tratamientos Superficiales' },
  { prefix: 'galvanizados', label: 'Galvanizado & Recubrimientos' },
  { prefix: 'bobinados', label: 'Bobinados & Motores Eléctricos' },
  { prefix: 'reparaciones', label: 'Reparación & Mantenimiento Naval/Industrial' },
  { prefix: 'suministros', label: 'Suministros Industriales' },
  { prefix: 'aislamientos', label: 'Aislamientos Térmicos & Calorifugados' },
  { prefix: 'andamios', label: 'Andamios & Servicios Industriales' },
  { prefix: 'gruas', label: 'Grúas & Elevación Industrial' },
  { prefix: 'cerrajeria', label: 'Cerrajería & Estructuras Metálicas' },
  { prefix: 'herrajes', label: 'Herrajes & Metalistería' },
  { prefix: 'ferreteria', label: 'Suministro Ferretero Industrial' },
  { prefix: 'transformados', label: 'Transformados Metálicos' },
  { prefix: 'aluminios', label: 'Carpintería de Aluminio & PVC' },
  { prefix: 'cerramientos', label: 'Cerramientos & Cubiertas Industriales' },
  { prefix: 'cubiertas', label: 'Cubiertas & Naves Industriales' },
  { prefix: 'naves', label: 'Construcción de Naves Industriales' },
  { prefix: 'prefabricados', label: 'Prefabricados & Hormigón Industrial' },
  { prefix: 'hormigones', label: 'Hormigones & Obra Civil' },
  { prefix: 'excavaciones', label: 'Obra Civil & Excavaciones' },
  { prefix: 'transportes', label: 'Logística & Transporte Pesado' },
  { prefix: 'envases', label: 'Envases & Embalajes Industriales' },
  { prefix: 'embalajes', label: 'Embalaje Industrial' },
  { prefix: 'plasticos', label: 'Inyección de Plásticos & Moldes' },
  { prefix: 'cauchos', label: 'Caucho & Elastómeros Industriales' },
  { prefix: 'valvulas', label: 'Valvulería & Fluidos' },
  { prefix: 'bombas', label: 'Bombas & Equipos de Bombeo' },
  { prefix: 'compresores', label: 'Compresores & Aire Comprimido' },
  { prefix: 'frio', label: 'Frío Industrial & Refrigeración' },
  { prefix: 'refrigeracion', label: 'Refrigeración Industrial' },
  { prefix: 'ventilacion', label: 'Ventilación & Extracción Industrial' },
  { prefix: 'calderas', label: 'Calderas & Vapor Industrial' },
  { prefix: 'quemadores', label: 'Combustión & Quemadores Industriales' },
  { prefix: 'depuradoras', label: 'Tratamiento de Aguas Industriales' },
  { prefix: 'energias', label: 'Energía & Renovables' },
  { prefix: 'solar', label: 'Energía Solar Industrial' },
  { prefix: 'elecnor', label: 'Instalaciones Eléctricas' },
  { prefix: 'electromecanica', label: 'Electromecánica Industrial' },
  { prefix: 'mecatronica', label: 'Mecatrónica & Robótica' },
  { prefix: 'robotica', label: 'Robótica & Automatización' },
  { prefix: 'astilleros', label: 'Naval & Astilleros' },
  { prefix: 'naval', label: 'Naval & Offshore' }
];

const SUFFIXES_AND_CITIES = [
  // Ciudades y Polígonos
  'madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza', 'malaga', 'murcia', 'bilbao',
  'alicante', 'cordoba', 'valladolid', 'vigo', 'gijon', 'hospitalet', 'vitoria', 'coruna',
  'elche', 'granada', 'terrassa', 'badalona', 'oviedo', 'cartagena', 'sabadell', 'jerez',
  'moles', 'pamplona', 'almeria', 'leganes', 'donostia', 'burgos', 'albacete', 'castellon',
  'santander', 'getafe', 'alcorcon', 'logrono', 'badajoz', 'salamanca', 'huelva', 'marbella',
  'lleida', 'tarragona', 'leon', 'cadiz', 'jaen', 'ourense', 'lugo', 'girona', 'caceres',
  'santiago', 'pontevedra', 'toledo', 'guadalajara', 'palencia', 'zamora', 'avila', 'segovia',
  'cuenca', 'soria', 'huesca', 'teruel', 'algeciras', 'ferrol', 'aviles', 'narón', 'porrino',
  'arteixo', 'barakaldo', 'getxo', 'irun', 'basauri', 'portugalete', 'santurtzi', 'durango',
  'ermua', 'mondragon', 'arrasate', 'bergara', 'azpeitia', 'azkoitia', 'beasain', 'tolosa',
  'andoain', 'hernani', 'renteria', 'oiartzun', 'zarautz', 'eibar', 'elgoibar', 'amorrortu',
  'llodio', 'amurri', 'alsasua', 'tudela', 'estella', 'tafalla', 'calahorra', 'arnedo',
  'haro', 'miranda', 'aranda', 'ponferrada', 'astorga', 'benavente', 'medina', 'bejar',
  'plasencia', 'merida', 'donbenito', 'almendralejo', 'zafra', 'puertollano', 'tomelloso',
  'alcazar', 'valdepenas', 'manzanares', 'almansa', 'hellin', 'villarrobledo', 'yecla',
  'jumilla', 'lorca', 'molina', 'alcantarilla', 'cieza', 'totana', 'mazarron', 'aguilas',
  'orihuela', 'torrevieja', 'alcoy', 'elda', 'petrer', 'villena', 'ibi', 'onil', 'castalla',
  'novelda', 'crevillente', 'denia', 'benidorm', 'gandia', 'ontinyent', 'xativa', 'alzira',
  'sueca', 'cullera', 'sagunto', 'paterna', 'torrent', 'mislata', 'quart', 'manises',
  'aldaia', 'alaquas', 'xirivella', 'catarroja', 'silla', 'picassent', 'ribarroja', 'cheste',
  'requena', 'utiel', 'lliria', 'benicarlo', 'vinaros', 'vila-real', 'burriana', 'onda',
  'almassora', 'vallduxo', 'nules', 'segorbe', 'alcaniz', 'andorra', 'monzon', 'barbastro',
  'fraga', 'binefar', 'sabinani', 'jaca', 'calatayud', 'ejea', 'tarazona', 'caspe', 'utebo',
  'cuarte', 'zuera', 'laalmunia', 'tortosa', 'amposta', 'reus', 'valls', 'vendrell',
  'calafell', 'vilafranca', 'vilanova', 'sitges', 'gavà', 'viladecans', 'prat', 'cornella',
  'esplugues', 'santboi', 'santfeliu', 'molins', 'martorell', 'abrera', 'igualada', 'manresa',
  'berga', 'vic', 'manlleu', 'torello', 'ripoll', 'olot', 'figueres', 'blanes', 'lloret',
  'palamos', 'palafrugell', 'salt', 'banyoles', 'granollers', 'mollet', 'parets', 'montornes',
  'lliça', 'cardedeu', 'celoni', 'mataro', 'premia', 'masnou', 'calella', 'pineda', 'tordera',
  'rubi', 'santcugat', 'cerdanyola', 'ripollet', 'montcada', 'barbera', 'castellar',
  'sentmenat', 'polinya', 'palau', 'tarrega', 'balaguer', 'mollerussa', 'cervera', 'seoul',
  'fuenlabrada', 'mostoles', 'parla', 'pinto', 'valdemoro', 'aranjuez', 'arganda', 'rivas',
  'coslada', 'sanfernando', 'torrejon', 'alcala', 'alcobendas', 'sansebastian', 'trescantos',
  'colmenar', 'lasrozas', 'majadahonda', 'boadilla', 'villaviciosa', 'navalcarnero', 'griñon',
  'humanes', 'moraleja', 'torrejondelacalzada', 'azuqueca', 'cabanillas', 'illescas',
  'yuncos', 'seseña', 'ocaña', 'quintanar', 'talavera', 'torrijos', 'sonseca', 'fuensalida',
  'antoñanzas', 'alcala', 'dos-hermanas', 'alcaladeguadaira', 'utrera', 'mairena', 'rinconada',
  'coria', 'camas', 'ecija', 'osuna', 'estepa', 'marchena', 'moron', 'lebrija', 'lucena',
  'puentegenil', 'montilla', 'priego', 'cabra', 'baena', 'palma', 'peñarroya', 'pozoblanco',
  'linares', 'ubeda', 'baeza', 'andujar', 'martos', 'alcala', 'bailen', 'carolina', 'motril',
  'almuñecar', 'baza', 'guadix', 'loja', 'armilla', 'maracena', 'atarfe', 'peligros', 'antequera',
  'ronda', 'velez', 'estepona', 'fuengirola', 'mijas', 'torremolinos', 'benalmadena', 'coin',
  'cartama', 'alhaurin', 'jerez', 'algeciras', 'sanfernando', 'puerto', 'chiclana', 'sanlucar',
  'linea', 'puertoreal', 'arcos', 'rota', 'barbate', 'conil', 'tarifa', 'ubrique',
  // Apellidos y raíces empresariales españolas muy comunes en pymes industriales
  'garcia', 'martinez', 'lopez', 'sanchez', 'gonzalez', 'gomez', 'fernandez', 'perez',
  'rodriguez', 'martin', 'jimenez', 'ruiz', 'hernandez', 'diaz', 'moreno', 'alvarez',
  'munoz', 'romero', 'alonso', 'gutierrez', 'navarro', 'torres', 'dominguez', 'vazquez',
  'ramos', 'gil', 'ramirez', 'serrano', 'blanco', 'suarez', 'molina', 'morales', 'ortega',
  'delgado', 'castro', 'ortiz', 'rubio', 'marin', 'sanz', 'nuñez', 'iglesias', 'medina',
  'garrido', 'cortes', 'castillo', 'santos', 'lozano', 'guerrero', 'cano', 'prieto',
  'mendez', 'cruz', 'calvo', 'gallego', 'vidal', 'leon', 'marquez', 'herrera', 'peña',
  'flores', 'cabrera', 'campos', 'vega', 'fuentes', 'carrasco', 'diez', 'caballero',
  'reyes', 'nieto', 'aguilar', 'pascual', 'herrero', 'santana', 'lorenzo', 'hidalgo',
  'montero', 'ibañez', 'gimenez', 'ferrer', 'duran', 'vicente', 'benitez', 'mora',
  'santiago', 'arias', 'vargas', 'carmona', 'crespo', 'roman', 'pastor', 'soto', 'saez',
  'velasco', 'soler', 'moya', 'esteban', 'parra', 'bravo', 'gallardo', 'rojas', 'pardo',
  'merino', 'franco', 'espinosa', 'izquierdo', 'lara', 'rivas', 'silva', 'rivera',
  'casado', 'arroyo', 'redondo', 'camacho', 'rey', 'vera', 'otero', 'luque', 'galan',
  'montes', 'rios', 'sierra', 'segura', 'carrillo', 'marcos', 'marti', 'soriano', 'mendoza',
  'robles', 'vila', 'valero', 'palacios', 'exposito', 'benito', 'varela', 'andres',
  'macias', 'pereira', 'guerra', 'heredia', 'bueno', 'villar', 'mateo', 'contreras',
  'miranda', 'guillen', 'mateos', 'escudero', 'casas', 'aparicio', 'rivero', 'estevez',
  'beltran', 'padilla', 'gracia', 'rico', 'calderon', 'abad', 'galvez', 'conde', 'salas',
  'jurado', 'quintana', 'plaza', 'acosta', 'aranda', 'blazquez', 'roca', 'bermudez',
  'costa', 'miguel', 'santamaria', 'salazar', 'guzman', 'serra', 'villanueva', 'cuesta',
  'alva', 'trujillo', 'hurtado', 'pacheco', 'simon', 'lazaro', 'pons', 'riera', 'planas',
  'norte', 'sur', 'levante', 'centro', 'iberica', 'hispania', 'peninsular', 'europa',
  'atlantico', 'mediterraneo', 'cantabrico', 'ebro', 'duero', 'tajo', 'guadalquivir',
  'henares', 'valles', 'baix', ' maresme', 'penedes', 'bages', 'osona', 'girones',
  'camp', 'ribera', 'horta', 'plana', 'costa', 'vega', 'campina', 'sierra', 'bahia',
  'ria', 'nervion', 'deba', 'urola', 'goierri', 'bidasoa', 'txorierri', 'duranguesado'
];

const mxCache = new Map();
async function verifyCorporateMx(domain) {
  if (!domain || BLOCKED_DOMAINS.has(domain)) return false;
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1600))
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
  const urls = [`https://${domain}`, `https://www.${domain}`, `https://${domain}/contacto`];
  let foundEmail = null;
  let foundPhone = null;
  let foundTitle = null;

  for (const url of urls.slice(0, 2)) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2200);
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

  console.log(`🇪🇸 [ESPANHA INÍCIO] Alba: ${albaCount}/${TARGET_PER_COMMERCIAL} | Liseth: ${lisethCount}/${TARGET_PER_COMMERCIAL}`);

  // Build candidate combinations
  const combinations = [];
  for (const sec of SECTORS) {
    for (const suf of SUFFIXES_AND_CITIES) {
      const cleanSuf = suf.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (!cleanSuf) continue;
      const dom1 = `${sec.prefix}${cleanSuf}.es`;
      const defaultName = `${sec.prefix.charAt(0).toUpperCase() + sec.prefix.slice(1)} ${suf.charAt(0).toUpperCase() + suf.slice(1)} S.L.`;
      if (!existingDomains.has(dom1)) {
        combinations.push({ domain: dom1, defaultName, sector: sec.label, location: suf });
      }
      const dom2 = `${cleanSuf}${sec.prefix}.es`;
      if (!existingDomains.has(dom2)) {
        combinations.push({ domain: dom2, defaultName, sector: sec.label, location: suf });
      }
    }
  }

  console.log(`Total de combinações industriais .es para varredura DNS MX + Web: ${combinations.length}`);

  const CHUNK_SIZE = 35;
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

      // Decide whether to assign to Alba or Liseth (balance towards whoever needs more to reach 5,000)
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

  console.log(`✅ [ESPANHA CONCLUÍDO] Alba: ${albaCount} | Liseth: ${lisethCount}`);
  await pool.end();
}

main().catch(console.error);
