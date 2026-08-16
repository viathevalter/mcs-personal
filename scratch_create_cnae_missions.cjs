const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const CNAE_MISSIONS = [
  {
    title: '🚢 Astilleros y Construcción Naval (CNAE 3011/3315) - Espanha',
    sector_filter: 'Construção & Reparação Naval',
    keywords: 'Astilleros, Construcción naval, Reparación de buques, Calderería naval, Soldadores 6G, Armadores',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 2,
    status: 'pending',
  },
  {
    title: '🏗️ Calderería Pesada y Tubería Industrial (CNAE 2529/2530) - Espanha',
    sector_filter: 'Calderería & Tubería Industrial',
    keywords: 'Calderería pesada, Depósitos a presión, Tubería industrial, Soldadura TIG MIG, Montajes mecánicos',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 2,
    status: 'pending',
  },
  {
    title: '⚙️ Estructuras Metálicas y Talleres (CNAE 2511/2512) - Espanha',
    sector_filter: 'Estructuras Metálicas & Montajes',
    keywords: 'Fabricación de estructuras metálicas, Carpintería metálica industrial, Siderurgia, Naves industriales',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 2,
    status: 'pending',
  },
  {
    title: '🧪 Industria Química y Refinerías (CNAE 2011/1920) - Espanha',
    sector_filter: 'Industria Química & Petroquímica',
    keywords: 'Plantas químicas, Refinerías petroquímicas, Paradas de planta, Tubería de alta presión, Mantenimiento',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 2,
    status: 'pending',
  },
  {
    title: '📐 Ingeniería EPC y Montajes Industriais (CNAE 7112/3320) - Espanha',
    sector_filter: 'Ingeniería & Contratistas EPC',
    keywords: 'Contratistas EPC, Montajes industriales, Mantenimiento mecánico, Plantas industriales, Climatización',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 2,
    status: 'pending',
  },
];

async function setupMissions(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`\n================ [${dbName}] Configuring Clean CNAE Pipeline ================`);

  // Get active empresa_id
  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  let empresaId = empRes.rows[0]?.empresa_id;

  if (!empresaId) {
    const leadsEmp = await client.query('SELECT empresa_id FROM core_comercial.leads WHERE empresa_id IS NOT NULL LIMIT 1;');
    empresaId = leadsEmp.rows[0]?.empresa_id || 'dae64d51-2181-4510-b14f-e63d2f111a8e';
  }

  // Clear previous test jobs and staging results cleanly
  await client.query('DELETE FROM core_comercial.lead_prospecting_results;');
  await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');

  console.log(`[${dbName}] Inserting 5 Official CNAE Missions with Empresa ID: ${empresaId}`);

  for (let i = 0; i < CNAE_MISSIONS.length; i++) {
    const m = CNAE_MISSIONS[i];
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_jobs (
        empresa_id, title, sector_filter, keywords, location,
        target_count, processed_count, found_emails_count,
        search_source, email_required, delay_seconds, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, NOW(), NOW()
      );
    `, [
      empresaId, m.title, m.sector_filter, m.keywords, m.location,
      m.target_count, m.search_source, m.email_required, m.delay_seconds,
      m.status
    ]);
    console.log(`[${dbName}] + Created mission: ${m.title}`);
  }

  console.log(`[${dbName}] All 5 CNAE Missions are ready in Queue!`);
  await client.end();
}

async function run() {
  await setupMissions('DEV', devConnectionString);
  await setupMissions('PROD', prodConnectionString);
}

run();
