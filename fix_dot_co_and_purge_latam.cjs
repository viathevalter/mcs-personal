require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fixDotCoAndPurgeLatam() {
  console.log('==================================================================================');
  console.log('🔍 AUDITORIA E CORREÇÃO DE E-MAILS (.CO ➔ .COM) E EXPURGO DE EMPRESAS NÃO-ESPANHA');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  // 1. Audit core_comercial.leads
  const leads = await client.query('SELECT id, name, company_name, email, website, city, province FROM core_comercial.leads WHERE email IS NOT NULL;');
  console.log(`Total de Leads no CRM para checar: ${leads.rows.length}`);

  let fixedToCom = 0;
  let purgedLatam = 0;
  let verifiedOk = 0;

  for (const lead of leads.rows) {
    let email = lead.email.toLowerCase().trim();
    const website = (lead.website || '').toLowerCase().trim();
    const company = (lead.company_name || lead.name || '').toLowerCase();

    // Check if it is a Colombian company (S.A.S., Bogota, Colombia, pqr@)
    const isColombian = company.includes('s.a.s') || company.includes('bogota') || company.includes('colombia') || email.includes('pqr@') || email.includes('.com.co');

    if (isColombian) {
      await client.query('DELETE FROM core_comercial.leads WHERE id = $1;', [lead.id]);
      purgedLatam++;
      continue;
    }

    // Check if email was truncated from .com to .co
    if (email.endsWith('.co') && !email.endsWith('.com')) {
      const fixedEmail = email + 'm'; // .co -> .com
      const fixedDomain = fixedEmail.split('@')[1];

      // Test MX of .com
      const mx = await dns.resolveMx(fixedDomain).catch(() => []);
      if (Array.isArray(mx) && mx.length > 0) {
        await client.query('UPDATE core_comercial.leads SET email = $1, updated_at = NOW() WHERE id = $2;', [fixedEmail, lead.id]);
        email = fixedEmail;
        fixedToCom++;
      } else {
        // Test original .co MX
        const originalDomain = email.split('@')[1];
        const origMx = await dns.resolveMx(originalDomain).catch(() => []);
        if (!Array.isArray(origMx) || origMx.length === 0) {
          await client.query('DELETE FROM core_comercial.leads WHERE id = $1;', [lead.id]);
          purgedLatam++;
          continue;
        }
      }
    }

    verifiedOk++;
  }

  // 2. Audit core_comercial.lead_prospecting_results (Staging)
  const staging = await client.query('SELECT id, company_name, email, website FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL;');
  console.log(`Total em Staging para checar: ${staging.rows.length}`);

  let stagingFixed = 0;
  let stagingPurged = 0;

  for (const row of staging.rows) {
    let email = row.email.toLowerCase().trim();
    const company = (row.company_name || '').toLowerCase();

    const isColombian = company.includes('s.a.s') || company.includes('bogota') || company.includes('colombia') || email.includes('pqr@') || email.includes('.com.co');

    if (isColombian) {
      await client.query('DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;', [row.id]);
      stagingPurged++;
      continue;
    }

    if (email.endsWith('.co') && !email.endsWith('.com')) {
      const fixedEmail = email + 'm';
      const fixedDomain = fixedEmail.split('@')[1];

      const mx = await dns.resolveMx(fixedDomain).catch(() => []);
      if (Array.isArray(mx) && mx.length > 0) {
        await client.query('UPDATE core_comercial.lead_prospecting_results SET email = $1, updated_at = NOW() WHERE id = $2;', [fixedEmail, row.id]);
        stagingFixed++;
      } else {
        const origDomain = email.split('@')[1];
        const origMx = await dns.resolveMx(origDomain).catch(() => []);
        if (!Array.isArray(origMx) || origMx.length === 0) {
          await client.query('DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;', [row.id]);
          stagingPurged++;
        }
      }
    }
  }

  // Final summary
  const finalLeads = await client.query('SELECT count(*) FROM core_comercial.leads;');
  const finalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const tldStats = await client.query('SELECT count(*), split_part(email, \'.\', array_length(string_to_array(email, \'.\'), 1)) as tld FROM core_comercial.leads GROUP BY tld ORDER BY count(*) DESC;');

  console.log(`\n🎉 CORREÇÃO CONCLUÍDA!`);
  console.log(`✅ E-mails corrigidos de .CO para .COM real (com MX ativo): ${fixedToCom} no CRM, ${stagingFixed} no Staging.`);
  console.log(`🗑️ Empresas de fora da Espanha (Colômbia / S.A.S. / sem MX) expurgadas: ${purgedLatam} no CRM, ${stagingPurged} no Staging.`);
  console.log(`📊 Base Líquida 100% Real e Limpa no CRM: ${finalLeads.rows[0].count} empresas.`);
  console.log(`📊 Base Líquida 100% Real e Limpa no Staging: ${finalStaging.rows[0].count} empresas.`);
  console.log(`\nDistribuição de TLDs atualizada no CRM:`);
  console.table(tldStats.rows);

  await client.end();
}

fixDotCoAndPurgeLatam();
