const { Client } = require('pg');

const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const targetCitiesAndSectors = [
  // GALICIA & ASTURIAS (Naval & Calderería Heavy)
  { title: '🚢 Astilleros y Calderería Naval - Vigo y Ferrol (Galicia)', city: 'Vigo y Ferrol (Galicia)', keywords: 'Astilleros, Calderería naval, Reparación de buques, Tuberos navais, Soldadores 6G', sector: 'Construção & Reparação Naval' },
  { title: '🚢 Reparación de Buques y Tubería - Coruña y Narón (Galicia)', city: 'A Coruña y Narón (Galicia)', keywords: 'Tubería de alta presión, Calderería pesada, Estructuras navales, Soldadura homologada', sector: 'Construção & Reparação Naval' },
  { title: '🚢 Metalurgia Pesada y Calderería - Gijón y Avilés (Asturias)', city: 'Gijón y Avilés (Asturias)', keywords: 'Metalurgia pesada, Calderería industrial, Astilleros, Tubería industrial, Soldadura Raio-X', sector: 'Calderería & Tubería Industrial' },
  { title: '⚙️ Talleres Metalúrgicos - Santander y Torrelavega (Cantabria)', city: 'Santander y Torrelavega (Cantabria)', keywords: 'Talleres metalúrgicos, Fabricación de estructuras metálicas, Calderería, Montajes', sector: 'Estructuras Metálicas & Montajes' },

  // PAÍS VASCO & NAVARRA (Metalurgia, Calderería & Mecanizado)
  { title: '🏗️ Calderería Pesada y Fabricación Metálica - Bilbao y Barakaldo (Vizcaya)', city: 'Bilbao, Zamudio y Barakaldo (Vizcaya)', keywords: 'Calderería pesada, Fabricación metálica, Tubería industrial, Soldadura TIG MIG', sector: 'Calderería & Tubería Industrial' },
  { title: '⚙️ Mecanizado CNC y Estructuras - Eibar y Durango (Guipúzcoa)', city: 'Eibar, Durango y Zarautz (Guipúzcoa)', keywords: 'Mecanizado CNC, Fabricación de estructuras, Calderería, Montajes industriales', sector: 'Estructuras Metálicas & Montajes' },
  { title: '⚙️ Estructuras Metálicas - Vitoria e Jundiz (Álava)', city: 'Vitoria-Gasteiz y Polígono Jundiz (Álava)', keywords: 'Talleres metalúrgicos, Estructuras metálicas, Calderería industrial, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏭 Calderería e Montajes - Pamplona e Tudela (Navarra)', city: 'Pamplona, Landaben y Tudela (Navarra)', keywords: 'Polígono Industrial Landaben, Calderería, Soldadura TIG, Tubería, Paradas de planta', sector: 'Calderería & Tubería Industrial' },

  // CATALUÑA (Vallès, Baix Llobregat & Tarragona)
  { title: '⚙️ Calderería Industrial y Montajes - Vallès Occidental (Sabadell, Terrassa)', city: 'Sabadell, Terrassa y Rubí (Vallès Occidental)', keywords: 'Calderería industrial, Estructuras metálicas, Montajes de plantas, Soldadores TIG', sector: 'Estructuras Metálicas & Montajes' },
  { title: '⚙️ Talleres Metalúrgicos e Mecanizado - Vallès Oriental (Granollers)', city: 'Granollers y Mollet del Vallès (Vallès Oriental)', keywords: 'Talleres metalúrgicos, Mecanizado, Fabricación metálica, Calderería, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏢 Montajes Industriales e EPC - Baix Llobregat (Cornellà, El Prat)', city: 'Cornellà, El Prat y Sant Boi (Baix Llobregat)', keywords: 'Montajes industriales, Mantenimiento industrial, Subcontratación técnica, Calderería', sector: 'Ingeniería & Contratistas EPC' },
  { title: '🧪 Industria Química y Paradas de Planta - Tarragona', city: 'Tarragona, Reus y Vila-seca (Polígono Químico)', keywords: 'Industria química, Tubería de alta presión, Paradas de planta, Soldadores TIG 6G', sector: 'Industria Química & Petroquímica' },

  // MADRID & ARAGÓN
  { title: '⚙️ Calderería y Montajes - Cinturón Sur de Madrid (Getafe, Leganés, Fuenlabrada)', city: 'Getafe, Leganés y Fuenlabrada (Cinturón Sur Madrid)', keywords: 'Calderería industrial, Montajes industriales, Tubero industrial, Soldador TIG MIG', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏢 Ingeniería Industrial e Contratistas EPC - Madrid Este (Alcalá, Torrejón)', city: 'Alcalá de Henares y Torrejón (Madrid Este)', keywords: 'Ingeniería industrial, Contratistas EPC, Montajes, Subcontratación de personal técnico', sector: 'Ingeniería & Contratistas EPC' },
  { title: '🏭 Metalurgia y Montajes Industriales - Zaragoza y Plaza (Aragón)', city: 'Zaragoza, Polígono Plaza y Malpica (Aragón)', keywords: 'Metalurgia, Calderería, Estructuras metálicas, Montajes industriales, Soldadura', sector: 'Estructuras Metálicas & Montajes' },

  // VALENCIA & MURCIA
  { title: '⚙️ Estructuras Metálicas y Montajes - Valencia, Sagunto y Paterna', city: 'Valencia, Sagunto y Paterna (Comunidad Valenciana)', keywords: 'Estructuras metálicas, Calderería, Tuberos, Montajes de plantas, Soldadores', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🧪 Industria Química e Tubería - Castellón e Vila-real', city: 'Castellón de la Plana y Vila-real (Castellón)', keywords: 'Industria cerámica y química, Tubería industrial, Calderería, Paradas de planta', sector: 'Industria Química & Petroquímica' },
  { title: '🚢 Calderería Naval e Industrial - Cartagena e Murcia', city: 'Cartagena, Murcia y Lorca (Región de Murcia)', keywords: 'Calderería naval y química, Tubería de alta presión, Astilleros, Montajes', sector: 'Construção & Reparação Naval' },

  // ANDALUCÍA
  { title: '⚙️ Estructuras Metálicas e Aeronáutica - Sevilla y Dos Hermanas', city: 'Sevilla, Alcalá de Guadaíra y Dos Hermanas', keywords: 'Estructuras metálicas, Calderería, Montajes industriales, Aeronáutica, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🚢 Astilleros y Reparación Naval - Cádiz, Puerto Real y Algeciras', city: 'Cádiz, Puerto Real y Algeciras (Cádiz)', keywords: 'Astilleros, Reparación navale, Calderería naval, Soldadura naval, Tubería', sector: 'Construção & Reparação Naval' },
  { title: '🧪 Plantas Petroquímicas e Tubería - Huelva y Puertollano', city: 'Huelva y Puertollano (Sector Petroquímico)', keywords: 'Plantas petroquímicas, Tubería de alta presión, Paradas de planta, Soldadores TIG', sector: 'Industria Química & Petroquímica' }
];

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

async function searchSubregionAIsa(keywords, location, excludedListStr) {
  const excludeInstruction = excludedListStr
    ? `\nCRITICAL DEDUPLICATION RULE: DO NOT return any of the following company names: [${excludedListStr}]. Focus strictly on discovering NEW UNCAPTURED companies.`
    : '';

  const prompt = `Act as a real-time B2B data crawler for industrial companies in Spain.
Search for 15 REAL active companies in Spain matching core business activity: "${keywords}" strictly located within "${location}" (including its industrial parks and metropolitan belt).

CRITICAL MANDATORY RULES:
1. Return ONLY active Spanish companies that HAVE a verified corporate email address (gerencia@, compras@, comercial@, presupuestos@, info@).
2. DO NOT return any company if you cannot verify its corporate email.
3. Prioritize direct departmental emails (gerencia@, compras@, presupuestos@, tecnico@).
4. ONLY set "website" to a URL if the company HAS an active public website, else set to null.${excludeInstruction}

Return ONLY a valid JSON array:
[
  {
    "company_name": "Exact Legal or Trade Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 976 123 456" or null,
    "address": "Calle Example 123, Polígono Industrial" or null,
    "city": "${location}",
    "province": "${location}",
    "email": "gerencia@realcompany.es",
    "linkedin_url": null
  }
]`;

  try {
    const response = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a B2B business data assistant for industrial companies in Spain. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawResults = JSON.parse(cleanJsonStr);

    return rawResults.map(item => ({
      company_name: item.company_name,
      website: item.website || null,
      phone: item.phone || null,
      address: item.address || null,
      city: item.city || location,
      province: item.province || location,
      email: sanitizeEmail(item.email),
      linkedin_url: item.linkedin_url || null,
    }));
  } catch (err) {
    console.error('AIsa API Error:', err.message);
    return [];
  }
}

async function getOrCreateJob(client, empresaId, target) {
  const checkRes = await client.query(`
    SELECT id FROM core_comercial.lead_prospecting_jobs
    WHERE empresa_id = $1 AND title = $2;
  `, [empresaId, target.title]);

  if (checkRes.rows.length > 0) {
    return checkRes.rows[0].id;
  }

  const insRes = await client.query(`
    INSERT INTO core_comercial.lead_prospecting_jobs (
      empresa_id, title, keywords, location, target_count, processed_count, found_emails_count,
      delay_seconds, search_source, email_required, sector_filter, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 500, 0, 0, 2, 'web_broad', true, $5, 'processing', NOW(), NOW()
    ) RETURNING id;
  `, [empresaId, target.title, target.keywords, target.city, target.sector]);

  return insRes.rows[0].id;
}

async function runAutonomousWeekendMiner() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log('🚀 INICIANDO MINERADOR AUTÔNOMO DE 5.000 LEADS EM SEGUNDO PLANO...');

  try {
    const resEmpresa = await client.query(`SELECT id FROM core_common.empresas LIMIT 1;`);
    const empresaId = resEmpresa.rows[0].id;

    // Load all existing names & emails into memory
    const resExisting = await client.query(`
      SELECT LOWER(TRIM(company_name)) as name, LOWER(TRIM(email)) as email
      FROM core_comercial.lead_prospecting_results
      WHERE empresa_id = $1
      UNION
      SELECT LOWER(TRIM(company_name)) as name, LOWER(TRIM(email)) as email
      FROM core_comercial.leads
      WHERE empresa_id = $1;
    `, [empresaId]);

    const existingCompanySet = new Set(resExisting.rows.map(r => r.name).filter(Boolean));
    const existingEmailSet = new Set(resExisting.rows.map(r => r.email).filter(Boolean));

    console.log(`📊 Base atual em memória: ${existingCompanySet.size} empresas / ${existingEmailSet.size} e-mails.`);

    let totalNewCaptured = 0;

    for (let round = 1; round <= 3; round++) {
      console.log(`\n🔄 === INICIANDO RODADA DE VARREDURA #${round} NAS 21 ZONAS INDUSTRIAIS DA ESPANHA ===`);

      for (const target of targetCitiesAndSectors) {
        const jobId = await getOrCreateJob(client, empresaId, target);
        console.log(`\n📌 [Job ID: ${jobId}] Varrendo: "${target.keywords}" em ${target.city}...`);

        const excludedList = Array.from(existingCompanySet).slice(-30).join(', ');
        const scraped = await searchSubregionAIsa(target.keywords, target.city, excludedList);

        let insertedInBatch = 0;
        for (const item of scraped) {
          if (!item.company_name || !item.email) continue;
          const normName = item.company_name.trim().toLowerCase();
          const normEmail = item.email.trim().toLowerCase();

          if (existingCompanySet.has(normName) || existingEmailSet.has(normEmail)) continue;

          existingCompanySet.add(normName);
          existingEmailSet.add(normEmail);

          await client.query(`
            INSERT INTO core_comercial.lead_prospecting_results (
              job_id, empresa_id, company_name, email, phone, website, linkedin_url, address, city, province, country, confidence_score, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Espanha', 95, 'raw', NOW(), NOW()
            );
          `, [
            jobId,
            empresaId,
            item.company_name,
            item.email,
            item.phone,
            item.website,
            item.linkedin_url,
            item.address,
            item.city || target.city,
            item.province || target.city,
          ]);

          insertedInBatch++;
          totalNewCaptured++;
        }

        // Update job stats in core_comercial.lead_prospecting_jobs
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs
          SET 
            processed_count = (SELECT COUNT(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
            found_emails_count = (SELECT COUNT(email) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
            status = 'processing',
            updated_at = NOW()
          WHERE id = $1;
        `, [jobId]);

        console.log(`  ✅ [Sucesso Zona] +${insertedInBatch} novos e-mails qualificados. (Total acumulado sessão: +${totalNewCaptured})`);

        // Anti-rate limit delay 1.5s
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    console.log(`\n🎉 MINERADOR FINALIZADO COM SUCESSO! Total de novos e-mails salvos: +${totalNewCaptured}`);

  } catch (err) {
    console.error('Erro no minerador autônomo:', err);
  } finally {
    await client.end();
  }
}

runAutonomousWeekendMiner();
