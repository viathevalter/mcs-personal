require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function cleanEmail(raw) {
  if (!raw) return null;
  let email = raw.trim().toLowerCase().replace(/^mailto:/i, '');
  if (/\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf|doc|docx)$/i.test(email)) return null;
  if (!email.includes('@')) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const user = parts[0];
  const domain = parts[1];
  if (!user || !domain || !domain.includes('.')) return null;
  return user + '@' + domain;
}

async function convertFranceLeads() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('====================================================================');
  console.log('⚡ CONVERTENDO LEADS DA FRANÇA DO STAGING PARA O CRM OFICIAL');
  console.log('====================================================================');

  const stagesRes = await client.query('SELECT id, empresa_id, name FROM core_comercial.kanban_stages ORDER BY order_index ASC;');
  const stage1ByEmpresa = {};
  for (const st of stagesRes.rows) {
    if (!stage1ByEmpresa[st.empresa_id]) {
      stage1ByEmpresa[st.empresa_id] = st.id;
    }
  }

  const results = await client.query('SELECT r.*, j.title as job_title, j.empresa_id as job_empresa_id FROM core_comercial.lead_prospecting_results r LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id WHERE r.country = $1 AND r.email IS NOT NULL AND r.email != $2;', ['França', '']);
  console.log('Total de prospects da França para conversão:', results.rows.length);

  let insertedCount = 0;
  let linkedExistingCount = 0;
  let skippedCount = 0;

  for (const r of results.rows) {
    const validEmail = cleanEmail(r.email);
    if (!validEmail) {
      skippedCount++;
      continue;
    }

    const empresaId = r.empresa_id || r.job_empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';
    const defaultStageId = stage1ByEmpresa[empresaId] || Object.values(stage1ByEmpresa)[0] || null;

    const existing = await client.query('SELECT id, name, email, website, phone, tags FROM core_comercial.leads WHERE lower(TRIM(email)) = $1 LIMIT 1;', [validEmail]);

    if (existing.rows.length > 0) {
      const existingLead = existing.rows[0];
      linkedExistingCount++;
      await client.query('UPDATE core_comercial.leads SET website = COALESCE(website, $1), phone = COALESCE(phone, $2), city = COALESCE(city, $3), province = COALESCE(province, $4), region = $5, updated_at = NOW() WHERE id = $6;', [
        r.website, r.phone, r.city, r.province, 'França', existingLead.id
      ]);
      await client.query('UPDATE core_comercial.lead_prospecting_results SET status = $1, imported_lead_id = $2, updated_at = NOW() WHERE id = $3;', [
        'imported', existingLead.id, r.id
      ]);
    } else {
      const tags = ['Prospecção Autônoma B2B', '🇫🇷 França'];
      if (r.job_title) tags.push(r.job_title.replace(/^🇫🇷\s*\d+\.\s*/, ''));
      if (r.sector) tags.push(r.sector);
      const noteText = 'Lead qualificado importado da França - Missão: ' + (r.job_title || 'Geral') + '. Cidade: ' + (r.city || 'França') + ', Depto: ' + (r.province || '') + '.';
      try {
        const insertRes = await client.query('INSERT INTO core_comercial.leads (empresa_id, name, company_name, email, phone, website, linkedin_url, instagram_url, address_line, city, province, region, company_size, sector, cargo, origen_lead, notes, tags, prospecting_job_id, stage_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()) RETURNING id;', [
          empresaId,
          r.company_name || 'Responsable Achats / Technique',
          r.company_name,
          validEmail,
          r.phone || null,
          r.website || null,
          r.linkedin_url || null,
          r.instagram_url || null,
          r.address || null,
          r.city || null,
          r.province || null,
          'França',
          r.company_size || null,
          r.sector || 'Tuyauterie & Chaudronnerie Industrielle',
          'Direction / Achats / Travaux',
          'prospeccao_b2b',
          noteText,
          tags,
          r.job_id || null,
          defaultStageId
        ]);
        const newLeadId = insertRes.rows[0] ? insertRes.rows[0].id : null;
        insertedCount++;
        await client.query('UPDATE core_comercial.lead_prospecting_results SET status = $1, imported_lead_id = $2, updated_at = NOW() WHERE id = $3;', [
          'imported', newLeadId, r.id
        ]);
      } catch (err) {
        console.warn('Erro ao inserir lead ' + validEmail + ':', err.message);
      }
    }
  }

  console.log('\n====================================================================');
  console.log('✅ SUCESSO! ' + insertedCount + ' NOVOS LEADS DA FRANÇA INSERIDOS NO CRM!');
  console.log('🔗 ' + linkedExistingCount + ' leads vinculados/atualizados.');
  console.log('====================================================================');

  const totalCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');
  const totalCrmFrance = await client.query('SELECT count(*) FROM core_comercial.leads WHERE region = $1 OR $2 = ANY(tags);', ['França', '🇫🇷 França']);
  console.log('📊 Total Geral de Leads no CRM:', totalCrm.rows[0].count, 'leads.');
  console.log('🇫🇷 Total Exclusivo da França no CRM:', totalCrmFrance.rows[0].count, 'leads.');

  await client.end();
}

convertFranceLeads().catch(console.error);