const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const strategicMissions = [
  {
    title: '🚢 Astilleros y Calderería Naval - Galicia (Vigo, Ferrol, Coruña)',
    keywords: 'Construcción naval, Reparación naval, Tuberos navais, Soldadores homologados 6G, Astilleros',
    location: 'Vigo, Ferrol, A Coruña, Porriño, Narón, Galicia',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Construção & Reparação Naval',
  },
  {
    title: '🚢 Astilleros y Reparación de Buques - Cádiz y Huelva',
    keywords: 'Astilleros, Reparación de buques, Calderería naval, Tubería de alta presión, Soldadura naval',
    location: 'Cádiz, Puerto Real, San Fernando, Algeciras, Huelva, Andalucía',
    target_count: 500,
    search_source: 'linkedin',
    sector_filter: 'Construção & Reparação Naval',
  },
  {
    title: '🏗️ Calderería Pesada y Fabricación Metálica - Euskadi (Vizcaya)',
    keywords: 'Calderería pesada, Talleres metalúrgicos, Fabricación metálica, Tubería industrial, Soldadura Raio-X',
    location: 'Bilbao, Zamudio, Durango, Eibar, Erandio, Barakaldo, Vizcaya',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Calderería & Tubería Industrial',
  },
  {
    title: '⚙️ Talleres Metalúrgicos y Estructuras - Guipúzcoa y Álava',
    keywords: 'Talleres metalúrgicos, Fabricación de estructuras metálicas, Calderería, Mecanizado CNC, Soldadores TIG',
    location: 'Vitoria-Gasteiz, San Sebastián, Irun, Eibar, Zarautz, País Vasco',
    target_count: 500,
    search_source: 'google_maps',
    sector_filter: 'Estructuras Metálicas & Montajes',
  },
  {
    title: '🏭 Calderería y Mantenimiento Industrial - Navarra (Polígonos Landaben/Tudela)',
    keywords: 'Polígono Industrial Landaben, Agustinos, Tudela, Calderería, Soldadura TIG MIG, Tubería industrial',
    location: 'Pamplona, Landaben, Tudela, Sakana, Estella, Navarra',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Calderería & Tubería Industrial',
  },
  {
    title: '⚙️ Estructuras Metálicas y Montajes - Cataluña (Vallès)',
    keywords: 'Estructuras metálicas, Calderería industrial, Talleres metalúrgicos, Montajes industriales, Tuberos',
    location: 'Sabadell, Terrassa, Rubí, Granollers, Sant Cugat, Barcelona',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Estructuras Metálicas & Montajes',
  },
  {
    title: '🧪 Industria Química y Paradas de Planta - Tarragona',
    keywords: 'Industria química, Mantenimiento de plantas químicas, Tubería de alta presión, Paradas de planta, Soldadores TIG',
    location: 'Tarragona, Reus, Vila-seca, Castellón de la Plana',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Industria Química & Petroquímica',
  },
  {
    title: '🏢 Ingeniería Industrial y Contratistas EPC - Madrid',
    keywords: 'Empresas de ingeniería industrial, Contratistas EPC, Montajes industriales, Subcontratación de personal técnico',
    location: 'Madrid, Getafe, Leganés, Fuenlabrada, Alcalá de Henares, Alcobendas',
    target_count: 500,
    search_source: 'linkedin',
    sector_filter: 'Ingeniería & Contratistas EPC',
  },
  {
    title: '⚙️ Calderería y Montajes Industriales - Cinturón de Madrid',
    keywords: 'Montajes industriales, Calderería industrial, Tubero industrial, Soldador TIG MIG, Mantenimiento industrial',
    location: 'Getafe, Leganés, Fuenlabrada, Móstoles, Valdemoro, Madrid',
    target_count: 500,
    search_source: 'google_maps',
    sector_filter: 'Estructuras Metálicas & Montajes',
  },
  {
    title: '⚙️ Estructuras Metálicas y Montajes - Valencia y Sagunto',
    keywords: 'Estructuras metálicas, Calderería, Tuberos industriales, Montajes de plantas, Soldadores homologados',
    location: 'Valencia, Sagunto, Paterna, Alzira, Silla, Alicante',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Estructuras Metálicas & Montajes',
  },
  {
    title: '🏭 Metalurgia y Montajes Industriales - Aragón (Zaragoza)',
    keywords: 'Calderería industrial, Metalurgia, Estructuras metálicas, Montajes industriales, Soldadura TIG MIG',
    location: 'Zaragoza, Polígono Plaza, Malpica, Cogullada, Figueruelas, Aragón',
    target_count: 500,
    search_source: 'web_broad',
    sector_filter: 'Estructuras Metálicas & Montajes',
  },
  {
    title: '🚢 Astilleros y Metalurgia Pesada - Asturias y Cantabria',
    keywords: 'Astilleros, Calderería pesada, Metalurgia, Tubería industrial, Soldadura naval',
    location: 'Avilés, Gijón, Oviedo, Santander, Torrelavega, Asturias',
    target_count: 500,
    search_source: 'google_maps',
    sector_filter: 'Construção & Reparação Naval',
  }
];

async function setupWeekendMatrix(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log(`\n========================================`);
  console.log(`🚀 REGISTRANDO MATRIZ DE 5.000 LEADS EM [${envName}]`);
  console.log(`========================================`);

  try {
    const resEmpresa = await client.query(`SELECT id FROM core_common.empresas LIMIT 1;`);
    if (resEmpresa.rows.length === 0) {
      console.error(`[${envName}] Nenhuma empresa encontrada.`);
      return;
    }
    const empresaId = resEmpresa.rows[0].id;

    // Reset status of any previous non-completed jobs to pending
    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET status = 'pending', updated_at = NOW()
      WHERE status IN ('processing', 'failed');
    `);

    let createdCount = 0;
    for (const m of strategicMissions) {
      // Check if job with title already exists
      const checkRes = await client.query(`
        SELECT id FROM core_comercial.lead_prospecting_jobs
        WHERE empresa_id = $1 AND title = $2;
      `, [empresaId, m.title]);

      if (checkRes.rows.length === 0) {
        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_jobs (
            empresa_id, title, keywords, location, target_count, processed_count, found_emails_count,
            delay_seconds, search_source, email_required, sector_filter, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 0, 0, 2, $6, true, $7, 'pending', NOW(), NOW()
          );
        `, [empresaId, m.title, m.keywords, m.location, m.target_count, m.search_source, m.sector_filter]);
        createdCount++;
      }
    }

    console.log(`✅ [${envName}] Criadas ${createdCount} novas missões estratégicas para o final de semana!`);

    const resAll = await client.query(`
      SELECT id, title, status, target_count, found_emails_count, search_source
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at DESC;
    `);
    console.table(resAll.rows);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await setupWeekendMatrix(devConnectionString, 'DEV');
  await setupWeekendMatrix(prodConnectionString, 'PROD');
}

run();
