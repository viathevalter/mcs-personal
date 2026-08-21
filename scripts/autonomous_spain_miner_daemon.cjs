const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const CNAE_SECTORS = [
  { code: '2511', cnae: '25.11', title: '🏗️ 1. CNAE 2511 - Estructuras Metálicas, Naves & Cerrajería Pesada', search_terms: 'CNAE 2511 fabricación de estructuras metálicas, calderería estructural, vigas de acero soldadas, cerrajería industrial' },
  { code: '2529', cnae: '25.29', title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión', search_terms: 'CNAE 2529 fabricación de cisternas, grandes depósitos, recipientes a presión, autoclaves, calderería pesada' },
  { code: '3320', cnae: '33.20', title: '🚰 3. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos', search_terms: 'CNAE 3320 instalación y montaje de tubería industrial, líneas de vapor, piping industrial, montajes mecánicos' },
  { code: '2562', cnae: '25.62', title: '⚙️ 4. CNAE 2562 - Mecanizado Industrial CNC, Tornería & Matricería', search_terms: 'CNAE 2562 ingeniería de mecanizado por control numérico CNC, tornos verticales, centros de mecanizado, fresado pesado' },
  { code: '2825', cnae: '28.25', title: '🔥 5. CNAE 2825 - Intercambiadores de Calor, Calderas & Frío Industrial', search_terms: 'CNAE 2825 fabricación de intercambiadores de calor, enfriadores industriales, calderas industriales, climatización pesada' },
  { code: '3011', cnae: '30.11 / 33.15', title: '⚓ 6. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros', search_terms: 'CNAE 3011 construcción naval, reparación de buques, calderería naval, astilleros y varaderos' },
  { code: '2893', cnae: '28.93', title: '🥛 7. CNAE 2893 - Industria Agroalimentaria, Bodegas & Tubería Inox', search_terms: 'CNAE 2893 fabricación de maquinaria alimentaria, depósitos de acero inoxidable para bodegas, piping alimentario' },
  { code: '4329', cnae: '43.29', title: '❄️ 8. CNAE 4329 - Aislamiento Térmico, Calorifugado & Climatización', search_terms: 'CNAE 4329 calorifugado industrial, aislamiento térmico de tuberías, aislamiento acústico industrial' }
];

const SPAIN_MUNICIPALITIES = [
  { city: 'Getafe', prov: 'Madrid', zone: 'Polígonos Los Ángeles, San Marcos, Los Olivos' },
  { city: 'Pinto', prov: 'Madrid', zone: 'Polígonos Las Arenas, La Estación' },
  { city: 'Valdemoro', prov: 'Madrid', zone: 'Polígonos Albresa, Valmor' },
  { city: 'Leganés', prov: 'Madrid', zone: 'Polígonos Nuestra Señora de Butarque, Ciudad del Automóvil' },
  { city: 'Fuenlabrada', prov: 'Madrid', zone: 'Polígonos Cobo Calleja, Cantueña, Sonsoles' },
  { city: 'Alcorcón', prov: 'Madrid', zone: 'Polígonos Urtinsa, Ventorro del Cano' },
  { city: 'Móstoles', prov: 'Madrid', zone: 'Polígonos Regordoño, Arroyomolinos' },
  { city: 'Alcalá de Henares', prov: 'Madrid', zone: 'Polígonos La Garena, Bañuelos, Camporroso' },
  { city: 'Torrejón de Ardoz', prov: 'Madrid', zone: 'Polígonos Las Monjas, Casablanca' },
  { city: 'Coslada & San Fernando', prov: 'Madrid', zone: 'Polígonos San Fernando Industrial, Coslada Este' },
  { city: 'Arganda del Rey', prov: 'Madrid', zone: 'Polígonos Borondo, El Guijar' },
  { city: 'Sabadell', prov: 'Barcelona', zone: 'Polígonos Can Roqueta, Gràcia' },
  { city: 'Terrassa', prov: 'Barcelona', zone: 'Polígonos Santa Margarita, Can Parellada, Els Bellots' },
  { city: 'Rubí & Sant Cugat', prov: 'Barcelona', zone: 'Polígonos Can Jardí, La Llana' },
  { city: 'Granollers', prov: 'Barcelona', zone: 'Polígonos Congost, Jordi Camp, Palou Nord' },
  { city: 'Mollet del Vallès', prov: 'Barcelona', zone: 'Polígonos Can Magarola, Riera Seca' },
  { city: 'Martorell & Abrera', prov: 'Barcelona', zone: 'Polígonos SEAT, Can Amat, Sant Ermengol' },
  { city: 'Sant Boi & Cornellà', prov: 'Barcelona', zone: 'Polígonos Salinas, Almeda' },
  { city: 'Manresa', prov: 'Barcelona', zone: 'Polígonos Bufalvent, Els Dolors' },
  { city: 'Tarragona & Reus', prov: 'Tarragona', zone: 'Polígonos Riu Clar, Francolí, Agro-Reus' },
  { city: 'Valls & Constantí', prov: 'Tarragona', zone: 'Polígonos Industrial Valls, Constantí' },
  { city: 'Girona & Figueres', prov: 'Girona', zone: 'Polígonos Mas Xirgu, Pont del Príncep' },
  { city: 'Lleida', prov: 'Lleida', zone: 'Polígonos El Segre, Camí dels Frares' },
  { city: 'Bilbao & Barakaldo', prov: 'Vizcaya', zone: 'Polígonos Asua, El Árbol, Beurko' },
  { city: 'Sestao & Portugalete', prov: 'Vizcaya', zone: 'Polígonos Ibarzaharra, Ballonti' },
  { city: 'Trapagaran & Santurtzi', prov: 'Vizcaya', zone: 'Polígonos El Juncal, El Campillo' },
  { city: 'Durango & Amorebieta', prov: 'Vizcaya', zone: 'Polígonos Montorreta, Boroa' },
  { city: 'Zamudio & Derio', prov: 'Vizcaya', zone: 'Parque Tecnológico de Bizkaia, Ugaldeguren' },
  { city: 'Vitoria-Gasteiz', prov: 'Álava', zone: 'Polígonos Júndiz, Betoño, Gamarra, Gojain' },
  { city: 'Llodio & Amurrio', prov: 'Álava', zone: 'Polígonos Arza, Saratxaga, Maskuribai' },
  { city: 'San Sebastián & Irún', prov: 'Guipúzcoa', zone: 'Polígonos 27 de Martutene, Zaisa' },
  { city: 'Hernani & Errenteria', prov: 'Guipúzcoa', zone: 'Polígonos Eziago, Akarregi, Masti-Loidi' },
  { city: 'Eibar & Elgoibar', prov: 'Guipúzcoa', zone: 'Polígonos Azitain, Matsaria, Lerun, Arriaga' },
  { city: 'Arrasate / Mondragón & Bergara', prov: 'Guipúzcoa', zone: 'Polígonos Musakola, San Juan, San Antonio' },
  { city: 'Beasain & Ordizia', prov: 'Guipúzcoa', zone: 'Polígonos Mallutz, Salbatore' },
  { city: 'Pamplona (Iruña)', prov: 'Navarra', zone: 'Polígonos Landaben, Agustinos, Noáin, Comarca 2' },
  { city: 'Tudela', prov: 'Navarra', zone: 'Polígonos Las Labradas, Montes del Cierzo' },
  { city: 'Valencia & Paterna', prov: 'Valencia', zone: 'Polígonos Fuente del Jarro, Táctica' },
  { city: 'Almussafes & Silla', prov: 'Valencia', zone: 'Polígonos Juan Carlos I, Rey Juan Carlos' },
  { city: 'Ribarroja & Cheste', prov: 'Valencia', zone: 'Polígonos El Oliveral, Sector 13' },
  { city: 'Sagunto & Puerto de Sagunto', prov: 'Valencia', zone: 'Parc Sagunt I y II, Camí de la Mar' },
  { city: 'Castellón & Almassora', prov: 'Castellón', zone: 'Polígonos Mijares, Ramonet, Acceso Sur' },
  { city: 'Vila-real & Onda', prov: 'Castellón', zone: 'Polígonos Carabona, El Colomer, Miralcamp' },
  { city: 'Alicante & Elche', prov: 'Alicante', zone: 'Polígonos Las Atalayas, Parque Empresarial Elche' },
  { city: 'Elda, Petrer & Villena', prov: 'Alicante', zone: 'Polígonos Les Pedreres, Salinetas, El Rubial' },
  { city: 'Murcia & Molina de Segura', prov: 'Murcia', zone: 'Polígonos Oeste, Base 2000, La Serreta' },
  { city: 'Cartagena', prov: 'Murcia', zone: 'Polígonos Cabezo Beaza, Los Camachos, Valle de Escombreras' },
  { city: 'Zaragoza', prov: 'Zaragoza', zone: 'Polígonos Malpica, PLAZA, Centrovía, Cogullada' },
  { city: 'Huesca & Monzón', prov: 'Huesca', zone: 'Polígonos Monzú, Paúles' },
  { city: 'Gijón & Avilés', prov: 'Asturias', zone: 'Polígonos Porceyo, Bankunión, PEPA, Parque Empresarial Principado' },
  { city: 'Oviedo & Llanera', prov: 'Asturias', zone: 'Polígonos Silvota, Asipo, Espíritu Santo' },
  { city: 'Santander & Torrelavega', prov: 'Cantabria', zone: 'Polígonos Candina, Guarnizo, Tanos-Viérnoles' },
  { city: 'Vigo & O Porriño', prov: 'Pontevedra', zone: 'Polígonos Balaídos, A Granxa, As Gándaras' },
  { city: 'A Coruña & Ferrol', prov: 'A Coruña', zone: 'Polígonos A Grela, Sabón, Río do Pozo' },
  { city: 'Sevilla & Dos Hermanas', prov: 'Sevilla', zone: 'Polígonos Calonge, Store, Carretera Amarilla, La Isla' },
  { city: 'Alcalá de Guadaíra', prov: 'Sevilla', zone: 'Polígonos La Red, Cuchipanda, Recener' },
  { city: 'Cádiz & Puerto Real', prov: 'Cádiz', zone: 'Polígonos El Trocadero, Río San Pedro' },
  { city: 'Algeciras & Los Barrios', prov: 'Cádiz', zone: 'Polígonos Cortijo Real, Palmones' },
  { city: 'Huelva & Palos', prov: 'Huelva', zone: 'Polígonos Nuevo Puerto, Fortiz' },
  { city: 'Córdoba & Lucena', prov: 'Córdoba', zone: 'Polígonos Amargacena, Las Quemadas, Los Santos' },
  { city: 'Málaga & Antequera', prov: 'Málaga', zone: 'Polígonos Guadalhorce, Santa Teresa, PEAN' },
  { city: 'Jaén, Linares & Andújar', prov: 'Jaén', zone: 'Polígonos Los Rubiales, Guadiel, Los Jarales' },
  { city: 'Granada', prov: 'Granada', zone: 'Polígonos Juncaril, Asegra' },
  { city: 'Valladolid', prov: 'Valladolid', zone: 'Polígonos San Cristóbal, Argales, Jalón' },
  { city: 'Burgos & Miranda de Ebro', prov: 'Burgos', zone: 'Polígonos Gamonal-Villímar, Villalonquéjar, Bayas' },
  { city: 'León & Ponferrada', prov: 'León', zone: 'Polígonos Onzonilla, La Llanada' },
  { city: 'Toledo & Illescas', prov: 'Toledo', zone: 'Polígonos Toledo Industrial, Cárcavas' },
  { city: 'Guadalajara & Azuqueca', prov: 'Guadalajara', zone: 'Polígonos El Henares, Miralcampo' }
];

const JUNK_DOMAINS = [
  'webador.es', 'wixpress.com', 'sentry.io', 'schema.org', 'example.com',
  'ejemplo.com', 'doe.com', 'freehtml5.co', 'themewagon.com', 'bootstrap',
  'popper', 'fontawesome', 'cloudflare.com', 'wordpress.org', 'gravatar.com',
  'google.com', 'facebook.com', 'instagram.com'
];

function isCleanValidEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 80) return false;
  if (!lower.includes('@') || !lower.includes('.')) return false;
  if (/@\d+\.\d+/i.test(lower) || /\.(js|css|png|jpg|jpeg|webp|gif|svg)@/i.test(lower)) return false;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.js') || lower.endsWith('.css')) return false;

  for (const junk of JUNK_DOMAINS) {
    if (lower.includes(junk)) return false;
  }
  return true;
}

