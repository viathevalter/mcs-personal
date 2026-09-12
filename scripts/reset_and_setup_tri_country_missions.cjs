const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const DEV_PG_URL = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const TRI_COUNTRY_MISSIONS = [
  // ==========================================
  // 🇪🇸 ESPANHA (6 Missões Estratégicas CNAE & Google Maps)
  // ==========================================
  {
    country: 'ES',
    title: '🇪🇸 1. CNAE 3320 - Tubería Industrial, Piping & Montajes Mecánicos',
    keywords: 'CNAE 3320 instalación y montaje tubería industrial piping alta presión soldadores tuberos',
    location: 'Catalunha, Madrid, País Vasco, Valência (Espanha)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'ES',
    title: '🇪🇸 2. CNAE 2529 - Calderería Pesada, Tanques & Recipientes a Presión',
    keywords: 'CNAE 2529 fabricación calderería pesada depósitos a presión cisternas caldereros soldadura TIG MIG',
    location: 'País Vasco, Astúrias, Zaragoza, Madrid (Espanha)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'ES',
    title: '🇪🇸 3. CNAE 2511 - Estructuras Metálicas, Naves & Cerrajería Pesada',
    keywords: 'CNAE 2511 estructuras metálicas naves industriales carpintería metálica siderurgia vigas acero',
    location: 'Madrid, Zaragoza, Galiza, Sevilha (Espanha)',
    sector_filter: 'Estructuras Metálicas & Montajes',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'ES',
    title: '🇪🇸 4. CNAE 2562 - Mecanizado Industrial CNC & Tornería',
    keywords: 'CNAE 2562 mecanizado CNC torno fresa ingeniería mecánica piezas industriales',
    location: 'Guipúzcoa, Vizcaya, Barcelona, Álava (Espanha)',
    sector_filter: 'Mecanizado CNC & Tornería',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'ES',
    title: '🇪🇸 5. CNAE 3011 / 3315 - Construcción & Reparación Naval / Astilleros',
    keywords: 'CNAE 3011 construcción naval reparación naval astilleros calderería naval soldadores 6G',
    location: 'Vigo, Ferrol, Cádiz, Cartagena, Gijón (Espanha)',
    sector_filter: 'Construção & Reparação Naval',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'ES',
    title: '🇪🇸 6. CNAE 2825 & 3311 - Intercambiadores de Calor, Calderas & Frío',
    keywords: 'CNAE 2825 intercambiadores de calor calderas industriales paradas de planta climatización',
    location: 'Tarragona, Huelva, Puertollano, Algeciras (Espanha)',
    sector_filter: 'Mantenimiento Industrial & Calderas',
    search_source: 'google_maps',
    target_count: 500
  },

  // ==========================================
  // 🇫🇷 FRANÇA (6 Missões Estratégicas NAF & Google Maps)
  // ==========================================
  {
    country: 'FR',
    title: '🇫🇷 1. NAF 33.20 - Tuyauterie Industrielle, Piping & Montage Mécanique',
    keywords: 'NAF 33.20 tuyauterie industrielle inox haute pression soudure TIG tuyautiers montage',
    location: 'Auvergne-Rhône-Alpes, PACA, Normandie, Hauts-de-France (França)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'official_registry',
    target_count: 500
  },
  {
    country: 'FR',
    title: '🇫🇷 2. NAF 25.29 - Chaudronnerie Industrielle, Cuves & Réservoirs',
    keywords: 'NAF 25.29 chaudronnerie industrielle cuves inox réservoirs sous pression mécano-soudure',
    location: 'Grand Est, Auvergne-Rhône-Alpes, Hauts-de-France, Occitanie (França)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'official_registry',
    target_count: 500
  },
  {
    country: 'FR',
    title: '🇫🇷 3. NAF 25.11 - Charpente Métallique & Serrurerie Industrielle',
    keywords: 'NAF 25.11 charpente métallique structures métalliques serrurerie industrielle bardage',
    location: 'Hauts-de-France, Île-de-France, Grand Est, Nouvelle-Aquitaine (França)',
    sector_filter: 'Estructuras Metálicas & Montajes',
    search_source: 'official_registry',
    target_count: 500
  },
  {
    country: 'FR',
    title: '🇫🇷 4. NAF 25.62 - Usinage CNC, Décolletage & Mécanique de Précision',
    keywords: 'NAF 25.62 usinage mécanique précision tournage CNC fraisage numérique mécanique',
    location: 'Haute-Savoie, Lyon, Pays de la Loire, Grand Est (França)',
    sector_filter: 'Mecanizado CNC & Tornería',
    search_source: 'official_registry',
    target_count: 500
  },
  {
    country: 'FR',
    title: '🇫🇷 5. NAF 30.11 / 33.15 - Chantiers Navals & Réparation Navale',
    keywords: 'NAF 30.11 construction navale réparation navale chantiers navals chaudronnerie navale',
    location: 'Saint-Nazaire, Brest, Lorient, Toulon, Marseille, Le Havre (França)',
    sector_filter: 'Construção & Reparação Naval',
    search_source: 'official_registry',
    target_count: 500
  },
  {
    country: 'FR',
    title: '🇫🇷 6. NAF 28.25 - Échangeurs Thermiques, Chaudières & Froid',
    keywords: 'NAF 28.25 ventilation industrielle échangeurs thermiques froid industriel chaudières maintenance',
    location: 'Lyon, Fos-sur-Mer, Dunkerque, Vallée de la Seine (França)',
    sector_filter: 'Mantenimiento Industrial & Calderas',
    search_source: 'official_registry',
    target_count: 500
  },

  // ==========================================
  // 🇮🇹 ITÁLIA (6 Missões Estratégicas ATECO & Google Maps)
  // ==========================================
  {
    country: 'IT',
    title: '🇮🇹 1. ATECO 33.20 - Tubisteria Industriale, Piping & Montaggio Impianti',
    keywords: 'ATECO 33.20 tubisteria industriale piping industriale montaggio impianti vapore gas tubisti saldatori',
    location: 'Milano, Brescia, Bergamo (Lombardia, Itália)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'IT',
    title: '🇮🇹 2. ATECO 25.29 - Caldareria Pesante, Serbatoi & Reattori a Pressione',
    keywords: 'ATECO 25.29 caldareria pesante serbatoi cisterne reattori a pressione scambiatori saldatura TIG',
    location: 'Brescia, Bergamo, Torino, Novara (Lombardia & Piemonte, Itália)',
    sector_filter: 'Calderería & Tubería Industrial',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'IT',
    title: '🇮🇹 3. ATECO 25.11 - Carpenteria Metallica Pesante & Strutture Acciaio',
    keywords: 'ATECO 25.11 carpenteria metallica pesante travi saldate strutture acciaio capannoni industriali',
    location: 'Vicenza, Verona, Treviso, Padova (Veneto, Itália)',
    sector_filter: 'Estructuras Metálicas & Montajes',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'IT',
    title: '🇮🇹 4. ATECO 25.62 - Meccanica Generale, Tornitura CNC & Lavorazioni',
    keywords: 'ATECO 25.62 lavorazioni meccaniche precisione tornitura CNC fresatura carpenteria meccanica',
    location: 'Bologna, Modena, Reggio Emilia, Parma (Emilia-Romagna, Itália)',
    sector_filter: 'Mecanizado CNC & Tornería',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'IT',
    title: '🇮🇹 5. ATECO 30.11 / 33.15 - Cantieri Navali & Riparazioni Navali',
    keywords: 'ATECO 30.11 cantieri navali riparazioni navali saldatori navali tubisti navali refit meccanica portuale',
    location: 'Genova, Trieste, Livorno, Monfalcone, Ravenna (Itália)',
    sector_filter: 'Construção & Reparação Naval',
    search_source: 'google_maps',
    target_count: 500
  },
  {
    country: 'IT',
    title: '🇮🇹 6. ATECO 28.25 - Scambiatori di Calore & Termica Industriale',
    keywords: 'ATECO 28.25 scambiatori di calore forni industriali impianti refrigerazione caldaie industriali',
    location: 'Brescia, Milano, Bologna, Firenze (Itália)',
    sector_filter: 'Mantenimiento Industrial & Calderas',
    search_source: 'google_maps',
    target_count: 500
  }
];

