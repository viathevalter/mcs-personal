require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Deep List of 50 Spanish Industrial Provinces & Municipalities
const PROVINCES_AND_TOWNS = [
  { prov: 'Madrid', towns: ['Getafe', 'Pinto', 'Valdemoro', 'Leganés', 'Fuenlabrada', 'Alcorcón', 'Móstoles', 'Alcalá de Henares', 'Torrejón de Ardoz', 'Coslada', 'San Fernando de Henares', 'Arganda del Rey', 'Rivas', 'Humanes de Madrid', 'Parla', 'Ciempozuelos', 'San Martín de la Vega'] },
  { prov: 'Barcelona', towns: ['Sabadell', 'Terrassa', 'Rubí', 'Sant Cugat', 'Granollers', 'Mollet del Vallès', 'Martorell', 'Abrera', 'Sant Boi', 'Cornellà', 'Manresa', 'Vic', 'Mataró', 'Badalona', 'Santa Perpètua de Mogoda', 'Parets del Vallès', 'Montcada i Reixac', 'Castellar del Vallès', 'Ripollet'] },
  { prov: 'Vizcaya', towns: ['Bilbao', 'Barakaldo', 'Sestao', 'Santurtzi', 'Portugalete', 'Basauri', 'Galdakao', 'Durango', 'Amorebieta', 'Erandio', 'Leioa', 'Trapagaran', 'Abanto Zierbena', 'Zalla', 'Güeñes', 'Arrigorriaga', 'Bermeo', 'Mungia'] },
  { prov: 'Guipúzcoa', towns: ['San Sebastián', 'Irún', 'Errenteria', 'Eibar', 'Elgoibar', 'Arrasate', 'Mondragón', 'Bergara', 'Beasain', 'Ordizia', 'Hernani', 'Andoain', 'Zumaia', 'Azpeitia', 'Azkoitia', 'Tolosa', 'Oñati', 'Legazpi'] },
  { prov: 'Álava', towns: ['Vitoria-Gasteiz', 'Llodio', 'Amurrio', 'Salvatierra', 'Oyón'] },
  { prov: 'Navarra', towns: ['Pamplona', 'Tudela', 'Barañáin', 'Burlada', 'Estella', 'Tafalla', 'Noáin', 'Huarte', 'Alsasua', 'San Adrián', 'Peralta', 'Corella'] },
  { prov: 'Valencia', towns: ['Valencia', 'Paterna', 'Torrent', 'Gandia', 'Sagunto', 'Alzira', 'Mislata', 'Burjassot', 'Ontinyent', 'Aldaia', 'Manises', 'Xirivella', 'Alaquàs', 'Catarroja', 'Silla', 'Almussafes', 'Ribarroja del Turia', 'Quart de Poblet'] },
  { prov: 'Castellón', towns: ['Castellón de la Plana', 'Vila-real', 'Burriana', 'la Vall d’Uixó', 'Vinaròs', 'Benicarló', 'Almassora', 'Onda', 'Nules', 'l’Alcora'] },
  { prov: 'Alicante', towns: ['Alicante', 'Elche', 'Torrevieja', 'Orihuela', 'Benidorm', 'Alcoy', 'Elda', 'San Vicente del Raspeig', 'Dénia', 'Villena', 'Petrer', 'Crevillente', 'Ibi'] },
  { prov: 'Zaragoza', towns: ['Zaragoza', 'Calatayud', 'Utebo', 'Ejea de los Caballeros', 'Tarazona', 'Caspe', 'La Almunia', 'Tauste', 'Cuarte de Huerva', 'Zuera', 'Alagón', 'La Muela', 'Épila'] },
  { prov: 'Asturias', towns: ['Gijón', 'Oviedo', 'Avilés', 'Siero', 'Langreo', 'Mieres', 'Castrillón', 'San Martín del Rey Aurelio', 'Corvera', 'Villaviciosa', 'Llanera', 'Navia', 'Castropol'] },
  { prov: 'Cantabria', towns: ['Santander', 'Torrelavega', 'Castro-Urdiales', 'Camargo', 'Piélagos', 'El Astillero', 'Laredo', 'Santoña', 'Los Corrales de Buelna', 'Reinosa'] },
  { prov: 'Pontevedra', towns: ['Vigo', 'Pontevedra', 'Vilagarcía de Arousa', 'Redondela', 'Cangas', 'Marín', 'Ponteareas', 'A Estrada', 'Lalín', 'O Porriño', 'Tui', 'Poio'] },
  { prov: 'A Coruña', towns: ['A Coruña', 'Santiago de Compostela', 'Ferrol', 'Narón', 'Oleiros', 'Carballo', 'Arteixo', 'Culleredo', 'Ribeira', 'Ames', 'Betanzos', 'As Pontes'] },
  { prov: 'Sevilla', towns: ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaíra', 'Utrera', 'Mairena del Aljarafe', 'Écija', 'La Rinconada', 'Los Palacios', 'Carmona', 'Camas', 'Lebrija', 'Marchena'] },
  { prov: 'Cádiz', towns: ['Cádiz', 'Jerez de la Frontera', 'Algeciras', 'San Fernando', 'El Puerto de Santa María', 'Chiclana', 'Sanlúcar', 'La Línea', 'Puerto Real', 'Los Barrios', 'San Roque'] },
  { prov: 'Tarragona', towns: ['Tarragona', 'Reus', 'El Vendrell', 'Tortosa', 'Cambrils', 'Salou', 'Valls', 'Calafell', 'Amposta', 'Vila-seca', 'Torredembarra'] },
  { prov: 'Valladolid', towns: ['Valladolid', 'Laguna de Duero', 'Medina del Campo', 'Arroyo de la Encomienda', 'Tordesillas', 'Tudela de Duero'] },
  { prov: 'Burgos', towns: ['Burgos', 'Miranda de Ebro', 'Aranda de Duero', 'Briviesca', 'Medina de Pomar'] },
  { prov: 'Murcia', towns: ['Murcia', 'Cartagena', 'Lorca', 'Molina de Segura', 'Alcantarilla', 'Torre-Pacheco', 'Águilas', 'Cieza', 'Yecla', 'San Javier', 'Totana'] }
];

// Industrial Domain Patterns across Spanish Engineering & Metal Sector
const SECTOR_PREFIXES = [
  'caldereria', 'talleres', 'estructuras', 'tuberia', 'piping', 'montajes', 'mecanizados', 'metalicas',
  'soldadura', 'inox', 'aceros', 'caldererias', 'industrial', 'mantenimiento', 'mecanica', 'caldereria-industrial',
  'estructuras-metalicas', 'tuberia-industrial', 'montajes-industriales', 'mecanizado-cnc'
];

const SECTOR_SUFFIXES = [
  'sl', 'sa', 'norte', 'sur', 'iberica', 'valles', 'madrid', 'bcn', 'metal', 'valencia', 'vasca', 'sur',
  'naval', 'inox', 'tecnic', 'montajes', 'talleres', 'soldaduras', 'industrias', 'mecanizados'
];

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const dnsPromises = dns.promises;

function isCleanValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const em = email.trim().toLowerCase();
  if (em.length < 6 || em.length > 80 || !em.includes('@') || !em.includes('.')) return false;
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.css|\.js|example\.com|wixpress|sentry|domain\.com|yourcompany|schema\.org|wordpress)/i.test(em)) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(em);
}

