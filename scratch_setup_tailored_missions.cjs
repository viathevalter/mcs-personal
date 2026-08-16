const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const TAILORED_MISSIONS = [
  {
    title: '🏗️ 1. Talleres de Calderería, Soldadura y Mecanizado (Polígonos España)',
    sector_filter: 'Calderería, Soldadura & Mecanizado',
    keywords: 'Talleres de calderería, Soldadura TIG MIG Electrodo, Mecanizado CNC, Calderería pesada, Mecánicos industriales, Talleres de polígonos',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
  {
    title: '🔩 2. Tubería Industrial, Spooling y Montajes Mecánicos (Espanha)',
    sector_filter: 'Tubería Industrial & Montajes Mecánicos',
    keywords: 'Montajes de tubería industrial, Piping, Tuberos industriales, Mantenimiento de plantas industriales, Spooling y soldadura 6G',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
  {
    title: '⚙️ 3. Estructuras Metálicas, Naves Industriales y Cerrajería Pesada (Espanha)',
    sector_filter: 'Estructuras Metálicas & Cerrajería Industrial',
    keywords: 'Fabricación de estructuras metálicas, Montaje de naves industriales, Cerrajería industrial, Armadores de estructura, Puentes grúa',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
  {
    title: '⚡ 4. Electricidad, Electromecánica e Instrumentación Industrial (Espanha)',
    sector_filter: 'Electricidad Industrial & Electromecánica',
    keywords: 'Instalaciones eléctricas industriales, Cuadros eléctricos, Mantenimiento electromecánico, Instrumentistas, Automatización industrial',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
  {
    title: '❄️ 5. Aislamiento Térmico (Calorifugado), Frío Industrial y Climatización (Espanha)',
    sector_filter: 'Aislamiento Térmico & Frío Industrial',
    keywords: 'Aislamiento térmico industrial, Calorifugado y trazado, Frío industrial, Climatización industrial, Instalaciones de fluidos',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
  {
    title: '🚢 6. Talleres Navales, Auxiliares de Astilleros y Montajes Portuarios (Espanha)',
    sector_filter: 'Talleres Navales & Auxiliares de Astilleros',
    keywords: 'Talleres auxiliares de astilleros, Reparación naval, Calderería naval, Soldadores 6G navales, Mecánica marina, Trabajos portuarios',
    location: 'Espanha (Nacional)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
    status: 'pending',
  },
];

async function setupMissions(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`\n================ [${dbName}] Configuring Clean Tailored Missions Pipeline ================`);

  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  let empresaId = empRes.rows[0]?.empresa_id;

  if (!empresaId) {
    const leadsEmp = await client.query('SELECT empresa_id FROM core_comercial.leads WHERE empresa_id IS NOT NULL LIMIT 1;');
    empresaId = leadsEmp.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';
  }

  // Clear previous prospecting jobs cleanly (preserving staging/CRM leads)
  await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');

  console.log(`[${dbName}] Inserting 6 Tailored ICP Missions with Empresa ID: ${empresaId}`);

  for (let i = 0; i < TAILORED_MISSIONS.length; i++) {
    const m = TAILORED_MISSIONS[i];
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_jobs (
        empresa_id, title, sector_filter, keywords, location,
        target_count, processed_count, found_emails_count,
        search_source, email_required, delay_seconds, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, NOW() + INTERVAL '${i} seconds', NOW()
      );
    `, [
      empresaId, m.title, m.sector_filter, m.keywords, m.location,
      m.target_count, m.search_source, m.email_required, m.delay_seconds,
      'pending'
    ]);
    console.log(`[${dbName}] + Created mission: ${m.title}`);
  }

  console.log(`[${dbName}] All 6 Tailored Missions are configured in Queue!`);
  await client.end();
}

async function run() {
  await setupMissions('DEV', devConnectionString);
  await setupMissions('PROD', prodConnectionString);
}

run();
