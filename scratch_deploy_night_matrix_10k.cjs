const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const NIGHT_10K_MISSIONS = [
  {
    title: '🔧 1. Calderería Pesada, Depósitos, Silos y Tanques a Presión (España)',
    sector_filter: 'Calderería Pesada & Fabricación Metálica',
    keywords: 'Talleres de calderería pesada, Fabricación de tanques depósitos y silos, Caldereros soldadores TIG MIG electrodo, Calderas industriales, Intercambiadores de calor',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🏭 2. Montajes de Tubería Industrial, Spooling y Paradas de Planta (España)',
    sector_filter: 'Tubería Industrial & Montajes de Planta',
    keywords: 'Montajes de tubería industrial, Piping, Tuberos industriales, Mantenimiento y paradas de plantas industriales, Spooling, Soldadura 6G alta presión',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '⚙️ 3. Fabricación y Montaje de Estructuras Metálicas y Naves (España)',
    sector_filter: 'Estructuras Metálicas & Naves Industriales',
    keywords: 'Fabricación de estructuras metálicas pesadas, Montaje de naves industriales, Pórticos y vigas armadas, Cerrajeros industriales, Armadores de estructura',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🛢️ 4. Mantenimiento Mecánico y Piping en Química, Refinerías y Papel (España)',
    sector_filter: 'Industria Química, Petroquímica & Papelera',
    keywords: 'Mantenimiento industrial químico y petroquímico, Tubería de acero inoxidable y aleados, Soldadura TIG orbital, Paradas técnicas químicas, Montajes mecánicos',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '⚡ 5. Energías Renovables, Termosolares, Eólica y Centrales Térmicas (España)',
    sector_filter: 'Energía, Renovables & Plantas Térmicas',
    keywords: 'Construcción y montaje de plantas termosolares y biomasa, Fabricación de torres eólicas metálicas, Soldadores 6G energía, Montadores de plantas energéticas',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🍎 6. Industria Alimentaria, Láctea y Cerveceras - Tubería Inox / TIG Sanitário (España)',
    sector_filter: 'Industria Agroalimentaria & Tubería Inox',
    keywords: 'Instalaciones de tubería alimentaria en acero inoxidable, Soldadura TIG sanitaria, Mantenimiento de bodegas almazaras y plantas lácteas, Tanques isotérmicos inox',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🚜 7. Maquinaria Industrial, Bienes de Equipo y Mecanizado CNC (España)',
    sector_filter: 'Bienes de Equipo & Mecanizado Industrial',
    keywords: 'Fabricación de maquinaria y bienes de equipo industrial, Fresadores CNC y convencionales, Mecánicos montadores de maquinaria, Mantenimiento electromecánico',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🚗 8. Fabricación de Carrocerías, Remolques y Equipos de Transporte (España)',
    sector_filter: 'Carrocerías & Equipos de Transporte Pesado',
    keywords: 'Fabricación de semirremolques y carrocerías industriales, Caldereros soldadores MIG-MAG chasis, Fabricación ferroviaria y tolvas metálicas, Talleres de soldadura',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '❄️ 9. Frío Industrial, Aislamiento Térmico (Calorifugado) y Climatización (España)',
    sector_filter: 'Frío Industrial & Aislamiento Térmico',
    keywords: 'Instalaciones de frío industrial y amoniaco, Aislamiento térmico industrial y trazadores, Calorifugado de tuberías y depósitos, Climatización industrial HVAC',
    location: 'Espanha (Polígonos Industriales)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
  {
    title: '🚢 10. Talleres Navales, Auxiliares de Astilleros y Reparación Portuaria (España)',
    sector_filter: 'Construcción y Reparación Naval',
    keywords: 'Talleres auxiliares de reparación naval, Calderería naval, Soldadores 6G navales y homologados, Armadores de buques, Mecánica marina y portuaria',
    location: 'Espanha (Costas y Puertos)',
    target_count: 1000,
    search_source: 'google_maps',
    email_required: true,
    delay_seconds: 1,
  },
];

async function deployNightMissions(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`\n================ [${dbName}] Deploying 10,000 Leads Night Super-Matrix ================`);

  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  let empresaId = empRes.rows[0]?.empresa_id;

  if (!empresaId) {
    const leadsEmp = await client.query('SELECT empresa_id FROM core_comercial.leads WHERE empresa_id IS NOT NULL LIMIT 1;');
    empresaId = leadsEmp.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';
  }

  // Clear previous completed job definitions (preserving staging results and CRM leads intact)
  await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');

  for (let i = 0; i < NIGHT_10K_MISSIONS.length; i++) {
    const m = NIGHT_10K_MISSIONS[i];
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_jobs (
        empresa_id, title, sector_filter, keywords, location,
        target_count, processed_count, found_emails_count,
        search_source, email_required, delay_seconds, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, NOW() + INTERVAL '${i * 2} seconds', NOW()
      );
    `, [
      empresaId, m.title, m.sector_filter, m.keywords, m.location,
      m.target_count, m.search_source, m.email_required, m.delay_seconds,
      i === 0 ? 'processing' : 'pending'
    ]);
    console.log(`[${dbName}] + Created Mission #${i + 1}: ${m.title}`);
  }

  console.log(`[${dbName}] 10 Night Missions (10,000 Target) Deployed Successfully!`);
  await client.end();
}

async function run() {
  await deployNightMissions('DEV', devConnectionString);
  await deployNightMissions('PROD', prodConnectionString);
}

run();
