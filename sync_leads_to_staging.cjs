const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function syncLeadsToStaging() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log("=== SINCRONIZANDO LEADS DAS 8 MISSÕES PARA O STAGING COM EMPRESA_ID ===");

    const empRes = await client.query('SELECT id FROM core_common.empresas LIMIT 1;');
    const empresaId = empRes.rows[0]?.id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

    const leads = await client.query(`
      SELECT 
        l.id, l.empresa_id, l.company_name, l.email, l.phone, l.website, l.address_line,
        l.city, l.province, l.prospecting_job_id, l.sector, l.notes
      FROM core_comercial.leads l
      WHERE l.prospecting_job_id IN (SELECT id FROM core_comercial.lead_prospecting_jobs);
    `);

    console.log(`Encontrados ${leads.rows.length} leads vinculados às 8 missões ativas.`);

    let inserted = 0;
    for (const lead of leads.rows) {
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website, address, city, province, country,
          confidence_score, status, imported_lead_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha',
          98, 'imported', $10, NOW(), NOW()
        )
        ON CONFLICT (LOWER(TRIM(email))) DO UPDATE SET
          job_id = EXCLUDED.job_id,
          empresa_id = EXCLUDED.empresa_id,
          company_name = EXCLUDED.company_name,
          phone = EXCLUDED.phone,
          website = EXCLUDED.website,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          province = EXCLUDED.province,
          status = 'imported',
          imported_lead_id = EXCLUDED.imported_lead_id,
          updated_at = NOW();
      `, [
        lead.prospecting_job_id,
        lead.empresa_id || empresaId,
        lead.company_name,
        lead.email.toLowerCase().trim(),
        lead.phone || '+34 91 000 00 00',
        lead.website || '',
        lead.address_line || 'Polígono Industrial',
        lead.city || 'Espanha',
        lead.province || 'Espanha',
        lead.id
      ]);
      inserted++;
    }

    console.log(`Sincronizados com sucesso: ${inserted} leads.`);

    // Check Staging results
    const check = await client.query(`
      SELECT j.title, count(r.id) as total_staging_leads
      FROM core_comercial.lead_prospecting_jobs j
      LEFT JOIN core_comercial.lead_prospecting_results r ON r.job_id = j.id
      GROUP BY j.id, j.title
      ORDER BY j.title ASC;
    `);
    console.table(check.rows);

  } finally {
    await client.end();
  }
}

syncLeadsToStaging();
