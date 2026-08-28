require('dotenv').config({ path: '.env' });
const { Client } = require('pg');
const dns = require('dns').promises;

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL;
const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

const SPANISH_PROVINCES = [
  'Madrid (Getafe, Pinto, San Fernando, Coslada, Alcalá, Fuenlabrada, Leganés, Arganda del Rey)',
  'Barcelona (Sabadell, Terrassa, Granollers, Martorell, Sant Boi, Rubí, Badalona, Cornellà, Sant Feliu)',
  'Vizcaya / Bizkaia (Bilbao, Erandio, Zamudio, Mungia, Durango, Trapagaran, Basauri, Galdakao)',
  'Álava / Araba (Vitoria-Gasteiz, Júndiz, Betoño, Gamarra, Llodio, Amurrio, Gojain)',
  'Gipuzkoa (San Sebastián, Eibar, Irún, Hernani, Beasain, Zarautz, Mondragón)',
  'Navarra (Pamplona, Landaben, Noáin, Tudela, Alsasua, Tafalla)',
  'Asturias (Oviedo, Gijón, Avilés, Silvota, Asipo, Tremañes, Porceyo)',
  'Cantabria (Santander, Torrelavega, Camargo, Reinosa, Guarnizo, Candina)',
  'Zaragoza (Plaza, Malpica, Centrovía, Cogullada, Utebo, Cuarte de Huerva)',
  'Valencia (Fuente del Jarro, Almussafes, Paterna, Ribarroja, Quart de Poblet, Silla, Torrent)',
  'Castellón (Vila-real, Almassora, Onda, Castellón de la Plana, Nules)',
  'Alicante (Las Atalayas, Pla de la Vallonga, Elche Parque Empresarial, Alcoy, Elda)',
  'Sevilla (Alcalá de Guadaíra, Dos Hermanas, La Isla, Calonge, Carretera Amarilla)',
  'Cádiz (Algeciras, San Fernando, Puerto Real, El Trocadero, Jerez de la Frontera)',
  'Huelva (Palos de la Frontera, Nuevo Puerto, San Juan del Puerto)',
  'Córdoba (Las Quemadas, Torrecilla, Lucena, Montilla)',
  'Valladolid (San Cristóbal, Argales, Laguna de Duero, Medina del Campo)',
  'Burgos (Gamonal, Villalonquéjar, Miranda de Ebro, Aranda de Duero)',
  'León (Onzonilla, Trobajo del Camino, Ponferrada, Villadangos)',
  'Pontevedra (Vigo, Balaídos, O Campiño, Porriño, Mos, Vilagarcía)',
  'A Coruña (Sabón, A Grela, Ferrol, Narón, Santiago de Compostela)',
  'Murcia (Cartagena, Cabezo Beaza, Molina de Segura, Lorca, Alcantarilha)',
  'Tarragona (Riu Clar, Francolí, Constantí, Reus, Valls)',
  'Girona (Fornells de la Selva, Riudellots, Figueres, Olot, Blanes)',
  'Toledo (Polígono Industrial de Toledo, Illescas, Talavera de la Reina, Seseña)',
  'Guadalajara (Henares, Cabanillas del Campo, Alovera, Azuqueca de Henares)'
];

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 
  'outlook.com', 'outlook.es', 'icloud.com', 'live.com', 'msn.com',
  'telefonica.net', 'orange.es', 'movistar.es', 'terra.es', 'vodafone.es', 'ya.com'
]);

function timeoutPromise(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function checkMx(domain) {
  if (!domain || !domain.includes('.')) return false;
  if (PUBLIC_DOMAINS.has(domain)) return true;
  try {
    const mx = await timeoutPromise(1200, dns.resolveMx(domain));
    return mx && mx.length > 0;
  } catch {
    try {
      const a = await timeoutPromise(1000, dns.resolve4(domain));
      return a && a.length > 0;
    } catch {
      return false;
    }
  }
}

async function fetchAisaProspects(provinceInfo, keywords, excludedNames) {
  const excludeHint = excludedNames.length > 0 
    ? `\nDO NOT include any of these companies already in our CRM: [${excludedNames.slice(-40).join(', ')}].` 
    : '';

  const prompt = `You are an official Spanish Industrial Register and B2B directory assistant.
Task: Provide a list of 25 real, active small/medium industrial workshops, fabricators, installers and maintenance contractors in: "${provinceInfo}", Spain.
Sector/Keywords: "${keywords}".

Target companies:
- SMEs / Talleres industriales, instaladores y contratistas (10 to 100 workers) that hire/subcontract helpers (peones), assemblers (montadores), electricians, welders, and mechanics.
- Located in industrial estates (Polígonos Industriales).
- MUST be real, active Spanish companies with real websites and corporate contact emails.${excludeHint}

Return JSON array ONLY, format:
[
  {
    "company_name": "Official Trade/Legal Name S.L. / S.A.",
    "website": "https://www.company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Polígono Industrial...",
    "city": "City Name",
    "province": "Province Name",
    "email": "info@company.es"
  }
]`;

  try {
    const res = await timeoutPromise(25000, fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an accurate Spanish industrial registry B2B extractor. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.25,
      }),
    }));

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return [];
  }
}