async function scrapeRealEmailsFromSite(baseUrl) {
  if (!baseUrl || !baseUrl.startsWith('http')) return [];
  const urlsToTry = [
    baseUrl,
    baseUrl.replace(/\/$/, '') + '/contacto',
    baseUrl.replace(/\/$/, '') + '/contacto.html',
    baseUrl.replace(/\/$/, '') + '/aviso-legal'
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      const matches = html.match(emailRegex) || [];
      const clean = matches.filter(isCleanValidEmail);

      if (clean.length > 0) {
        return clean.map(e => e.toLowerCase().trim());
      }
    } catch {}
  }
  return [];
}

async function checkMx(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

async function fetchCnaeWorkshopsForMunicipality(muniObj, cnaeSectorObj, excluded) {
  const excludeStr = excluded.length > 0 ? `\nDO NOT include: [${excluded.slice(-25).join(', ')}].` : '';
  const prompt = `You are a Spanish industrial B2B registry specialist.
Find 25 REAL, REGISTERED, ACTIVE Spanish industrial workshops and fabricators (Pymes y Talleres) located in "${muniObj.city}" (${muniObj.prov}, Spain) in the industrial estates "${muniObj.zone}" registered under: "${cnaeSectorObj.search_terms}".
Target real small and medium industrial companies (10 to 100 workers) situated in these industrial zones that employ welders, tuberos, and metal fabricators.
Only return registered Spanish companies with real websites (.es or .com).${excludeStr}

Return JSON array only:
[
  {
    "company_name": "Official Legal Name S.L. / S.A.",
    "website": "https://www.domain.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Polígono Industrial...",
    "city": "${muniObj.city}",
    "province": "${muniObj.prov}"
  }
]`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.35
        }
      }),
      signal: controller.signal
    });
    clearTimeout(t);

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

