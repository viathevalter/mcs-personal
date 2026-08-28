require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL;
const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

const MISSIONS = [
  {
    title: '⚡ 10. CNAE 4321 - Instalaciones Eléctricas Industriales, Cuadros & Automatización',
    keywords: 'Instalaciones eléctricas industriales, montaje de cuadros eléctricos, cableado industrial, bandejas portacables, automatización, subestaciones eléctricas, peón electricista',
    target_count: 2500,
    sector_filter: 'Instalaciones Eléctricas & Automatización'
  },
  {
    title: '🔧 11. CNAE 3314 / 3312 - Mantenimiento Mecánico, Electromecánicos & Líneas de Producción',
    keywords: 'Mantenimiento mecánico industrial, electromecánicos, montaje de maquinaria, líneas de envasado, motores industriales, bombas, reductores, ayudantes mecánicos',
    target_count: 2500,
    sector_filter: 'Mantenimiento & Electromecánica'
  },
  {
    title: '🛠️ 12. Talleres de Cerrajería Industrial, Carpintería Metálica & Transformación de Chapa',
    keywords: 'Cerrajería industrial pesada, carpintería metálica de acero, corte láser, plegado de chapa, soldadura cerrajería, remates, tolvas, ayudantes de taller',
    target_count: 2500,
    sector_filter: 'Cerrajería & Carpintería Metálica'
  },
  {
    title: '🏢 13. Montadores de Naves Industriales, Cubiertas Metálicas & Panel Sándwich',
    keywords: 'Montaje de naves industriales, cubiertas metálicas, panel sándwich, cerramientos industriales, estructuras prefabricadas de acero, peones de montaje',
    target_count: 2500,
    sector_filter: 'Montaje de Naves & Cubiertas'
  },
  {
    title: '❄️ 14. CNAE 4322 - Climatización Industrial, Ventilación Forzada, Conductos & Frío Industrial',
    keywords: 'Climatización industrial, conductos de chapa galvanizada, ventilación forzada de naves, frío industrial, torres de refrigeración, aislamiento térmico, ayudantes de climatización',
    target_count: 2500,
    sector_filter: 'Climatización & Ventilación Industrial'
  },
  {
    title: '🏭 15. Fabricantes de Silos, Tolvas, Cintas Transportadoras & Maquinaria Agrícola e Industrial',
    keywords: 'Fabricación de silos metálicos, tolvas de acero, cintas transportadoras, maquinaria agrícola pesada, prensas, calderería de manutención, ayudantes de montaje',
    target_count: 2500,
    sector_filter: 'Maquinaria & Silos Industriales'
  }
];

async function createMissions() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log("🚀 Criando as 6 Novas Missões Estratégicas de Prospecção na Máquina de Leads...");

  for (const m of MISSIONS) {
    const res = await client.query(`
      INSERT INTO core_comercial.lead_prospecting_jobs (
        empresa_id, title, keywords, location, target_count, processed_count, found_emails_count, 
        status, sector_filter, email_required, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Espanha', $4, 0, 0, 
        'pending', $5, true, NOW(), NOW()
      )
      RETURNING id, title;
    `, [empresaId, m.title, m.keywords, m.target_count, m.sector_filter]);

    console.log(`✅ Missão Criada: [${res.rows[0].id}] ${res.rows[0].title}`);
  }

  const allJobs = await client.query(`
    SELECT id, title, target_count, status, sector_filter 
    FROM core_comercial.lead_prospecting_jobs 
    WHERE status IN ('pending', 'processing')
    ORDER BY created_at DESC;
  `);

  console.log("\n📋 Missões Prontas para Execução:");
  console.table(allJobs.rows);

  await client.end();
}

createMissions();
