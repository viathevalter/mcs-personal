const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const MISSIONS_TO_CREATE = [
  // 1. CATALUÑA
  {
    title: 'Calderería y Estructuras Metálicas - Polígonos del Vallès (Web Broad)',
    keywords: 'Calderería industrial, Fabricación de estructuras metálicas, Mecanizado, Tuberia industrial, Soldadura homologada',
    location: 'Sabadell, Terrassa, Granollers, Rubí, Barberà del Vallès, Sant Cugat (Barcelona)',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Calderería y Metalurgia - Vallès (LinkedIn B2B)',
    keywords: 'Calderería industrial, Talleres metalúrgicos, Subcontratación de personal técnico, Soldadores, Tuberos',
    location: 'Sabadell, Terrassa, Granollers, Rubí, Barberà del Vallès, Sant Cugat (Barcelona)',
    target_count: 500,
    search_source: 'linkedin',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Talleres Metalúrgicos y Mecanizado - Vallès (Google Maps)',
    keywords: 'Talleres metalúrgicos, Mecanizado CNC, Fabricación metálica, Soldadura TIG MIG',
    location: 'Sabadell, Terrassa, Granollers, Rubí, Barberà del Vallès, Sant Cugat (Barcelona)',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Montajes Industriales y Calderería - Baix Llobregat & Badalona (Web Broad)',
    keywords: 'Montajes industriales, Calderería industrial, Tubero industrial, Soldador TIG MIG, Mantenimiento industrial',
    location: 'Martorell, Cornellà, Sant Boi, Badalona, Hospitalet, Viladecans (Barcelona)',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Ingeniería y Contratistas EPC - Cataluña (LinkedIn B2B)',
    keywords: 'Empresas de ingeniería industrial, Contratistas EPC, Montajes industriales, Subcontratación de personal técnico',
    location: 'Provincia de Barcelona y Área Metropolitana',
    target_count: 500,
    search_source: 'linkedin',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 2. PAÍS VASCO
  {
    title: 'Calderería Pesada y Fabricación Metálica - Euskadi (Web Broad)',
    keywords: 'Calderería pesada, Talleres metalúrgicos, Fabricación metálica, Tuberia industrial, Soldadura Raio-X',
    location: 'Bilbao, Zamudio, Durango, Eibar, Erandio, Barakaldo (Vizcaya)',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Talleres Metalúrgicos y Estructuras - País Vasco (LinkedIn B2B)',
    keywords: 'Talleres metalúrgicos, Fabricación de estructuras metálicas, Calderería, Mecanizado CNC, Soldadores TIG',
    location: 'Vitoria-Gasteiz, San Sebastián, Irun, Eibar, Durango, Bilbao',
    target_count: 500,
    search_source: 'linkedin',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Polígonos Industriales de Vitoria y Bilbao (Google Maps)',
    keywords: 'Polígono Industrial Jundiz, Ali-Gobeo, Gojain, Zamudio, Calderería, Montajes industriales',
    location: 'Vitoria-Gasteiz, Bilbao, Zamudio, Álava y Vizcaya',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 3. NAVARRA & LA RIOJA
  {
    title: 'Calderería y Mantenimiento Industrial - Navarra (Web Broad)',
    keywords: 'Calderería industrial, Talleres metalúrgicos, Fabricación de estructuras metálicas, Tuberia, Mantenimiento industrial',
    location: 'Navarra y Área Metropolitana (Pamplona, Landaben, Tudela, Estella, Sakana)',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Polígonos de Landaben, Agustinos y Tudela (Google Maps)',
    keywords: 'Polígono Industrial Landaben, Agustinos, Tudela, Calderería, Soldadura, Tuberia',
    location: 'Pamplona, Landaben, Tudela, Sakana, Navarra',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 4. TARRAGONA & CASTELLÓN (QUÍMICO & PARADAS DE PLANTA)
  {
    title: 'Sector Químico y Paradas de Planta - Tarragona (Web Broad)',
    keywords: 'Industria química, Mantenimiento de plantas químicas, Tuberia de alta presión, Paradas de planta, Soldadores TIG',
    location: 'Tarragona (Polígono Químico), Reus, Vila-seca, Castellón de la Plana',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Industria Petroquímica y Tubería - Tarragona y Castellón (Google Maps)',
    keywords: 'Plantas petroquímicas, Montajes industriales, Tuberos de alta presión, Mantenimiento de tanques y tuberia',
    location: 'Tarragona, Reus, Castellón de la Plana',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 5. GALICIA (NAVAL & METAL)
  {
    title: 'Sector Naval y Calderería Heavy - Galicia (Web Broad)',
    keywords: 'Industria naval, Astilleros, Calderería naval, Soldador TIG 6G, Tubero naval, Estructuras metálicas pesadas',
    location: 'Vigo, Ferrol, A Coruña, Porriño, Narón (Galicia)',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Calderería Naval y Tuberos - Vigo y Ferrol (LinkedIn B2B)',
    keywords: 'Construcción naval, Reparación naval, Tuberos navais, Soldadores homologados, Astilleros',
    location: 'Vigo, Ferrol, A Coruña, Galicia',
    target_count: 500,
    search_source: 'linkedin',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 6. MADRID & CINTURÓN INDUSTRIAL
  {
    title: 'Ingeniería Industrial y Contratistas EPC - Madrid (Web Broad)',
    keywords: 'Empresas de ingeniería industrial, Contratistas EPC, Montajes industriales, Mantenimiento industrial y Subcontratación',
    location: 'Madrid, Getafe, Leganés, Fuenlabrada, Alcalá de Henares, Móstoles, Alcobendas',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Calderería y Montajes - Cinturón Industrial Madrid (Google Maps)',
    keywords: 'Calderería industrial, Talleres metalúrgicos, Fabricación de estructuras metálicas, Mecanizado, Soldadura',
    location: 'Getafe, Leganés, Fuenlabrada, Alcalá de Henares, Móstoles, Madrid',
    target_count: 500,
    search_source: 'google_maps',
    email_required: true,
    sector_filter: 'industrial'
  },

  // 7. ANDALUCÍA & VALENCIA
  {
    title: 'Sector Naval y Astilleros - Cádiz y Huelva (Web Broad)',
    keywords: 'Astilleros, Calderería naval, Tuberia de alta presión, Mantenimiento industrial, Soldadura naval',
    location: 'Cádiz, Puerto Real, San Fernando, Algeciras, Huelva',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  },
  {
    title: 'Estructuras Metálicas y Montajes - Valencia y Sagunto (Web Broad)',
    keywords: 'Estructuras metálicas, Calderería industrial, Talleres metalúrgicos, Montajes industriales, Tuberos',
    location: 'Valencia, Sagunto, Paterna, Alzira, Alicante',
    target_count: 500,
    search_source: 'web_broad',
    email_required: true,
    sector_filter: 'industrial'
  }
];

async function setupMissions(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    console.log(`\n=== INICIANDO CONFIGURAÇÃO DAS MISSÕES EM [${envName}] ===`);

    // 1. Clear existing results and jobs
    const delResults = await client.query(`DELETE FROM core_comercial.lead_prospecting_results;`);
    const delJobs = await client.query(`DELETE FROM core_comercial.lead_prospecting_jobs;`);
    console.log(`[${envName}] Limpos ${delResults.rowCount} resultados em Staging e ${delJobs.rowCount} missões antigas.`);

    // 2. Fetch empresas list
    const empresasRes = await client.query(`SELECT id FROM core_common.empresas;`);
    const empresaIds = empresasRes.rows.map(r => r.id);

    if (empresaIds.length === 0) {
      console.error(`[${envName}] Nenhuma empresa encontrada em core_common.empresas.`);
      return;
    }

    console.log(`[${envName}] Empresa IDs identificados:`, empresaIds);

    // 3. Insert structured Spain sweep missions for each empresa_id
    let totalInserted = 0;
    for (const empId of empresaIds) {
      for (let i = 0; i < MISSIONS_TO_CREATE.length; i++) {
        const m = MISSIONS_TO_CREATE[i];
        // Mark first job as processing so runner picks it up, others pending
        const status = (i === 0) ? 'processing' : 'pending';

        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_jobs (
            empresa_id, title, keywords, location, target_count, processed_count, found_emails_count, 
            status, delay_seconds, search_source, email_required, sector_filter, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 0, 0, $6, 3, $7, $8, $9, NOW(), NOW()
          );
        `, [
          empId,
          m.title,
          m.keywords,
          m.location,
          m.target_count,
          status,
          m.search_source,
          m.email_required,
          m.sector_filter
        ]);
        totalInserted++;
      }
    }

    console.log(`[${envName}] Sucesso! Inseridas ${totalInserted} missões estratégicas para toda a Espanha nas 3 fontes de busca (web_broad, linkedin, google_maps).`);
    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`[${envName}] Erro ao configurar missões:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await setupMissions(devConnectionString, 'DEV');
  await setupMissions(prodConnectionString, 'PROD');
}

run();
