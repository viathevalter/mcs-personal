require('dotenv').config({ path: '.env' });
const dns = require('dns').promises;
const { Client } = require('pg');

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 
  'outlook.com', 'outlook.es', 'icloud.com', 'live.com', 'msn.com',
  'telefonica.net', 'orange.es', 'movistar.es', 'terra.es', 'vodafone.es', 'ya.com'
]);

async function verifyMxAndEnrich() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  console.log("🔍 Buscando todos os leads da Luminous com a tag 'Mailing Alex'...");
  const res = await c.query(`
    SELECT id, email, company_name, website, tags, stage_id 
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Mailing Alex' = ANY(tags);
  `, [empresaId]);

  console.log(`📊 Total de leads do Mailing Alex no banco: ${res.rows.length}`);

  // Coletar todos os domínios únicos para não repetir consulta DNS
  const domainMap = new Map(); // domain -> { valid: boolean, mxRecords: any[], isPublic: boolean }

  for (const lead of res.rows) {
    if (!lead.email || !lead.email.includes('@')) continue;
    const domain = lead.email.split('@')[1].trim().toLowerCase();
    if (!domainMap.has(domain)) {
      domainMap.set(domain, null);
    }
  }

  console.log(`🌐 Total de domínios únicos para verificar no DNS global: ${domainMap.size}`);

  // Verificar MX em paralelo com concorrência controlada
  const domains = Array.from(domainMap.keys());
  let checked = 0;
  let validDomains = 0;
  let deadDomains = 0;

  const concurrency = 50;
  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    await Promise.all(batch.map(async (domain) => {
      if (PUBLIC_DOMAINS.has(domain)) {
        domainMap.set(domain, { valid: true, isPublic: true });
        validDomains++;
        return;
      }

      try {
        const mx = await dns.resolveMx(domain);
        if (mx && mx.length > 0) {
          domainMap.set(domain, { valid: true, mxRecords: mx, isPublic: false });
          validDomains++;
        } else {
          domainMap.set(domain, { valid: false, reason: 'Sem registros MX', isPublic: false });
          deadDomains++;
        }
      } catch (err) {
        // Tentar resolver A record se MX falhar
        try {
          const a = await dns.resolve4(domain);
          if (a && a.length > 0) {
            domainMap.set(domain, { valid: true, aRecords: a, isPublic: false });
            validDomains++;
          } else {
            domainMap.set(domain, { valid: false, reason: err.code || err.message, isPublic: false });
            deadDomains++;
          }
        } catch (err2) {
          domainMap.set(domain, { valid: false, reason: err.code || err.message, isPublic: false });
          deadDomains++;
        }
      }
    }));
    checked += batch.length;
    process.stdout.write(`\rVerificando MX de domínios: ${checked}/${domains.length} (Válidos: ${validDomains} | Inexistentes: ${deadDomains})...`);
  }

  console.log(`\n\n--- RESUMO DA VERIFICAÇÃO DNS MX ---`);
  console.log(`✅ Domínios 100% ativos e com servidores de e-mail (MX): ${validDomains}`);
  console.log(`❌ Domínios mortos / inexistentes / expirados: ${deadDomains}`);

  // Buscar ID do estágio "Perdido / Desvinculado"
  const stage8Res = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 8;", [empresaId]);
  const stage8Id = stage8Res.rows[0]?.id;

  let enrichedWebsites = 0;
  let quarantinedLeads = 0;

  for (const lead of res.rows) {
    if (!lead.email || !lead.email.includes('@')) continue;
    const domain = lead.email.split('@')[1].trim().toLowerCase();
    const info = domainMap.get(domain);

    if (!info || !info.valid) {
      // Quarentena imediata: Mover para estágio 8 e adicionar tag "Domínio Inválido / Sem MX"
      const reason = info?.reason || 'Domínio Inexistente';
      await c.query(`
        UPDATE core_comercial.leads 
        SET stage_id = $1, 
            tags = array_append(tags, 'Domínio Inválido / Sem MX'),
            notes = COALESCE(notes, '') || '\n[Quarentena DNS]: Domínio ${domain} inexistente ou sem servidor MX (${reason}).',
            updated_at = NOW()
        WHERE id = $2;
      `, [stage8Id, lead.id]);
      quarantinedLeads++;
    } else {
      // Domínio Válido: Enriquecer website se não for e-mail público e website estiver vazio
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

verifyMxAndEnrich();