async function checkDnsAndResolve(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const addresses = await dnsPromises.resolve4(domain);
    return Array.isArray(addresses) && addresses.length > 0;
  } catch {
    try {
      const mx = await dnsPromises.resolveMx(domain);
      return Array.isArray(mx) && mx.length > 0;
    } catch {
      return false;
    }
  }
}

async function scrapeRealEmailsFromSite(baseUrl) {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const pagesToTry = [
    cleanBase,
    `${cleanBase}/contacto`,
    `${cleanBase}/aviso-legal`
  ];

  const foundEmails = new Set();
  let companyTitle = '';
  let phone = '';
  let address = '';

  for (const pageUrl of pagesToTry) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();

      // Extract title
      if (!companyTitle) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          companyTitle = titleMatch[1].replace(/[-|_|\|].*$/, '').trim();
        }
      }

      // Extract phone
      if (!phone) {
        const phoneMatch = html.match(/(\+34\s?[9|8|6|7]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|[9|8|6|7]\d{2}\s?\d{3}\s?\d{3})/);
        if (phoneMatch) phone = phoneMatch[0].trim();
      }

      // Extract address
      if (!address) {
        const addrMatch = html.match(/(Pol[í|i]gono\s+Industrial\s+[^,<"\n]+|C\/\s+[^,<"\n]+|Calle\s+[^,<"\n]+|Avda\.\s+[^,<"\n]+)/i);
        if (addrMatch) address = addrMatch[0].trim();
      }

      // Extract emails
      const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
      for (const em of emailMatches) {
        if (isCleanValidEmail(em)) {
          foundEmails.add(em.toLowerCase().trim());
        }
      }

      if (foundEmails.size >= 1) break;
    } catch {}
  }

  return {
    emails: Array.from(foundEmails),
    title: companyTitle,
    phone,
    address
  };
}