async function resetAndSetupDatabase(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`\n====================================================================`);
  console.log(`🧹 [${dbName}] LIMPANDO FILA ANTIGA & RECRIANDO MATRIZ TRI-PAÍS`);
  console.log(`====================================================================`);

  // 1. Obter empresa ativa para associar as novas missões
  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empRes.rows[0]?.empresa_id || 'dae64d51-2181-4510-b14f-e63d2f111a8e'; // WISEOWE padrão

  // 2. Limpar staging e jobs antigos (PRESERVANDO 100% dos leads no CRM core_comercial.leads!)
  const crmCount = await client.query('SELECT count(*) FROM core_comercial.leads;');
  console.log(`🔒 Leads no CRM protegidos e intactos: ${crmCount.rows[0].count}`);

  await client.query('DELETE FROM core_comercial.lead_prospecting_results;');
  console.log(`✅ Staging zerado com sucesso.`);

  await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');
  console.log(`✅ Missões antigas zeradas com sucesso.`);

  // 3. Inserir a nova matriz oficial e equilibrada dos 3 países
  let inserted = 0;
  for (const m of TRI_COUNTRY_MISSIONS) {
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_jobs (
        empresa_id, title, keywords, location, target_count, processed_count,
        found_emails_count, status, delay_seconds, search_source, email_required,
        sector_filter, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 0, 0, 'pending', 3, $6, true, $7, NOW(), NOW());
    `, [
      empresaId, m.title, m.keywords, m.location, m.target_count,
      m.search_source, m.sector_filter
    ]);
    inserted++;
  }

  console.log(`🚀 Inseridas ${inserted} novas missões coordenadas (6 ES, 6 FR, 6 IT) em [${dbName}].`);
  await client.end();
}

async function run() {
  await resetAndSetupDatabase('PRODUÇÃO', PROD_PG_URL);
  await resetAndSetupDatabase('DESENVOLVIMENTO', DEV_PG_URL);
  console.log('\n🎉 Matriz dos 3 Países configurada com sucesso em Prod e Dev!');
}

run().catch(console.error);
