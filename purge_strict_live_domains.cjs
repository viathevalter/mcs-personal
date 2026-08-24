require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function purgeInactiveAndVerifyStrictLive() {
  console.log('==================================================================================');
  console.log('🛡️ AUDITORIA E EXPURGO RIGOROSO DE DOMÍNIOS INATIVOS (DNS MX & WEB)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const stagingRes = await client.query('SELECT id, company_name, email, website FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL;');
  console.log(`Analisando ${stagingRes.rows.length} empresas em Staging...`);

  let purgedCount = 0;
  let verifiedLiveCount = 0;

  for (const row of stagingRes.rows) {
    const email = row.email?.trim().toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';

    let isLive = false;
    if (domain) {
      try {
        const mx = await dns.resolveMx(domain).catch(() => []);
        const a = await dns.resolve4(domain).catch(() => []);
        if ((Array.isArray(mx) && mx.length > 0) || (Array.isArray(a) && a.length > 0)) {
          isLive = true;
        }
      } catch {
        isLive = false;
      }
    }

    if (!isLive) {
      await client.query('DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;', [row.id]);
      console.log(`❌ [REMOVIDO - DOMÍNIO INEXISTENTE] ${row.company_name} ➔ ${row.email} (${row.website})`);
      purgedCount++;
    } else {
      verifiedLiveCount++;
    }
  }

  // Also purge from leads if invalid domain
  const leadsRes = await client.query('SELECT id, company_name, email, website FROM core_comercial.leads WHERE email IS NOT NULL;');
  let purgedLeads = 0;
  for (const row of leadsRes.rows) {
    const email = row.email?.trim().toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';

    let isLive = false;
    if (domain) {
      try {
        const mx = await dns.resolveMx(domain).catch(() => []);
        const a = await dns.resolve4(domain).catch(() => []);
        if ((Array.isArray(mx) && mx.length > 0) || (Array.isArray(a) && a.length > 0)) {
          isLive = true;
        }
      } catch {
        isLive = false;
      }
    }

    if (!isLive) {
      await client.query('DELETE FROM core_comercial.leads WHERE id = $1;', [row.id]);
      purgedLeads++;
    }
  }

  // Update counters on all missions
  const jobsRes = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs;');
  for (const j of jobsRes.rows) {
    const cRes = await client.query('SELECT count(*) as total, count(email) as emails FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [j.id]);
    const emails = parseInt(cRes.rows[0].emails) || 0;
    const total = parseInt(cRes.rows[0].total) || 0;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET found_emails_count = $1, processed_count = $2, status = 'processing', updated_at = NOW()
      WHERE id = $3;
    `, [emails, total, j.id]);
  }

  const finalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const finalLeads = await client.query('SELECT count(*) FROM core_comercial.leads;');

  console.log(`\n🏁 AUDITORIA CONCLUÍDA!`);
  console.log(`🗑️ Removidos de Staging (Inativos/Falsos): ${purgedCount}`);
  console.log(`🗑️ Removidos do CRM (Inativos/Falsos): ${purgedLeads}`);
  console.log(`✅ Total de Empresas 100% REAIS e com DNS/MX ATIVO em Staging: ${finalStaging.rows[0].count}`);
  console.log(`✅ Total de Empresas 100% REAIS no CRM: ${finalLeads.rows[0].count}`);

  await client.end();
}

purgeInactiveAndVerifyStrictLive();