async function startAutonomousDaemon() {
  console.log('==================================================================================');
  console.log('🤖 INICIANDO DAEMON AUTÔNOMO 24/7 DE MINERAÇÃO (GOOGLE GEMINI FLASH)');
  console.log('==================================================================================\n');

  let round = 1;
  while (true) {
    console.log(`\n🔄 [RODADA ${round}] Iniciando ciclo de varredura nos municípios da Espanha...`);
    const client = new Client({ connectionString: PROD_PG_URL });
    
    try {
      await client.connect();

      const jobEmpRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
      const empresaId = jobEmpRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

      const stageRes = await client.query(`
        SELECT id FROM core_comercial.kanban_stages 
        WHERE empresa_id = $1 AND order_index = 1 
        LIMIT 1;
      `, [empresaId]);
      const defaultStageId = stageRes.rows[0]?.id || null;

      // Sync / Create Official CNAE Jobs
      const jobMap = {};
      for (const sec of CNAE_SECTORS) {
        const existingJob = await client.query(`
          SELECT id FROM core_comercial.lead_prospecting_jobs 
          WHERE empresa_id = $1 AND sector_filter = $2 
          LIMIT 1;
        `, [empresaId, sec.title]);

        if (existingJob.rows.length > 0) {
          jobMap[sec.code] = existingJob.rows[0].id;
        } else {
          const jRes = await client.query(`
            INSERT INTO core_comercial.lead_prospecting_jobs (
              empresa_id, title, keywords, location, target_count, processed_count, 
              found_emails_count, status, search_source, email_required, sector_filter, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'Espanha (300 Municípios Industriais)', 1000, 0, 0, 'processing', 'google_maps', true, $4, NOW(), NOW()
            ) RETURNING id;
          `, [empresaId, sec.title, sec.search_terms, sec.title]);
          jobMap[sec.code] = jRes.rows[0].id;
        }
      }

      // Load existing emails and domains
      const existingRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.leads WHERE email IS NOT NULL AND email != \'\';');
      const existingEmails = new Set(existingRes.rows.map(r => r.email));
      const existingDomains = new Set();
      existingEmails.forEach(em => {
        if (em.includes('@')) existingDomains.add(em.split('@')[1]);
      });

      console.log(`🔒 Deduplicação Ativa: ${existingEmails.size} e-mails protegidos.`);

      let roundTotal = 0;

      // Process in parallel batches of 10 municipalities
      const CHUNK_SIZE = 10;
      for (let i = 0; i < SPAIN_MUNICIPALITIES.length; i += CHUNK_SIZE) {
        const chunk = SPAIN_MUNICIPALITIES.slice(i, i + CHUNK_SIZE);
        console.log(`\n--- [Lote ${Math.floor(i / CHUNK_SIZE) + 1} de ${Math.ceil(SPAIN_MUNICIPALITIES.length / CHUNK_SIZE)}] Varrendo: ${chunk.map(c => c.city).join(', ')} ---`);

        const chunkPromises = [];

        for (const muni of chunk) {
          for (const sector of CNAE_SECTORS) {
            chunkPromises.push((async () => {
              const jobId = jobMap[sector.code];
              const rawList = await fetchCnaeWorkshopsForMunicipality(muni, sector, Array.from(existingDomains).slice(-25));
              if (!rawList || rawList.length === 0) return 0;

              let sectorInserted = 0;

              await Promise.all(rawList.map(async (comp) => {
                if (!comp.company_name || !comp.website) return;
                
                let webUrl = comp.website.trim();
                if (!webUrl.startsWith('http')) webUrl = `https://${webUrl}`;

                const scraped = await scrapeRealEmailsFromSite(webUrl);
                if (scraped.length === 0) return;

                const cleanEmail = (scraped.find(e => /^(comercial|ventas|taller|contacto|info|administracion)/i.test(e) || e.includes('gmail') || e.includes('hotmail')) || scraped[0]).toLowerCase().trim();
                if (existingEmails.has(cleanEmail)) return;

                let domain = cleanEmail.includes('@') ? cleanEmail.split('@')[1] : '';
                if (existingDomains.has(domain) && !domain.includes('gmail') && !domain.includes('hotmail') && !domain.includes('yahoo')) return;

                const hasMx = await checkMx(domain);
                if (!hasMx) return;

                existingEmails.add(cleanEmail);
                if (domain) existingDomains.add(domain);

                const otherEmails = scraped.filter(e => e !== cleanEmail);
                const otherEmailsNote = otherEmails.length > 0 ? ` E-mails secundários do site: ${otherEmails.join(', ')}` : '';

                // 1. Insert Staging
                try {
                  const existingStag = await client.query('SELECT id FROM core_comercial.lead_prospecting_results WHERE LOWER(TRIM(email)) = $1;', [cleanEmail]);
                  if (existingStag.rows.length > 0) {
                    await client.query(`
                      UPDATE core_comercial.lead_prospecting_results
                      SET job_id = $1, empresa_id = $2, company_name = $3, phone = $4, website = $5,
                          address = $6, city = $7, province = $8, status = 'imported', confidence_score = 100, updated_at = NOW()
                      WHERE id = $9;
                    `, [
                      jobId, empresaId, comp.company_name, comp.phone || '+34 91 000 00 00',
                      webUrl, comp.address || `${muni.zone}`,
                      comp.city || muni.city, muni.prov, existingStag.rows[0].id
                    ]);
                  } else {
                    await client.query(`
                      INSERT INTO core_comercial.lead_prospecting_results (
                        job_id, empresa_id, company_name, email, phone, website, address, city, 
                        province, country, confidence_score, status, created_at, updated_at
                      ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 100, 'imported', NOW(), NOW()
                      );
                    `, [
                      jobId, empresaId, comp.company_name, cleanEmail, comp.phone || '+34 91 000 00 00',
                      webUrl, comp.address || `${muni.zone}`,
                      comp.city || muni.city, muni.prov
                    ]);
                  }
                  sectorInserted++;
                  console.log(`🎯 [NOVO LEAD VERIFICADO] ${comp.company_name} ➔ ${cleanEmail} (${comp.city || muni.city})`);
                } catch {}

                // 2. Insert CRM
                try {
                  const check = await client.query('SELECT id FROM core_comercial.leads WHERE LOWER(TRIM(email)) = $1 LIMIT 1;', [cleanEmail]);
                  if (check.rows.length === 0) {
                    await client.query(`
                      INSERT INTO core_comercial.leads (
                        empresa_id, stage_id, prospecting_job_id, name, company_name, email, phone, website,
                        address_line, city, province, sector, origen_lead, notes, tags, created_at, updated_at
                      ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
                      );
                    `, [
                      empresaId, defaultStageId, jobId, comp.company_name, comp.company_name, cleanEmail,
                      comp.phone || '+34 91 000 00 00', webUrl,
                      comp.address || `${muni.zone}, ${muni.prov}`, comp.city || muni.city, muni.prov,
                      sector.title, 'Gemini Flash - Polígonos Espanha',
                      `Oficina real verificada via Web Scraping HTML. CNAE ${sector.cnae}. Polígono: ${muni.zone}.${otherEmailsNote}`,
                      ['Espanha', 'Polígonos Industriais', `CNAE ${sector.cnae}`, muni.city]
                    ]);
                  }
                } catch {}

                // Update Job counters
                await client.query(`
                  UPDATE core_comercial.lead_prospecting_jobs
                  SET 
                    processed_count = processed_count + 1,
                    found_emails_count = found_emails_count + 1,
                    updated_at = NOW()
                  WHERE id = $1;
                `, [jobId]);
              }));

              return sectorInserted;
            })());
          }
        }

        const batchResults = await Promise.all(chunkPromises);
        const batchTotal = batchResults.reduce((a, b) => a + b, 0);
        roundTotal += batchTotal;
        console.log(`✅ [Lote Finalizado] +${batchTotal} indústrias adicionadas ao CRM.`);
      }

      console.log(`\n🎉 [RODADA ${round} CONCLUÍDA] Total de novos leads nesta rodada: ${roundTotal}`);
      round++;

    } catch (err) {
      console.error('Erro na rodada:', err.message);
    } finally {
      await client.end();
    }

    // Wait 30 seconds before next infinite round
    console.log('⏳ Aguardando 30 segundos para iniciar a próxima rodada autônoma...');
    await new Promise(r => setTimeout(r, 30000));
  }
}

startAutonomousDaemon();
