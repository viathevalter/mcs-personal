require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

function cleanEmail(raw) {
  if (!raw) return null;
  let email = raw.trim().toLowerCase().replace(/^mailto:/i, '').replace(/^[<"'\(\[\{]+|[>"'\)\]\}\.,;:]+$/g, '');
  if (/\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf|doc|docx)$/i.test(email)) return null;
  if (!email.includes('@')) return null;

  const [user, domain] = email.split('@');
  if (!user || !domain) return null;

  let cleanDomain = domain;
  const tlds = ['com.es', 'nom.es', 'org.es', 'gob.es', 'edu.es', 'com', 'es', 'pt', 'it', 'fr', 'net', 'org', 'eu', 'cat', 'gal', 'eus', 'info', 'biz', 'co', 'io'];
  for (const tld of tlds) {
    const escaped = tld.replace('.', '\\.');
    const regex = new RegExp(`^(.+\\.${escaped})[a-z]{3,}$`, 'i');
    if (regex.test(cleanDomain)) {
      const match = cleanDomain.match(regex);
      if (match) {
        cleanDomain = match[1];
        break;
      }
    }
  }
  const result = `${user}@${cleanDomain}`.toLowerCase().trim();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return emailRegex.test(result) ? result : null;
}

async function convertAllPendingProspects() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== CONVERTENDO RESULTADOS DE PROSPECÇÃO EM LEADS REAIS ===\n');

  // 1. Buscar estágios iniciais por empresa
  const stagesRes = await c.query(`
    SELECT id, empresa_id, name 
    FROM core_comercial.kanban_stages 
    WHERE order_index = 1 OR name ILIKE '%Novo%' OR name ILIKE '%Nuevo%'
    ORDER BY order_index ASC;
  `);

  const stage1ByEmpresa = {};
  for (const st of stagesRes.rows) {
    if (!stage1ByEmpresa[st.empresa_id]) {
      stage1ByEmpresa[st.empresa_id] = st.id;
    }
  }

  // Buscar todos os resultados de prospecção pendentes com job info
  const results = await c.query(`
    SELECT r.*, j.title as job_title, j.empresa_id as job_empresa_id
    FROM core_comercial.lead_prospecting_results r
    LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id
    WHERE r.imported_lead_id IS NULL AND r.email IS NOT NULL AND r.email != '';
  `);

  console.log(`Total de prospects pendentes para conversão: ${results.rows.length}`);

  let insertedCount = 0;
  let linkedExistingCount = 0;
  let skippedInvalidCount = 0;

  for (const r of results.rows) {
    const validEmail = cleanEmail(r.email);
    if (!validEmail) {
      skippedInvalidCount++;
      await c.query(`
        UPDATE core_comercial.lead_prospecting_results
        SET status = 'discarded', updated_at = NOW()
        WHERE id = $1;
      `, [r.id]);
      continue;
    }

    const empresaId = r.empresa_id || r.job_empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85'; // Default Luminous
    const defaultStageId = stage1ByEmpresa[empresaId] || null;

    // Verificar se o lead já existe na tabela de leads (unicidade global de e-mail)
    const existing = await c.query(`
      SELECT id, name, email, website, phone, tags 
      FROM core_comercial.leads 
      WHERE lower(TRIM(email)) = $1 
      LIMIT 1;
    `, [validEmail]);

    if (existing.rows.length > 0) {
      const existingLead = existing.rows[0];
      linkedExistingCount++;
      
      // Atualiza website/telefone se estiver faltando no lead
      await c.query(`
        UPDATE core_comercial.leads
        SET website = COALESCE(website, $1),
            phone = COALESCE(phone, $2),
            city = COALESCE(city, $3),
            province = COALESCE(province, $4),
            updated_at = NOW()
        WHERE id = $5;
      `, [r.website, r.phone, r.city, r.province, existingLead.id]);

      // Vincula na tabela de resultados
      await c.query(`
        UPDATE core_comercial.lead_prospecting_results
        SET status = 'imported', imported_lead_id = $1, updated_at = NOW()
        WHERE id = $2;
      `, [existingLead.id, r.id]);

    } else {
      // Inserir novo Lead no Funil
      const tags = ['Prospecção Autônoma B2B'];
      if (r.job_title) tags.push(r.job_title);
      if (r.company_size) tags.push(r.company_size);
      if (r.region) tags.push(r.region);

      const noteText = `Lead qualificado importado da Máquina de Leads - Missão: ${r.job_title || 'Geral'}. Localidade: ${r.city || ''}, ${r.province || ''}.`;

      try {
        const insertRes = await c.query(`
          INSERT INTO core_comercial.leads (
            empresa_id, name, company_name, email, phone, website,
            linkedin_url, instagram_url, address_line, city, province,
            region, company_size, sector, cargo, origen_lead,
            notes, tags, prospecting_job_id, stage_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, NOW(), NOW()
          ) RETURNING id;
        `, [
          empresaId,
          r.company_name || 'Responsável',
          r.company_name,
          validEmail,
          r.phone || null,
          r.website || null,
          r.linkedin_url || null,
          r.instagram_url || null,
          r.address || null,
          r.city || null,
          r.province || null,
          r.region || null,
          r.company_size || null,
          r.sector || null,
          'Diretoria / Compras',
          'prospeccao_b2b',
          noteText,
          tags,
          r.job_id || null,
          defaultStageId
        ]);

        const newLeadId = insertRes.rows[0]?.id;
        insertedCount++;

        await c.query(`
          UPDATE core_comercial.lead_prospecting_results
          SET status = 'imported', imported_lead_id = $1, updated_at = NOW()
          WHERE id = $2;
        `, [newLeadId, r.id]);
      } catch (insertErr) {
        console.warn(`Erro ao inserir lead ${validEmail}:`, insertErr.message);
      }
    }
  }

  console.log('\n=== CONVERSÃO DE PROSPECTS CONCLUÍDA ===');
  console.log(`Novos Leads Inseridos no Funil: ${insertedCount}`);
  console.log(`Prospects Vinculados a Leads Já Existentes: ${linkedExistingCount}`);
  console.log(`E-mails Inválidos Descartados: ${skippedInvalidCount}`);

  const totalLeadsNow = await c.query('SELECT count(*) FROM core_comercial.leads;');
  console.log(`Total Geral de Leads no Funil Agora: ${totalLeadsNow.rows[0].count}`);

  await c.end();
}

convertAllPendingProspects();
