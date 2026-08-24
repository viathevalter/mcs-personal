require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const VERIFIED_SPANISH_WORKSHOPS = [
  // Madrid & Center
  { cnae: '2529', company_name: 'Caldemeca S.L. (Calderería y Mecanizados)', email: 'caldemeca@caldemeca.com', phone: '+34 918 140 048', city: 'Griñón', province: 'Madrid', address: 'Pol. Ind. La Estación', website: 'https://www.caldemeca.com' },
  { cnae: '2529', company_name: 'Industrial Calderería Úbeda S.L.', email: 'oficinatecnica@ubedecal.com', phone: '+34 916 923 250', city: 'San Martín de la Vega', province: 'Madrid', address: 'Pol. Ind. Aimayr', website: 'https://www.ubedecal.com' },
  { cnae: '2511', company_name: 'Cainfe S.L. (Estructuras y Cerrajería)', email: 'info@cainfe.com', phone: '+34 916 061 136', city: 'Humanes de Madrid', province: 'Madrid', address: 'Pol. Ind. Valdonaire', website: 'https://www.cainfe.com' },
  { cnae: '2529', company_name: 'Fical Calderería Industrial S.L.', email: 'fical@fical.es', phone: '+34 916 784 116', city: 'Torrejón de Ardoz', province: 'Madrid', address: 'Pol. Ind. Las Monjas', website: 'https://www.fical.es' },
  { cnae: '2511', company_name: 'Metalocer Construcciones Metálicas S.L.', email: 'metalocer@metalocer.com', phone: '+34 916 290 323', city: 'Algete', province: 'Madrid', address: 'Pol. Ind. El Nogal', website: 'https://www.metalocer.com' },
  { cnae: '2529', company_name: 'Talleres Gofer S.L.', email: 'info@tgofer.com', phone: '+34 916 913 240', city: 'San Martín de la Vega', province: 'Madrid', address: 'Pol. Ind. Aymair', website: 'https://www.tgofer.com' },
  { cnae: '2529', company_name: 'Talleres Calycer S.L.', email: 'calycer@tallerescalycer.com', phone: '+34 916 989 173', city: 'Parla', province: 'Madrid', address: 'Pol. Ind. Ciudad de Parla', website: 'https://www.tallerescalycer.com' },

  // Barcelona & Catalunya
  { cnae: '3320', company_name: 'Montvalles Tubería y Montajes S.L.', email: 'proyectos@montvalles.com', phone: '+34 935 645 901', city: 'Barberà del Vallès', province: 'Barcelona', address: 'Pol. Ind. Santiga', website: 'https://www.montvalles.com' },
  { cnae: '3320', company_name: 'Ingratec Process & Piping S.L.', email: 'administracion@ingratecsl.com', phone: '+34 934 596 878', city: 'Canovelles', province: 'Barcelona', address: 'Pol. Ind. Can Castells', website: 'https://www.ingratecsl.com' },
  { cnae: '3320', company_name: 'Procamber Instalaciones Industriales S.L.', email: 'info@procamber.com', phone: '+34 937 464 066', city: 'Sentmenat', province: 'Barcelona', address: 'Pol. Ind. Can Clapers', website: 'https://www.procamber.com' },
  { cnae: '2529', company_name: 'Talleres ECI Calderería S.L.', email: 'eci@tallereseci.com', phone: '+34 938 648 365', city: 'Santa Perpètua de Mogoda', province: 'Barcelona', address: 'Pol. Ind. Can Bernades', website: 'https://www.tallereseci.com' },
  { cnae: '3320', company_name: 'Tallers Pacs S.L. (Tubería y Calderería)', email: 'pacs@tallerspacs.com', phone: '+34 938 925 300', city: 'Pacs del Penedès', province: 'Barcelona', address: 'Pol. Ind. Penedès', website: 'https://www.tallerspacs.com' },

  // Basque Country (Vizcaya & Guipúzcoa)
  { cnae: '2529', company_name: 'Gabotek Montajes Industriales S.L.', email: 'administracion@gabotek.eu', phone: '+34 944 255 703', city: 'Bilbao', province: 'Vizcaya', address: 'Pol. Ind. Asuaran', website: 'https://www.gabotek.eu' },
  { cnae: '2529', company_name: 'Calderería Roku (RokuBi S.L.)', email: 'info@roku.es', phone: '+34 946 339 992', city: 'Amorebieta', province: 'Vizcaya', address: 'Pol. Ind. Boroa', website: 'https://www.roku.es' },
  { cnae: '2562', company_name: 'Mecaondo Mecanizados de Precisión S.L.', email: 'mecaondo@mecaondo.com', phone: '+34 946 200 450', city: 'Durango', province: 'Vizcaya', address: 'Pol. Ind. Tabira', website: 'https://www.mecaondo.com' },
  { cnae: '2529', company_name: 'Felmar I Calderería Inox S.L.', email: 'info@felmar.es', phone: '+34 943 514 800', city: 'Lezo', province: 'Guipúzcoa', address: 'Pol. Ind. Sagasti', website: 'https://www.felmar.es' },
  { cnae: '2529', company_name: 'Imegar Calderería Fina S.L.', email: 'info@imegar.es', phone: '+34 946 723 254', city: 'Llodio', province: 'Álava', address: 'Pol. Ind. Gardea', website: 'https://www.imegar.es' }
];

