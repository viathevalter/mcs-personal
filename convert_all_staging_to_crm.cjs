require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function convertAllStagingToCrm() {
  console.log('==================================================================================');
  console.log('🚀 CONVERTENDO TODOS OS LEADS DE STAGING PARA O CRM (LEADS DE MARKETING)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const stagingRes = await client.query(`
    SELECT r.*, j.title as job_title, j.keywords
    FROM core_comercial.lead_prospecting_results r
    LEFT JOIN core_comercial.lead_prospecting_jobs j ON r.job_id = j.id
    WHERE r.email IS NOT NULL AND r.email != '';
  `);

  console.log(`Total em Staging para converter: ${stagingRes.rows.length} empresas.`);

  let inserted = 0;
  let updated = 0;

  for (const row of stagingRes.rows) {
    const email = row.email.toLowerCase().trim();
    const company = row.company_name || 'Empresa Industrial Espanha';
    const phone = row.phone || '';
    const website = row.website || '';
    const city = row.city || 'Espanha';
    const province = row.province || 'Espanha';
    const address = row.address || '';
    const sector = row.job_title?.replace(/^[^\w\s]+/, '').trim() || 'Industrial & Montagens';
    const notes = `Lead qualificado importado da Máquina de Leads - Missão: ${row.job_title || 'Geral'}. Localidade: ${city}, ${province}.`;
    const tags = ['Prospecção Autônoma B2B', sector];

    try {
      const existing = await client.query('SELECT id FROM core_comercial.leads WHERE LOWER(TRIM(email)) = $1 LIMIT 1;', [email]);

      if (existing.rows.length === 0) {
        await client.query(`
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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW());
        `, [
          row.empresa_id,
          company,
          company,
          email,
          phone,
          website,
          city,
          province,
          address,
          sector,
          'Diretoria / Compras',
          'prospeccao_b2b',
          notes,
          tags,
          row.job_id
        ]);
        inserted++;
      } else {
        await client.query(`
          UPDATE core_comercial.leads
          SET company_name = $1,
              phone = COALESCE(NULLIF(core_comercial.leads.phone, ''), $2),
              website = COALESCE(NULLIF(core_comercial.leads.website, ''), $3),
              sector = $4,
              updated_at = NOW()
          WHERE id = $5;
        `, [company, phone, website, sector, existing.rows[0].id]);
        updated++;
      }

      await client.query(`
        UPDATE core_comercial.lead_prospecting_results
        SET status = 'converted', updated_at = NOW()
        WHERE id = $1;
      `, [row.id]);
    } catch (err) {
      console.error(`Erro ao inserir ${email}:`, err.message);
    }
  }

  const finalCrmCount = await client.query('SELECT count(*) FROM core_comercial.leads;');
  const finalStagingCount = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');

  console.log(`\n🎉 CONVERSÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`✅ Novos leads inseridos no CRM: ${inserted}`);
  console.log(`✅ Leads atualizados no CRM: ${updated}`);
  console.log(`✅ Total de Leads consolidados no CRM (Leads de Marketing): ${finalCrmCount.rows[0].count}`);
  console.log(`✅ Leads em Staging: ${finalStagingCount.rows[0].count}`);

  await client.end();
}

convertAllStagingToCrm();
