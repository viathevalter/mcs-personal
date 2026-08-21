const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const LOOKALIKE_MISSIONS = [
  {
    code: '3320',
    title: '🚰 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos (Perfil Ingalux / Vallès)',
    keywords: 'CNAE 3320 montaje de tubería industrial, líneas de vapor, piping industrial, montajes mecánicos, soldadura de tuberías',
    location: 'Espanha (Barcelona, Madrid, Valência, País Basco & Navarra)',
    target_count: 1000,
    sector_filter: 'Calderería & Tubería Industrial'
  },
  {
    code: '2529',
    title: '🔨 2. CNAE 2529 - Calderería Pesada, Tanques, Tolvas & Recipientes a Presión (Perfil Dayma / Osona)',
    keywords: 'CNAE 2529 fabricación de cisternas, grandes depósitos, tolvas, recipientes a presión, autoclaves, calderería pesada',
    location: 'Espanha (País Basco, Catalunha, Aragão, Astúrias & Galiza)',
    target_count: 1000,
    sector_filter: 'Calderería & Tubería Industrial'
  },
  {
    code: '2893',
    title: '🥛 3. CNAE 2893 - Tubería Inox, Bodegas, Industria Alimentaria & Farmacéutica (Perfil Alvinox / Caldinox)',
    keywords: 'CNAE 2893 tubería de acero inoxidable, depósitos inox para bodegas, piping alimentario, maquinaria láctea y farmacéutica',
    location: 'Espanha (Catalunha, La Rioja, Múrcia, Castela e Leão & Valência)',
    target_count: 1000,
    sector_filter: 'Química & Farmacêutica'
  },
  {
    code: '2511_2599',
    title: '🏗️ 4. CNAE 2511 & 2599 - Estructuras Metálicas Pesadas, Naves & Cerrajería (Perfil Continente / Dizmar)',
    keywords: 'CNAE 2511 fabricación de estructuras metálicas, calderería estructural, vigas de acero soldadas, cerrajería pesada',
    location: 'Espanha (Madrid, Sevilha, Valência, Aragão & Castela-La Mancha)',
    target_count: 1000,
    sector_filter: 'Estructuras Metálicas & Montajes'
  },
  {
    code: '4322_3311',
    title: '🔥 5. CNAE 4322 & 3311 - Mantenimiento de Paradas de Planta, Vapor & Climatización Industrial',
    keywords: 'CNAE 4322 mantenimiento industrial, paradas de planta, instalaciones de vapor, climatización industrial pesada, redes térmicas',
    location: 'Espanha (Tarragona, Huelva, Cádis, Cartagena & Astúrias)',
    target_count: 1000,
    sector_filter: 'Calderería & Tubería Industrial'
  },
  {
    code: '4299',
    title: '🌐 6. CNAE 4299 - Montaje de Redes de Tuberías Industriales, Plantas Energéticas & Gas',
    keywords: 'CNAE 4299 construcción de redes de tuberías, plantas de gas, plantas de hidrógeno, montajes de energía y cogeneración',
    location: 'Espanha (Madrid, Bilbao, Sevilha, Valência & Corunha)',
    target_count: 1000,
    sector_filter: 'Engenharia EPC & Obras'
  },
  {
    code: '2562',
    title: '⚙️ 7. CNAE 2562 - Mecanizado Industrial CNC, Tornería Pesada & Matricería (Perfil Gran Mecanizado)',
    keywords: 'CNAE 2562 mecanizado por control numérico CNC, tornos verticales, centros de mecanizado, fresado pesado',
    location: 'Espanha (País Basco, Catalunha, Aragão & Madrid)',
    target_count: 1000,
    sector_filter: 'Estructuras Metálicas & Montajes'
  },
  {
    code: '3011',
    title: '⚓ 8. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros y Varaderos (Perfil Tacman)',
    keywords: 'CNAE 3011 construcción naval, reparación de buques, calderería naval, astilleros, varaderos y calderería marítima',
    location: 'Espanha (Vigo, Ferrol, Cádis, Algeciras, Cartagena & Canárias)',
    target_count: 1000,
    sector_filter: 'Construção & Reparação Naval'
  }
];

async function setupLookalikeMissions() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🚀 CRIANDO E ATIVANDO MISSÕES LOOKALIKE (BASEADAS NOS 350 CLIENTES REAIS)');
    console.log('========================================================================\n');

    const jobEmpRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
    const empresaId = jobEmpRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

    for (const m of LOOKALIKE_MISSIONS) {
      const check = await client.query(`
        SELECT id FROM core_comercial.lead_prospecting_jobs 
        WHERE title ILIKE $1;
      `, [`%${m.code}%`]);

      if (check.rows.length > 0) {
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs
          SET title = $1, keywords = $2, location = $3, target_count = $4, sector_filter = $5,
              status = 'processing', email_required = true, updated_at = NOW()
          WHERE id = $6;
        `, [m.title, m.keywords, m.location, m.target_count, m.sector_filter, check.rows[0].id]);
        console.log(`🔄 [ATUALIZADA E ATIVA] ${m.title}`);
      } else {
        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_jobs (
            empresa_id, title, keywords, location, target_count, processed_count, 
            found_emails_count, status, search_source, email_required, sector_filter, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 0, 0, 'processing', 'google_maps', true, $6, NOW(), NOW()
          );
        `, [empresaId, m.title, m.keywords, m.location, m.target_count, m.sector_filter]);
        console.log(`✨ [NOVA CRIADA E ATIVA] ${m.title}`);
      }
    }

    console.log('\n========================================================================');
    console.log('🏁 TODAS AS 8 MISSÕES LOOKALIKE FORAM CONFIGURADAS COM SUCESSO!');
    console.log('========================================================================\n');

  } finally {
    await client.end();
  }
}

setupLookalikeMissions();
