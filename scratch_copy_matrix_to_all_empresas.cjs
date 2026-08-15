const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const strategicMissions = [
  { title: '🚢 Astilleros y Calderería Naval - Vigo y Ferrol (Galicia)', city: 'Vigo y Ferrol (Galicia)', keywords: 'Astilleros, Calderería naval, Reparación de buques, Tuberos navais, Soldadores 6G', sector: 'Construção & Reparação Naval' },
  { title: '🚢 Reparación de Buques y Tubería - Coruña y Narón (Galicia)', city: 'A Coruña y Narón (Galicia)', keywords: 'Tubería de alta presión, Calderería pesada, Estructuras navales, Soldadura homologada', sector: 'Construção & Reparação Naval' },
  { title: '🚢 Metalurgia Pesada y Calderería - Gijón y Avilés (Asturias)', city: 'Gijón y Avilés (Asturias)', keywords: 'Metalurgia pesada, Calderería industrial, Astilleros, Tubería industrial, Soldadura Raio-X', sector: 'Calderería & Tubería Industrial' },
  { title: '⚙️ Talleres Metalúrgicos - Santander y Torrelavega (Cantabria)', city: 'Santander y Torrelavega (Cantabria)', keywords: 'Talleres metalúrgicos, Fabricación de estructuras metálicas, Calderería, Montajes', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏗️ Calderería Pesada y Fabricación Metálica - Bilbao y Barakaldo (Vizcaya)', city: 'Bilbao, Zamudio y Barakaldo (Vizcaya)', keywords: 'Calderería pesada, Fabricación metálica, Tubería industrial, Soldadura TIG MIG', sector: 'Calderería & Tubería Industrial' },
  { title: '⚙️ Mecanizado CNC y Estructuras - Eibar y Durango (Guipúzcoa)', city: 'Eibar, Durango y Zarautz (Guipúzcoa)', keywords: 'Mecanizado CNC, Fabricación de estructuras, Calderería, Montajes industriales', sector: 'Estructuras Metálicas & Montajes' },
  { title: '⚙️ Estructuras Metálicas - Vitoria e Jundiz (Álava)', city: 'Vitoria-Gasteiz y Polígono Jundiz (Álava)', keywords: 'Talleres metalúrgicos, Estructuras metálicas, Calderería industrial, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏭 Calderería e Montajes - Pamplona e Tudela (Navarra)', city: 'Pamplona, Landaben y Tudela (Navarra)', keywords: 'Polígono Industrial Landaben, Calderería, Soldadura TIG, Tubería, Paradas de planta', sector: 'Calderería & Tubería Industrial' },
  { title: '⚙️ Calderería Industrial y Montajes - Vallès Occidental (Sabadell, Terrassa)', city: 'Sabadell, Terrassa y Rubí (Vallès Occidental)', keywords: 'Calderería industrial, Estructuras metálicas, Montajes de plantas, Soldadores TIG', sector: 'Estructuras Metálicas & Montajes' },
  { title: '⚙️ Talleres Metalúrgicos e Mecanizado - Vallès Oriental (Granollers)', city: 'Granollers y Mollet del Vallès (Vallès Oriental)', keywords: 'Talleres metalúrgicos, Mecanizado, Fabricación metálica, Calderería, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏢 Montajes Industriales e EPC - Baix Llobregat (Cornellà, El Prat)', city: 'Cornellà, El Prat y Sant Boi (Baix Llobregat)', keywords: 'Montajes industriales, Mantenimiento industrial, Subcontratación técnica, Calderería', sector: 'Ingeniería & Contratistas EPC' },
  { title: '🧪 Industria Química y Paradas de Planta - Tarragona', city: 'Tarragona, Reus y Vila-seca (Polígono Químico)', keywords: 'Industria química, Tubería de alta presión, Paradas de planta, Soldadores TIG 6G', sector: 'Industria Química & Petroquímica' },
  { title: '⚙️ Calderería y Montajes - Cinturón Sur de Madrid (Getafe, Leganés, Fuenlabrada)', city: 'Getafe, Leganés y Fuenlabrada (Cinturón Sur Madrid)', keywords: 'Calderería industrial, Montajes industriales, Tubero industrial, Soldador TIG MIG', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🏢 Ingeniería Industrial e Contratistas EPC - Madrid Este (Alcalá, Torrejón)', city: 'Alcalá de Henares y Torrejón (Madrid Este)', keywords: 'Ingeniería industrial, Contratistas EPC, Montajes, Subcontratación de personal técnico', sector: 'Ingeniería & Contratistas EPC' },
  { title: '🏭 Metalurgia y Montajes Industriales - Zaragoza y Plaza (Aragón)', city: 'Zaragoza, Polígono Plaza y Malpica (Aragón)', keywords: 'Metalurgia, Calderería, Estructuras metálicas, Montajes industriales, Soldadura', sector: 'Estructuras Metálicas & Montajes' },
  { title: '⚙️ Estructuras Metálicas y Montajes - Valencia, Sagunto y Paterna', city: 'Valencia, Sagunto y Paterna (Comunidad Valenciana)', keywords: 'Estructuras metálicas, Calderería, Tuberos, Montajes de plantas, Soldadores', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🧪 Industria Química e Tubería - Castellón e Vila-real', city: 'Castellón de la Plana y Vila-real (Castellón)', keywords: 'Industria cerámica y química, Tubería industrial, Calderería, Paradas de planta', sector: 'Industria Química & Petroquímica' },
  { title: '🚢 Calderería Naval e Industrial - Cartagena e Murcia', city: 'Cartagena, Murcia y Lorca (Región de Murcia)', keywords: 'Calderería naval y química, Tubería de alta presión, Astilleros, Montajes', sector: 'Construção & Reparação Naval' },
  { title: '⚙️ Estructuras Metálicas e Aeronáutica - Sevilla y Dos Hermanas', city: 'Sevilla, Alcalá de Guadaíra y Dos Hermanas', keywords: 'Estructuras metálicas, Calderería, Montajes industriales, Aeronáutica, Tuberos', sector: 'Estructuras Metálicas & Montajes' },
  { title: '🚢 Astilleros y Reparación Naval - Cádiz, Puerto Real y Algeciras', city: 'Cádiz, Puerto Real y Algeciras (Cádiz)', keywords: 'Astilleros, Reparación navale, Calderería naval, Soldadura naval, Tubería', sector: 'Construção & Reparação Naval' },
  { title: '🧪 Plantas Petroquímicas e Tubería - Huelva y Puertollano', city: 'Huelva y Puertollano (Sector Petroquímico)', keywords: 'Plantas petroquímicas, Tubería de alta presión, Paradas de planta, Soldadores TIG', sector: 'Industria Química & Petroquímica' }
];

async function syncMatrixToAllEmpresas(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log(`\n======================================================`);
  console.log(`🚀 REPLICANDO MATRIZ DE 5.000 LEADS EM TODAS AS EMPRESAS [${envName}]`);
  console.log(`======================================================`);

  try {
    const resEmpresas = await client.query(`SELECT id, nome FROM core_common.empresas;`);

    for (const emp of resEmpresas.rows) {
      console.log(`\n🏢 Empresa: "${emp.nome}" (ID: ${emp.id})`);

      for (const m of strategicMissions) {
        const checkRes = await client.query(`
          SELECT id FROM core_comercial.lead_prospecting_jobs
          WHERE empresa_id = $1 AND title = $2;
        `, [emp.id, m.title]);

        if (checkRes.rows.length === 0) {
          await client.query(`
            INSERT INTO core_comercial.lead_prospecting_jobs (
              empresa_id, title, keywords, location, target_count, processed_count, found_emails_count,
              delay_seconds, search_source, email_required, sector_filter, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, 500, 0, 0, 2, 'web_broad', true, $5, 'processing', NOW(), NOW()
            );
          `, [emp.id, m.title, m.keywords, m.city, m.sector]);
        } else {
          await client.query(`
            UPDATE core_comercial.lead_prospecting_jobs
            SET status = 'processing', updated_at = NOW()
            WHERE id = $1;
          `, [checkRes.rows[0].id]);
        }
      }

      console.log(`  ✅ 21 Missões estratégicas ativas para "${emp.nome}"`);
    }

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await syncMatrixToAllEmpresas(devConnectionString, 'DEV');
  await syncMatrixToAllEmpresas(prodConnectionString, 'PROD');
}

run();
