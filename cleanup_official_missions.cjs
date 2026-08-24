require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const CLEAN_OFFICIAL_MISSIONS = [
  { cnae: '3320', title: '🚰 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos', location: 'Espanha (Catalunha, Madrid, País Vasco, Valência)', keywords: 'Tubería industrial, montajes mecánicos, piping, soldadura TIG, plantas químicas, centrales térmicas' },
  { cnae: '2529', title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión', location: 'Espanha (Astúrias, Aragão, Catalunha, Andaluzia)', keywords: 'Calderería pesada, calderería media, tanques industriales, depósitos, recipientes a presión, autoclaves' },
  { cnae: '2511', title: '🏗️ 3. CNAE 2511 - Estructuras Metálicas & Cerrajería Pesada', location: 'Espanha (Zaragoza, Madrid, País Vasco, Galiza)', keywords: 'Estructuras metálicas, naves industriales, cerrajería pesada, puentes grúa, carpintería metálica' },
  { cnae: '2562', title: '⚙️ 4. CNAE 2562 - Mecanizado Industrial CNC & Tornería', location: 'Espanha (Guipúzcoa, Barcelona, Madrid, Álava)', keywords: 'Mecanizado CNC, tornos verticales, fresadoras, mandrinadoras, tornería pesada, matricería' },
  { cnae: '3011', title: '⚓ 5. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros', location: 'Espanha (Vigo, Ferrol, Cádiz, Cartagena, Astúrias)', keywords: 'Astilleros, construcción naval, reparación naval, tubería naval, calderería naval, varaderos' },
  { cnae: '2893', title: '🥛 6. CNAE 2893 - Tubería Inox, Industria Agroalimentaria & Bodegas', location: 'Espanha (La Rioja, Catalunha, Navarra, Castela)', keywords: 'Tubería inox alimentaria, depósitos inox, bodegas, almazaras, industria láctea, farmacéutica' }
];

async function cleanupAndEstablish6CleanMissions() {
  console.log('==================================================================================');
  console.log('🧹 LIMPEZA E PADRONIZAÇÃO DAS 6 MISSÕES OFICIAIS (CUSTO ZERO)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const empresaRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empresaRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const jobMap = {};

  for (const m of CLEAN_OFFICIAL_MISSIONS) {
    const existing = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs WHERE title = $1 LIMIT 1;', [m.title]);
    let jobId;
    if (existing.rows.length > 0) {
      jobId = existing.rows[0].id;
    } else {
      const ins = await client.query(`
        INSERT INTO core_comercial.lead_prospecting_jobs (
          empresa_id, title, keywords, location, target_count, processed_count, found_emails_count, status, search_source, email_required, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 1000, 0, 0, 'processing', 'google_maps', true, NOW(), NOW()
        ) RETURNING id;
      `, [empresaId, m.title, m.keywords, m.location]);
      jobId = ins.rows[0].id;
    }
    jobMap[m.cnae] = jobId;
  }

  // Re-link existing results to clean jobs based on title / sector matching
  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%piping%' OR company_name ILIKE '%tuberia%' OR company_name ILIKE '%ingalux%' OR company_name ILIKE '%tubister%' OR company_name ILIKE '%intehisa%';
  `, [jobMap['3320']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%caldereria%' OR company_name ILIKE '%dayma%' OR company_name ILIKE '%osona%' OR company_name ILIKE '%idesa%' OR company_name ILIKE '%calvera%' OR company_name ILIKE '%tmcomas%' OR company_name ILIKE '%duro felguera%' OR company_name ILIKE '%lointek%' OR company_name ILIKE '%ibaiondo%' OR company_name ILIKE '%rocal%';
  `, [jobMap['2529']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%estructura%' OR company_name ILIKE '%continente%' OR company_name ILIKE '%dizmar%' OR company_name ILIKE '%urssa%' OR company_name ILIKE '%imcasa%' OR company_name ILIKE '%candido%' OR company_name ILIKE '%metalicas%';
  `, [jobMap['2511']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%mecanizado%' OR company_name ILIKE '%mecanica%' OR company_name ILIKE '%torneria%' OR company_name ILIKE '%zayer%' OR company_name ILIKE '%mecavalles%';
  `, [jobMap['2562']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%naval%' OR company_name ILIKE '%astillero%' OR company_name ILIKE '%navantia%' OR company_name ILIKE '%vicalsa%' OR company_name ILIKE '%armada%' OR company_name ILIKE '%nodosa%' OR company_name ILIKE '%freire%' OR company_name ILIKE '%gondan%' OR company_name ILIKE '%armon%';
  `, [jobMap['3011']]);

  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE company_name ILIKE '%inox%' OR company_name ILIKE '%alvinox%' OR company_name ILIKE '%caldinox%' OR company_name ILIKE '%inoxpa%' OR company_name ILIKE '%herpa%' OR company_name ILIKE '%bodega%' OR company_name ILIKE '%agroalimentar%';
  `, [jobMap['2893']]);

  // Set remaining unlinked results to job 3320
  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET job_id = $1
    WHERE job_id NOT IN ($1, $2, $3, $4, $5, $6) OR job_id IS NULL;
  `, [jobMap['3320'], jobMap['2529'], jobMap['2511'], jobMap['2562'], jobMap['3011'], jobMap['2893']]);

  // Delete all old legacy duplicate jobs
  const cleanJobIds = Object.values(jobMap);
  await client.query(`
    DELETE FROM core_comercial.lead_prospecting_jobs
    WHERE id NOT IN (${cleanJobIds.map((_, i) => '$' + (i + 1)).join(',')});
  `, cleanJobIds);

  // Update counts on the 6 clean jobs
  for (const cnae of Object.keys(jobMap)) {
    const jId = jobMap[cnae];
    const cRes = await client.query('SELECT count(*) as total, count(email) as emails FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [jId]);
    const emails = parseInt(cRes.rows[0].emails) || 0;
    const total = parseInt(cRes.rows[0].total) || 0;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET found_emails_count = $1, processed_count = $2, status = 'processing', updated_at = NOW()
      WHERE id = $3;
    `, [emails, total, jId]);
  }

  const finalJobs = await client.query('SELECT id, title, found_emails_count, status FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');
  console.log('=== 6 MISSÕES OFICIAIS LIMPAS NO SISTEMA ===');
  console.table(finalJobs.rows);

  const totalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const totalCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');
  console.log(`\n📊 Staging Total: ${totalStaging.rows[0].count} | CRM Total: ${totalCrm.rows[0].count}`);

  await client.end();
}

cleanupAndEstablish6CleanMissions();
