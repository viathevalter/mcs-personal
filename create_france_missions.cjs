const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const FRANCE_MISSIONS = [
  { title: '🇨🇷 1. NAF 33.20A/B - Tuyauterie Industrielle, Piping & Montage Mécanique', location: 'França (Auvergne-Rhône-Alpes, PACA - Fos-sur-Mer, Normandie, Hauts-de-France', keywords: 'NAF 33.20 Tuyauterie industrielle, montage mécanique, piping haute pression, soudage TIG MIG, raffineries, pétrochimie, centrales thermiques', sector_filter: 'Calderéria & Tubería Industrial', target_count: 2000, status: 'processing' },
  { title: '🇨🇷 2. NAF 25.29Z - Chaudronnerie Industrielle, Cuves & Réservoirs sous Pression', location: 'França (Grand Est, Auvergne-Rhône-Alpes, Hauts-de-France, Occitanie)', keywords: 'NAF 25.29Z Chaudronnerie industrielle lourde, fabrication de cuves inox, réservoirs sous pression, autoclaves, réacteurs chimiques, appareils à pression', sector_filter: 'Calderéria & Tubería Industrial', target_count: 2000, status: 'pending' },
  { title: '🇨🇷 3. NAF 25.11Z - Charpente Métallique, Serrurerie Industrielle & Bardage', location: 'França (Hauts-de-France, Îśe-de-France, Grand Est, Nouvelle-Aquitaine)', keywords: 'NAF 25.11Z Charpente métallique, structures métalliques industrielles, serrurerie industrielle, bardage métallique, métallerie lourde, hangars industriels', sector_filter: 'Estructuras Metálicas & Montajes', target_count: 2000, status: 'pending' },
  { title: '🇨🇴 4. NAF 25.62A/B - Usinage CNC, Décolletage & Mécanique de Précision', location: 'França (Haute-Savoie - Vallée de l\'Arve, Lyon, Pays de la Loire, Grand Est)', keywords: 'NAF 25.62 Usinage CNC, décolletage de précision, tournage vertical lourd, fraisage 5 axes, vertical alésage, mécanique générale industrielle', sector_filter: 'Mecanizado CNC & Tornería', target_count: 2000, status: 'pending' },
  { title: '🇨🇴 5. NAF 30.11Z / 33.15Z - Chantiers Navaux, Construction & Réparation Navale', location: 'França (Saint-Nazaire, Brest, Lorient, Toulon, Marseille, Le Havre, Cherbourg)', keywords: 'NAF 30.11Z Chantiers navaux, construction navale, réparation navale, tuyauterie navale, chaudronnerie navale, armement naval', sector_filter: 'Construção & Reparação Naval', target_count: 1000, status: 'pending' },
  { title: '🇨🇷 6. NAF 28.93Z - Tuyauterie Inox Agroalimentaire, Cuverie Vinicole & Laitière', location: 'França (Nouvelle-Aquitaine - Bordeaux, Bretagne, Pays de la Loire, Grand Est - Champagne)', keywords: 'NAF 28.93Z Tuyauterie inox agroalimentaire, cuverie vinicole, industrie laitière, tuyauterie pharmaceutique, skids inox', sector_filter: 'Tubería Inox & Agroalimentaria', target_count: 1500, status: 'pending' },
  { title: '🇨🇷 7. NAF 28.25Z / 33.11Z - Áchangeurs Thermiques, Chaudières & ArrZ�ts d\'Unités / Maintenance', location: 'França (Vallée de la Chimie Lyon, Fos-sur-Mer, Normandie Vallée de la Seine, Dunkerque', keywords: 'NAF 28.25Z Áchangeurs thermiques, chaudières industrielles, maintenance industrielle mécanique, arr©�s d\'unités pétrochimiques, arr©� de tranche', sector_filter: 'Mantenimiento Industrial & Calderas', target_count: 1500, status: 'pending' },
  { title: '🇨🇷 8. Z.I. & Grands Parcs d\'Activités Industriels de France', location: 'França (Plaine de l\'Ain, Dunkerque Port, Fos Port 2000, Saint-Priest, Z.I. Mitry-Compans)', keywords: 'Zone Industrielle Z.I., Parc d\'Activités, sous-traitance industrielle, ateliers métalliques, soudure industrielle, montage de tuyauterie', sector_filter: 'Polígonos Industriais & Subcontratistas', target_count: 1500, status: 'pending' }
];

async function run() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();
  console.log('Connected to database.');

  const empresaRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empresaRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  // Mark all Spanish missions as completed if they were in processing/pending
  await client.query(`
    UPDATE core_comercial.lead_prospecting_jobs 
    SET status = 'completed', updated_at = NOW() 
    WHERE location LIKE '%Espanha%' AND status IN ('processing', 'pending');
  `);


  for (const m of FRANCE_MISSIONS) {
    const existing = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs WHERE title = $1 LIMIT 1;', [m.title]);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_jobs (
          empresa_id, title, keywords, location, target_count, processed_count,
          found_emails_count, status, delay_seconds, search_source, email_required,
          sector_filter, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, 1, 'google_maps', true, $7, NOW(), NOW());
      `, [empresaId, m.title, m.keywords, m.location, m.target_count, m.status, m.sector_filter]);
      console.log('Created mission: ' + m.title);
    } else {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs 
        SET status = $1, target_count = $2, keywords = $3, location = $4, sector_filter = $5, updated_at = NOW()
        WHERE id = $6;
      `, [m.status, m.target_count, m.keywords, m.location, m.sector_filter, existing.rows[0].id]);
      console.log('Updated mission: ' + m.title);
    }
  }


  const jobsRes = await client.query('SELECT id, title, location, target_count, processed_count, found_emails_count, status FROM core_comercial.lead_prospecting_jobs ORDER BY created_at DESC;');
  console.log('\n--- ALL CURRENT MISSIONS IN DB ---');
  jobsRes.rows.forEach(r => {
    console.log(' [' + r.status.toUpperCase() + '] ' + r.title + ' | ' + r.location + ' | Target: ' + r.target_count + ' | Leads: ' + r.found_emails_count);
  });

  await client.end();
}

run().catch(console.error);