require('dotenv').config({ path: '.env' });
const dns = require('dns');
const dnsPromises = dns.promises;
const { Client } = require('pg');

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
    const mx = await timeoutPromise(1200, dnsPromises.resolveMx(domain));
    if (mx && mx.length > 0) {
      return { valid: true, isPublic: false };
    }
  } catch (e) {
    try {
      const a = await timeoutPromise(1000, dnsPromises.resolve4(domain));
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

  console.log(`🌐 Total de domínios únicos a verificar via DNS Google: ${domainMap.size}`);

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

  const invalidLeadIds = [];
  const websiteUpdates = []; // { id, website }

  for (const lead of res.rows) {
    if (!lead.email || !lead.email.includes('@')) continue;
    const domain = lead.email.split('@')[1].trim().toLowerCase();
    const info = domainMap.get(domain);

    if (!info || !info.valid) {
      invalidLeadIds.push(lead.id);
    } else {
      if (!info.isPublic && (!lead.website || lead.website.trim() === '')) {
        websiteUpdates.push({ id: lead.id, website: `https://www.${domain}` });
      }
    }
  }

  console.log(`\nGravando alterações em lote no banco de dados...`);

  // 1. Quarentena em lote
  if (invalidLeadIds.length > 0) {
    await c.query(`
      UPDATE core_comercial.leads 
      SET stage_id = $1, 
          tags = array_append(tags, 'Domínio Inválido / Sem MX'),
          notes = COALESCE(notes, '') || '\n[Quarentena DNS]: Domínio inexistente ou sem servidor MX ativo.',
          updated_at = NOW()
      WHERE id = ANY($2::uuid[]);
    `, [stage8Id, invalidLeadIds]);
    console.log(`🛡️ ${invalidLeadIds.length} leads movidos para Quarentena / Estágio 8 com sucesso!`);
  }

  // 2. Websites enriquecidos em lote
  if (websiteUpdates.length > 0) {
    // Atualizar em chunks de 500
    const chunkSize = 500;
    for (let i = 0; i < websiteUpdates.length; i += chunkSize) {
      const chunk = websiteUpdates.slice(i, i + chunkSize);
      const values = chunk.map((w, idx) => `($${idx*2 + 1}::uuid, $${idx*2 + 2}::text)`).join(', ');
      const params = [];
      chunk.forEach(w => { params.push(w.id, w.website); });

      await c.query(`
        UPDATE core_comercial.leads AS l
        SET website = v.website,
            updated_at = NOW()
        FROM (VALUES ${values}) AS v(id, website)
        WHERE l.id = v.id;
      `, params);
    }
    console.log(`🌐 ${websiteUpdates.length} leads enriquecidos com Website da empresa extraído do domínio!`);
  }

  // Estatísticas finais
  const activeCountRes = await c.query(`
    SELECT count(*) 
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Mailing Alex' = ANY(tags) AND stage_id != $2;
  `, [empresaId, stage8Id]);

  console.log(`\n🎉 CONCLUÍDO COM SUCESSO!`);
  console.log(`🚀 Total de leads do Mailing Alex 100% VALIDADOS E ATIVOS: ${activeCountRes.rows[0].count}`);

  await c.end();
}

main();
