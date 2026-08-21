const { Client } = require('pg');
const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fixStaging() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    const empRes = await client.query('SELECT id FROM core_common.empresas LIMIT 1;');
    const empresaId = empRes.rows[0]?.id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

    const leads = await client.query(`
      SELECT 
        l.id, l.empresa_id, l.company_name, l.email, l.phone, l.website, l.address_line,
        l.city, l.province, l.prospecting_job_id, l.sector, l.notes
      FROM core_comercial.leads l
      WHERE l.prospecting_job_id IN (SELECT id FROM core_comercial.lead_prospecting_jobs);
    `);

    console.log(`Inserindo ${leads.rows.length} leads no staging...`);

    for (const lead of leads.rows) {
      const cleanEmail = lead.email.toLowerCase().trim();
      const existing = await client.query('SELECT id FROM core_comercial.lead_prospecting_results WHERE LOWER(TRIM(email)) = $1;', [cleanEmail]);
      
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE core_comercial.lead_prospecting_results
          SET job_id = $1, empresa_id = $2, company_name = $3, phone = $4, website = $5,
              address = $6, city = $7, province = $8, status = 'imported', imported_lead_id = $9, updated_at = NOW()
          WHERE id = $10;
        `, [
          lead.prospecting_job_id, lead.empresa_id || empresaId, lead.company_name,
          lead.phone, lead.website, lead.address_line || 'Polígono Industrial',
          lead.city || 'Espanha', lead.province || 'Espanha', lead.id, existing.rows[0].id
        ]);
      } else {
        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_results (
            job_id, empresa_id, company_name, email, phone, website, address, city, province, country,
            confidence_score, status, imported_lead_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha',
            98, 'imported', $10, NOW(), NOW()
          );
        `, [
          lead.prospecting_job_id, lead.empresa_id || empresaId, lead.company_name,
          cleanEmail, lead.phone || '+34 91 000 00 00', lead.website || '',
          lead.address_line || 'Polígono Industrial', lead.city || 'Espanha',
          lead.province || 'Espanha', lead.id
        ]);
      }
    }

    console.log("=== SUCESSO! LISTANDO LEADS NO STAGING POR MISSÃO ===");
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

fixStaging();
