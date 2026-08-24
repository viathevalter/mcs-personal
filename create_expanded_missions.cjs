require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ALL_OFFICIAL_MISSIONS = [
  { cnae: '3320', title: '🚰 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos', location: 'Espanha (Catalunha, Madrid, País Vasco, Valência)', keywords: 'Tubería industrial, montajes mecánicos, piping, soldadura TIG, plantas químicas, centrales térmicas' },
  { cnae: '2529', title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión', location: 'Espanha (Astúrias, Aragão, Catalunha, Andaluzia)', keywords: 'Calderería pesada, calderería media, tanques industriales, depósitos, recipientes a presión, autoclaves' },
  { cnae: '2511', title: '🏗️ 3. CNAE 2511 - Estructuras Metálicas & Cerrajería Pesada', location: 'Espanha (Zaragoza, Madrid, País Vasco, Galiza)', keywords: 'Estructuras metálicas, naves industriales, cerrajería pesada, puentes grúa, carpintería metálica' },
  { cnae: '2562', title: '⚙️ 4. CNAE 2562 - Mecanizado Industrial CNC & Tornería', location: 'Espanha (Guipúzcoa, Barcelona, Madrid, Álava)', keywords: 'Mecanizado CNC, tornos verticales, fresadoras, mandrinadoras, tornería pesada, matricería' },
  { cnae: '3011', title: '⚓ 5. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros', location: 'Espanha (Vigo, Ferrol, Cádiz, Cartagena, Astúrias)', keywords: 'Astilleros, construcción naval, reparación naval, tubería naval, calderería naval, varaderos' },
  { cnae: '2893', title: '🥛 6. CNAE 2893 - Tubería Inox, Industria Agroalimentaria & Bodegas', location: 'Espanha (La Rioja, Catalunha, Navarra, Castela)', keywords: 'Tubería inox alimentaria, depósitos inox, bodegas, almazaras, industria láctea, farmacéutica' },
  { cnae: '2825', title: '🔥 7. CNAE 2825 & 3311 - Intercambiadores de Calor, Calderas & Paradas de Planta', location: 'Espanha (Tarragona, Huelva, Puertollano, Algeciras)', keywords: 'Intercambiadores de calor, calderas industriales, serpentines, paradas de planta, petroquímica' },
  { cnae: '4299', title: '🌐 8. CNAE 4299 & 2420 - Redes de Tuberías Industriales, Gasoductos & Curvado', location: 'Espanha (Nacional, Gasoductos, Redes Térmicas)', keywords: 'Redes de tuberías industriales, oleoductos, gasoductos, redes de vapor, curvado y conformado de tubos' },
  { cnae: 'MEGA', title: '🏢 9. Mega-Parques Industriales - Júndiz, Landaben, PLAZA, PEPA & Porriño', location: 'Espanha (Parques Empresariales Estratégicos)', keywords: 'Parque Empresarial Júndiz, Landaben, PLAZA Zaragoza, PEPA Avilés, As Gándaras Porriño, Can Calderon' }
];

async function createAndActivateAllMissions() {
  console.log('==================================================================================');
  console.log('🚀 CRIANDO E ATIVANDO AS 9 MISSÕES ESTRATÉGICAS (TODAS EM EXECUÇÃO)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const empresaRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empresaRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const jobMap = {};

  for (const m of ALL_OFFICIAL_MISSIONS) {
    const existing = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs WHERE title = $1 LIMIT 1;', [m.title]);
    let jobId;
    if (existing.rows.length > 0) {
      jobId = existing.rows[0].id;
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs
        SET target_count = 2000, status = 'processing', updated_at = NOW()
        WHERE id = $1;
      `, [jobId]);
    } else {
      const ins = await client.query(`
        INSERT INTO core_comercial.lead_prospecting_jobs (
          empresa_id, title, keywords, location, target_count, processed_count, found_emails_count, status, search_source, email_required, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 2000, 0, 0, 'processing', 'google_maps', true, NOW(), NOW()
        ) RETURNING id;
      `, [empresaId, m.title, m.keywords, m.location]);
      jobId = ins.rows[0].id;
    }
    jobMap[m.cnae] = jobId;
  }

  // Rebalance leads to new missions if matching
  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%intercambiador%' OR company_name ILIKE '%caldera%' OR company_name ILIKE '%fricold%' OR company_name ILIKE '%rcb%' OR company_name ILIKE '%parada%' OR company_name ILIKE '%tecnivap%' OR company_name ILIKE '%attsu%';
  `, [jobMap['2825']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%curvado%' OR company_name ILIKE '%curvastur%' OR company_name ILIKE '%gasoducto%' OR company_name ILIKE '%oleoducto%' OR company_name ILIKE '%redes%' OR company_name ILIKE '%tubos%';
  `, [jobMap['4299']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE address ILIKE '%jundiz%' OR address ILIKE '%landaben%' OR address ILIKE '%plaza%' OR address ILIKE '%peba%' OR address ILIKE '%gandaras%' OR address ILIKE '%calderon%' OR address ILIKE '%somonte%';
  `, [jobMap['MEGA']]);

  // Update counts on all 9 jobs
  for (const cnae of Object.keys(jobMap)) {
    const jId = jobMap[cnae];
    const cRes = await client.query('SELECT count(*) as total, count(email) as emails FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [jId]);
    const emails = parseInt(cRes.rows[0].emails) || 0;
    const total = parseInt(cRes.rows[0].total) || 0;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET found_emails_count = $1, processed_count = $2, status = 'processing', target_count = 2000, updated_at = NOW()
      WHERE id = $3;
    `, [emails, total, jId]);
  }

  const jobs = await client.query('SELECT title, found_emails_count, target_count, status FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');
  console.log('=== 9 MISSÕES ESTRATÉGICAS ATIVAS NO SISTEMA ===');
  console.table(jobs.rows);

  await client.end();
}

createAndActivateAllMissions();
