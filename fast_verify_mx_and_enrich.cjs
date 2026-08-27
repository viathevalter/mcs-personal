require('dotenv').config({ path: '.env' });
const dns = require('dns');
const dnsPromises = dns.promises;
const { Client } = require('pg');

// Usar servidores DNS ultra-rápidos do Google e Cloudflare
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 
  'outlook.com', 'outlook.es', 'icloud.com', 'live.com', 'msn.com',
  'telefonica.net', 'orange.es', 'movistar.es', 'terra.es', 'vodafone.es', 'ya.com'
]);

function timeoutPromise(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function verifyDomain(domain) {
  if (PUBLIC_DOMAINS.has(domain)) {
    return { valid: true, isPublic: true };
  }

  try {
    const mx = await timeoutPromise(1500, dnsPromises.resolveMx(domain));
    if (mx && mx.length > 0) {
      return { valid: true, isPublic: false };
    }
  } catch (e) {
    // Se falhar MX, tenta A record
    try {
      const a = await timeoutPromise(1200, dnsPromises.resolve4(domain));
      if (a && a.length > 0) {
        return { valid: true, isPublic: false };
      }
    } catch (e2) {
      return { valid: false, reason: e.message || 'NXDOMAIN', isPublic: false };
    }
  }
  return { valid: false, reason: 'SEM_MX', isPublic: false };
}

async function main() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  console.log("🔍 Buscando todos os leads do Mailing Alex...");
  const res = await c.query(`
    SELECT id, email, company_name, website, tags, stage_id 
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Mailing Alex' = ANY(tags);
  `, [empresaId]);

  console.log(`📊 Total de leads encontrados: ${res.rows.length}`);

  const domainMap = new Map();
  for (const lead of res.rows) {
    if (!lead.email || !lead.email.includes('@')) continue;
    const domain = lead.email.split('@')[1].trim().toLowerCase();
    if (!domainMap.has(domain)) {
      domainMap.set(domain, null);
    }
  }

  console.log(`🌐 Total de domínios únicos a verificar via DNS Google (8.8.8.8): ${domainMap.size}`);

  const domains = Array.from(domainMap.keys());
  let checked = 0;
  let validCount = 0;
  let invalidCount = 0;

  const concurrency = 100;
  for (let i = 0; i < domains.length; i += concurrency) {
    const chunk = domains.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (domain) => {
      const result = await verifyDomain(domain);
      domainMap.set(domain, result);
      if (result.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }));
    checked += chunk.length;
    process.stdout.write(`\rProgresso DNS: ${checked}/${domains.length} (Válidos: ${validCount} | Inválidos/Mortos: ${invalidCount})...`);
  }

  console.log(`\n\n--- RESUMO DA VERIFICAÇÃO DNS MX ---`);
  console.log(`✅ Domínios 100% ativos com servidores de e-mail: ${validCount}`);
  console.log(`❌ Domínios inexistentes/desativados: ${invalidCount}`);

  // Buscar ID do estágio 8 "Perdido / Desvinculado"
  const stage8Res = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 8;", [empresaId]);
  const stage8Id = stage8Res.rows[0]?.id;

  let enrichedWebsites = 0;
  let quarantinedLeads = 0;

  for (const lead of res.rows) {
    if (!lead.email || !lead.email.includes('@')) continue;
    const domain = lead.email.split('@')[1].trim().toLowerCase();
    const info = domainMap.get(domain);

    if (!info || !info.valid) {
      await c.query(`
        UPDATE core_comercial.leads 
        SET stage_id = $1, 
            tags = array_append(tags, 'Domínio Inválido / Sem MX'),
            notes = COALESCE(notes, '') || '\n[Quarentena DNS]: Domínio ${domain} não possui servidor MX ativo.',
            updated_at = NOW()
        WHERE id = $2;
      `, [stage8Id, lead.id]);
      quarantinedLeads++;
    } else {
      if (!info.isPublic && (!lead.website || lead.website.trim() === '')) {
        const websiteUrl = `https://www.${domain}`;
        await c.query(`
          UPDATE core_comercial.leads 
          SET website = $1,
              updated_at = NOW()
          WHERE id = $2;
        `, [websiteUrl, lead.id]);
        enrichedWebsites++;
      }
    }
  }

  console.log('\n--- ATUALIZAÇÕES NO BANCO DE DADOS ---');
  console.log(`🌐 Leads enriquecidos com Website da empresa: ${enrichedWebsites}`);
  console.log(`🛡️ Leads movidos para Quarentena / Estágio 8 por domínio inexistente: ${quarantinedLeads}`);

  await c.end();
}

main();
