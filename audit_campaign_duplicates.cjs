const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function auditCampaignDuplicates() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== AUDITORIA COMPLETA DE DUPLICIDADES NA CAMPANHA ENVÍO 1 ===\n`);

    // 1. Audit Emails in Campaign Queue
    const queueAudit = await client.query(`
      SELECT 
        count(*) as total_emails_enviados,
        count(DISTINCT LOWER(TRIM(l.email))) as total_emails_unicos,
        count(DISTINCT LOWER(TRIM(l.company_name))) as total_empresas_unicas,
        count(DISTINCT LOWER(TRIM(l.phone))) as total_telefones_unicos
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.leads l ON q.lead_id = l.id
      WHERE q.campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4';
    `);
    console.log("1. Resultado da Campanha ENVÍO 1:");
    console.table(queueAudit.rows);

    // 2. Check for any duplicate emails in the campaign
    const dupesInCampaign = await client.query(`
      SELECT 
        LOWER(TRIM(l.email)) as email, 
        count(*) as ocorrencias
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.leads l ON q.lead_id = l.id
      WHERE q.campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4'
      GROUP BY LOWER(TRIM(l.email))
      HAVING count(*) > 1;
    `);
    console.log(`2. E-mails duplicados encontrados na campanha: ${dupesInCampaign.rows.length}`);
    if (dupesInCampaign.rows.length > 0) {
      console.table(dupesInCampaign.rows);
    }

    // 3. Audit entire core_comercial.leads table
    const leadsAudit = await client.query(`
      SELECT 
        count(*) as total_leads_crm,
        count(DISTINCT LOWER(TRIM(email))) as total_emails_unicos_crm,
        count(DISTINCT LOWER(TRIM(company_name))) as total_empresas_unicas_crm
      FROM core_comercial.leads;
    `);
    console.log("\n3. Auditoria de Toda a Tabela de Leads no CRM:");
    console.table(leadsAudit.rows);

    // 4. Check for any duplicate emails in the entire CRM
    const dupesInCrm = await client.query(`
      SELECT 
        LOWER(TRIM(email)) as email, 
        count(*) as ocorrencias
      FROM core_comercial.leads
      GROUP BY LOWER(TRIM(email))
      HAVING count(*) > 1;
    `);
    console.log(`4. E-mails duplicados encontrados em todo o CRM: ${dupesInCrm.rows.length}`);
    if (dupesInCrm.rows.length > 0) {
      console.table(dupesInCrm.rows);
    }

    // 5. Sample of 10 distinct leads in the campaign
    const sample = await client.query(`
      SELECT 
        l.company_name, 
        l.email, 
        l.phone, 
        l.city, 
        l.province, 
        l.sector
      FROM core_comercial.marketing_campaign_queue q
      JOIN core_comercial.leads l ON q.lead_id = l.id
      WHERE q.campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4'
      ORDER BY q.sent_at ASC
      LIMIT 8;
    `);
    console.log("\n5. Amostra de Leads Disparados na Campanha:");
    console.table(sample.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

auditCampaignDuplicates();