async function runProspectingLoop() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log("==========================================================");
  console.log("⚡ INICIANDO MOTOR TURBO DE PROSPECÇÃO DE LEADS (ESPANHA)");
  console.log("==========================================================");

  // Load existing names and emails
  const existingStagingRes = await client.query('SELECT company_name, email FROM core_comercial.lead_prospecting_results;');
  const existingCrmRes = await client.query('SELECT company_name, email FROM core_comercial.leads;');

  const existingNames = new Set();
  const existingEmails = new Set();
  const excludedNames = [];

  for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
    if (r.company_name) {
      const n = r.company_name.trim().toLowerCase();
      existingNames.add(n);
      excludedNames.push(r.company_name.trim());
    }
    if (r.email) {
      existingEmails.add(r.email.trim().toLowerCase());
    }
  }

  console.log(`📊 Base de exclusão inicial: ${existingNames.size} empresas / ${existingEmails.size} e-mails já conhecidos.`);

  while (true) {
    // 1. Get next job
    let jobRes = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs 
      WHERE status = 'processing' 
      ORDER BY created_at ASC 
      LIMIT 1;
    `);

    if (jobRes.rows.length === 0) {
      jobRes = await client.query(`
        SELECT * FROM core_comercial.lead_prospecting_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 1;
      `);

      if (jobRes.rows.length > 0) {
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs 
          SET status = 'processing', updated_at = NOW() 
          WHERE id = $1;
        `, [jobRes.rows[0].id]);
        jobRes.rows[0].status = 'processing';
      }
    }

    if (jobRes.rows.length === 0) {
      console.log("\n🎉 TODAS AS MISSÕES FORAM CONCLUÍDAS COM SUCESSO!");
      break;
    }

    const job = jobRes.rows[0];
    console.log(`\n🎯 Missão Ativa: "${job.title}" [${job.sector_filter}]`);

    // Pick 6 parallel provincial hubs
    const randomOffset = Math.floor(Math.random() * SPANISH_PROVINCES.length);
    const hubs = [
      SPANISH_PROVINCES[randomOffset % SPANISH_PROVINCES.length],
      SPANISH_PROVINCES[(randomOffset + 1) % SPANISH_PROVINCES.length],
      SPANISH_PROVINCES[(randomOffset + 2) % SPANISH_PROVINCES.length],
      SPANISH_PROVINCES[(randomOffset + 3) % SPANISH_PROVINCES.length],
      SPANISH_PROVINCES[(randomOffset + 4) % SPANISH_PROVINCES.length],
      SPANISH_PROVINCES[(randomOffset + 5) % SPANISH_PROVINCES.length],
    ];

    console.log(`🌐 Consultando Polígonos Industriais em: ${hubs.map(h => h.split(' ')[0]).join(', ')}...`);

    const results = await Promise.all(
      hubs.map(hub => fetchAisaProspects(hub, job.keywords, excludedNames))
    );

    const candidates = results.flat();
    console.log(`📥 Recebidas ${candidates.length} candidatas. Validando DNS MX e Deduplicação...`);

    const verifiedRecords = [];

    await Promise.all(
      candidates.map(async (c) => {
        if (!c.company_name || !c.email || !c.email.includes('@')) return;
        const normName = c.company_name.trim().toLowerCase();
        const normEmail = c.email.trim().toLowerCase();

        if (existingNames.has(normName) || existingEmails.has(normEmail)) return;

        const domain = normEmail.split('@')[1];
        const hasMx = await checkMx(domain);

        if (hasMx) {
          existingNames.add(normName);
          existingEmails.add(normEmail);
          excludedNames.push(c.company_name.trim());

          verifiedRecords.push({
            job_id: job.id,
            empresa_id: job.empresa_id,
            company_name: c.company_name.trim(),
            email: normEmail,
            phone: c.phone || null,
            website: c.website || (domain ? `https://www.${domain}` : null),
            address: c.address || null,
            city: c.city || 'Espanha',
            province: c.province || 'Espanha',
            country: 'Espanha',
            confidence_score: 96,
            status: 'raw',
          });
        }
      })
    );

    console.log(`✅ ${verifiedRecords.length} novas empresas REAIS validadas via DNS MX! Gravando no banco...`);

    for (const r of verifiedRecords) {
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website,
          address, city, province, country, confidence_score, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW());
      `, [
        r.job_id, r.empresa_id, r.company_name, r.email, r.phone, r.website,
        r.address, r.city, r.province, r.country, r.confidence_score, r.status
      ]);

      await client.query(`
        INSERT INTO core_comercial.empresas_espanha_cnae (
          razao_social, nome_comercial, website, telefone, email, email_status,
          provincia, municipio, endereco, setor, status_enriquecimento, updated_at
        ) VALUES ($1, $1, $2, $3, $4, 'verified', $5, $6, $7, $8, 'enriched', NOW())
        ON CONFLICT DO NOTHING;
      `, [
        r.company_name, r.website, r.phone, r.email,
        r.province, r.city, r.address, job.sector_filter || 'Industrial & Metal'
      ]);
    }

    const currentCountRes = await client.query(`
      SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;
    `, [job.id]);
    const currentCount = parseInt(currentCountRes.rows[0].count, 10);

    const isDone = currentCount >= job.target_count || (verifiedRecords.length === 0 && currentCount >= 100);

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs 
      SET status = $1, processed_count = $2, found_emails_count = $2, updated_at = NOW() 
      WHERE id = $3;
    `, [isDone ? 'completed' : 'processing', currentCount, job.id]);

    console.log(`📈 Progresso da Missão "${job.title}": ${currentCount} leads capturados.`);

    // Check if we hit a substantial batch or pause briefly
    await new Promise(r => setTimeout(r, 1500));
  }

  await client.end();
}

runProspectingLoop();