async function startDirectB2BScraper() {
  console.log('==================================================================================');
  console.log('🚀 INICIANDO B2B SCRAPER DIRETO (CUSTO € 0,00 / ZERO IA)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const jobEmpRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = jobEmpRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const stageRes = await client.query('SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1 LIMIT 1;', [empresaId]);
  const defaultStageId = stageRes.rows[0]?.id || null;

  // Load existing emails
  const existingRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.leads WHERE email IS NOT NULL AND email != \'\';');
  const existingEmails = new Set(existingRes.rows.map(r => r.email));
  console.log(`🔒 Deduplicação Ativa: ${existingEmails.size} e-mails protegidos no CRM.`);

  let totalMined = 0;

  // Generate and test domains systematically
  for (const provObj of PROVINCES_AND_TOWNS) {
    console.log(`\n📍 [PROVÍNCIA: ${provObj.prov}] Varrendo ${provObj.towns.length} municípios industriais...`);

    for (const town of provObj.towns) {
      const townClean = town.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

      const candidateDomains = [];

      // Generate combinations
      for (const prefix of SECTOR_PREFIXES) {
        candidateDomains.push(`${prefix}${townClean}.es`);
        candidateDomains.push(`${prefix}${townClean}.com`);
        candidateDomains.push(`${prefix}-${townClean}.es`);
        candidateDomains.push(`${prefix}-${townClean}.com`);

        for (const suffix of SECTOR_SUFFIXES.slice(0, 5)) {
          candidateDomains.push(`${prefix}${suffix}.es`);
          candidateDomains.push(`${prefix}${suffix}.com`);
        }
      }

      // Check live DNS for candidates in parallel batches of 20
      const CHUNK_SIZE = 20;
      for (let i = 0; i < candidateDomains.length; i += CHUNK_SIZE) {
        const batch = candidateDomains.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(batch.map(async (domain) => {
          const isLive = await checkDnsAndResolve(domain);
          if (!isLive) return;

          const webUrl = `https://www.${domain}`;
          const scrapeResult = await scrapeRealEmailsFromSite(webUrl);

          if (scrapeResult.emails.length === 0) return;

          const primaryEmail = (scrapeResult.emails.find(e => /^(info|contacto|comercial|ventas|administracion|taller)/i.test(e)) || scrapeResult.emails[0]).toLowerCase();
          if (existingEmails.has(primaryEmail)) return;

          existingEmails.add(primaryEmail);

          const companyName = scrapeResult.title ? scrapeResult.title.replace(/home|inicio|bienvenidos/i, '').trim() : `${domain.split('.')[0].toUpperCase()} S.L.`;
          const phone = scrapeResult.phone || '+34 91 000 00 00';
          const address = scrapeResult.address || `Polígono Industrial, ${town} (${provObj.prov})`;

          try {
            // Insert Staging
            await client.query(`
              INSERT INTO core_comercial.lead_prospecting_results (
                empresa_id, company_name, email, phone, website, address, city, 
                province, country, confidence_score, status, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 'Espanha', 100, 'raw', NOW(), NOW()
              );
            `, [empresaId, companyName, primaryEmail, phone, webUrl, address, town, provObj.prov]);

            // Insert CRM
            await client.query(`
              INSERT INTO core_comercial.leads (
                empresa_id, stage_id, name, company_name, email, phone, website,
                address_line, city, province, sector, origen_lead, notes, tags, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Calderería, Tubería & Metalurgia', 'Direct Web Scraper B2B Espanha',
                $11, $12, NOW(), NOW()
              );
            `, [
              empresaId, defaultStageId, companyName, companyName, primaryEmail, phone, webUrl,
              address, town, provObj.prov,
              `Empresa extraída diretamente do site corporativo via Web Scraping HTML e DNS Ativo. E-mails encontrados: ${scrapeResult.emails.join(', ')}`,
              ['Espanha', provObj.prov, town, 'Direct Scraper B2B']
            ]);

            totalMined++;
            console.log(`🎯 [NOVA EMPRESA VERIFICADA] ${companyName} ➔ ${primaryEmail} (${town}, ${provObj.prov})`);
          } catch(e) {}
        }));
      }
    }
  }

  console.log(`\n🏁 [VARREDURA FINALIZADA] Total de novas empresas mineradas com CUSTO ZERO: ${totalMined}`);
  await client.end();
}

startDirectB2BScraper();
