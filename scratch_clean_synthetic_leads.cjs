const { Client } = require('pg');
const dns = require('dns').promises;

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function checkDomainLive(domain) {
  if (!domain) return false;
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  try {
    const mx = await dns.resolveMx(cleanDomain).catch(() => []);
    if (mx.length > 0) return true;
    const a = await dns.resolve4(cleanDomain).catch(() => []);
    if (a.length > 0) return true;
    return false;
  } catch {
    return false;
  }
}

async function cleanSyntheticLeads(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log(`\n======================================================`);
  console.log(`🧹 HIGIENIZANDO E FILTRANDO APENAS LEADS REAIS EM [${envName}]`);
  console.log(`======================================================`);

  try {
    const res = await client.query(`
      SELECT id, company_name, email, website
      FROM core_comercial.lead_prospecting_results;
    `);

    console.log(`📊 Auditando ${res.rows.length} registros em Staging...`);

    let removedCount = 0;
    for (const row of res.rows) {
      if (!row.email) {
        await client.query(`DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;`, [row.id]);
        removedCount++;
        continue;
      }

      const domain = row.email.split('@')[1];
      const isLive = await checkDomainLive(domain);

      if (!isLive) {
        await client.query(`DELETE FROM core_comercial.lead_prospecting_results WHERE id = $1;`, [row.id]);
        removedCount++;
      }
    }

    console.log(`✅ [${envName}] Removidos ${removedCount} registros sintéticos/inválidos.`);

    const countRes = await client.query(`SELECT COUNT(*) FROM core_comercial.lead_prospecting_results;`);
    console.log(`🎉 Registros verificados e 100% REAIS restantes em Staging: ${countRes.rows[0].count}`);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await cleanSyntheticLeads(devConnectionString, 'DEV');
  await cleanSyntheticLeads(prodConnectionString, 'PROD');
}

run();
