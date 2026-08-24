require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fastConvertAllToCrm() {
  console.log('==================================================================================');
  console.log('⚡ CONVERSÃO ULTRA-RÁPIDA EM MASSA DE TODOS OS LEADS PARA O CRM');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const query = `
    INSERT INTO core_comercial.leads (
      empresa_id,
      name,
      company_name,
      email,
      phone,
      website,
      city,
      province,
      address_line,
      sector,
      cargo,
      origen_lead,
      notes,
      tags,
      prospecting_job_id,
      created_at,
      updated_at
    )
    SELECT DISTINCT ON (core_comercial.sanitize_email(r.email))
      r.empresa_id,
      SUBSTRING(COALESCE(r.company_name, 'Empresa Industrial'), 1, 250),
      SUBSTRING(COALESCE(r.company_name, 'Empresa Industrial'), 1, 250),
      SUBSTRING(core_comercial.sanitize_email(r.email), 1, 250),
      SUBSTRING(COALESCE(r.phone, ''), 1, 50),
      SUBSTRING(COALESCE(r.website, ''), 1, 250),
      SUBSTRING(COALESCE(r.city, 'Espanha'), 1, 100),
      SUBSTRING(COALESCE(r.province, 'Espanha'), 1, 100),
      SUBSTRING(COALESCE(r.address, ''), 1, 250),
      SUBSTRING(COALESCE(NULLIF(j.title, ''), 'Industrial & Montajes'), 1, 250),
      'Diretoria / Compras / Técnico',
      'prospeccao_b2b',
      'Lead qualificado importado da Máquina de Leads em ' || COALESCE(r.city, 'Espanha') || ', ' || COALESCE(r.province, 'Espanha') || '.',
      ARRAY['Prospecção Autônoma B2B', SUBSTRING(COALESCE(NULLIF(j.title, ''), 'Industrial'), 1, 100)],
      r.job_id,
      NOW(),
      NOW()
    FROM core_comercial.lead_prospecting_results r
    LEFT JOIN core_comercial.lead_prospecting_jobs j ON r.job_id = j.id
    WHERE r.email IS NOT NULL AND r.email != ''
    ON CONFLICT (lower(TRIM(BOTH FROM email))) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text)) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      phone = COALESCE(NULLIF(core_comercial.leads.phone, ''), EXCLUDED.phone),
      website = COALESCE(NULLIF(core_comercial.leads.website, ''), EXCLUDED.website),
      sector = EXCLUDED.sector,
      updated_at = NOW();
  `;

  const res = await client.query(query);
  console.log('✅ Batch SQL concluído com Sucesso! Linhas sincronizadas:', res.rowCount);

  await client.query("UPDATE core_comercial.lead_prospecting_results SET status = 'converted' WHERE email IS NOT NULL;");

  const crmCount = await client.query('SELECT count(*) FROM core_comercial.leads;');
  const stagingCount = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');

  console.log(`\n🎉 TOTAL ATUAL NO CRM (LEADS DE MARKETING): ${crmCount.rows[0].count} empresas.`);
  console.log(`📊 TOTAL EM STAGING: ${stagingCount.rows[0].count} empresas.\n`);

  await client.end();
}

fastConvertAllToCrm();