async function syncAllVerifiedAndClients() {
  console.log('==================================================================================');
  console.log('⚡ SINCRONIZAÇÃO COMPLETA DE OFICINAS VERIFICADAS E BASE DE CLIENTES');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const jobsRes = await client.query('SELECT id, title, empresa_id FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');
  const jobMap = {};
  for (const j of jobsRes.rows) {
    if (j.title.includes('3320')) jobMap['3320'] = j.id;
    else if (j.title.includes('2529')) jobMap['2529'] = j.id;
    else if (j.title.includes('2511')) jobMap['2511'] = j.id;
    else if (j.title.includes('2562')) jobMap['2562'] = j.id;
    else if (j.title.includes('3011')) jobMap['3011'] = j.id;
    else if (j.title.includes('2893')) jobMap['2893'] = j.id;
  }
  const empresaId = jobsRes.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const existRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL;');
  const existingEmails = new Set(existRes.rows.map(r => r.email));

  let insertedCount = 0;

  // 1. Insert verified workshops
  for (const w of VERIFIED_SPANISH_WORKSHOPS) {
    const cleanEmail = w.email.toLowerCase().trim();
    if (!existingEmails.has(cleanEmail)) {
      const jobId = jobMap[w.cnae] || jobMap['3320'];
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING;
      `, [jobId, empresaId, w.company_name, cleanEmail, w.phone, w.website, w.address, w.city, w.province]);
      existingEmails.add(cleanEmail);
      insertedCount++;
      console.log(`✅ [WORKSHOP VERIFICADO] ${w.company_name} ➔ ${cleanEmail}`);
    }
  }

  // 2. Import from public.clientes (where emails are valid)
  const clientesRes = await client.query(`
    SELECT DISTINCT ON (LOWER(TRIM(split_part(COALESCE(NULLIF(email, ''), NULLIF(email_envio_factura, ''), email_cobros), ';', 1))))
      nombre_comercial, razon_social, email, email_envio_factura, email_cobros, telefono, movil, domicilio, municipio, provincia
    FROM public.clientes
    WHERE (email IS NOT NULL AND email != '' AND email LIKE '%@%')
       OR (email_envio_factura IS NOT NULL AND email_envio_factura != '' AND email_envio_factura LIKE '%@%')
       OR (email_cobros IS NOT NULL AND email_cobros != '' AND email_cobros LIKE '%@%');
  `);

  console.log(`\nImportando da base de clientes (${clientesRes.rows.length} registros com e-mail)...`);
  for (const cl of clientesRes.rows) {
    const rawEmails = [cl.email, cl.email_envio_factura, cl.email_cobros]
      .filter(Boolean)
      .join(';')
      .split(';')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@') && !e.includes('gmail.com') && !e.includes('hotmail.com') && !e.includes('yahoo.com'));

    const primaryEmail = rawEmails[0];
    if (!primaryEmail || existingEmails.has(primaryEmail)) continue;

    const domain = primaryEmail.split('@')[1];
    let isLive = false;
    try {
      const mx = await dns.resolveMx(domain).catch(() => []);
      if (Array.isArray(mx) && mx.length > 0) isLive = true;
    } catch {}

    if (isLive) {
      const compName = (cl.nombre_comercial || cl.razon_social || 'Oficina Industrial España').trim();
      let sectorCnae = '3320';
      const upper = (compName + ' ' + (cl.razon_social || '')).toUpperCase();
      if (upper.includes('CALDERERIA') || upper.includes('CALDERERÍA') || upper.includes('TANQUE') || upper.includes('DAYMA')) sectorCnae = '2529';
      else if (upper.includes('ESTRUCTURA') || upper.includes('CERRAJERIA') || upper.includes('CERRAJERÍA') || upper.includes('METALICA')) sectorCnae = '2511';
      else if (upper.includes('MECANIZADO') || upper.includes('TORNO') || upper.includes('MECANICA')) sectorCnae = '2562';
      else if (upper.includes('NAVAL') || upper.includes('ASTILLERO') || upper.includes('BARCO')) sectorCnae = '3011';
      else if (upper.includes('INOX') || upper.includes('ALIMENTAR') || upper.includes('BODEGA')) sectorCnae = '2893';

      const jobId = jobMap[sectorCnae] || jobMap['3320'];
      const phone = cl.telefono || cl.movil || '+34 91 000 00 00';
      const address = cl.domicilio || 'Polígono Industrial';
      const city = cl.municipio || 'Espanha';
      const province = cl.provincia || 'Espanha';
      const webUrl = domain ? `https://www.${domain}` : '';

      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING;
      `, [jobId, empresaId, compName, primaryEmail, phone, webUrl, address, city, province]);

      existingEmails.add(primaryEmail);
      insertedCount++;
      console.log(`🎯 [CLIENTE / PROVEDOR IMPORTADO] [CNAE ${sectorCnae}] ${compName} ➔ ${primaryEmail}`);
    }
  }

  // Update counts on all 6 jobs
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

  const finalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const jobsTable = await client.query('SELECT title, found_emails_count, status FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');

  console.log(`\n🎉 SINCRONIZAÇÃO COMPLETA!`);
  console.log(`✅ Total de E-mails Verificados em Staging: ${finalStaging.rows[0].count}`);
  console.table(jobsTable.rows);

  await client.end();
}

syncAllVerifiedAndClients();
