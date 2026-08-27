require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { Client } = require('pg');

function rescueEmailSyntax(raw) {
  if (!raw) return null;
  let email = raw.trim().toLowerCase();
  email = email.replace(/^mailto:/i, '');
  email = email.replace(/^[<"'\(\[\{]+|[>"'\)\]\}\.,;:]+$/g, '');

  if (/\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf|doc|docx)$/i.test(email)) {
    return { valid: false, reason: 'Arquivo de imagem/mídia capturado como e-mail' };
  }

  if (!email.includes('@')) {
    return { valid: false, reason: 'Sem arroba (@)' };
  }

  const [user, domain] = email.split('@');
  if (!user || !domain) {
    return { valid: false, reason: 'Usuário ou domínio vazio' };
  }

  let cleanDomain = domain;
  const tlds = ['com.es', 'nom.es', 'org.es', 'gob.es', 'edu.es', 'com', 'es', 'pt', 'it', 'fr', 'net', 'org', 'eu', 'cat', 'gal', 'eus', 'info', 'biz', 'co', 'io'];
  
  for (const tld of tlds) {
    const escaped = tld.replace('.', '\\.');
    const regex = new RegExp(`^(.+\\.${escaped})[a-z]{3,}$`, 'i');
    if (regex.test(cleanDomain)) {
      const match = cleanDomain.match(regex);
      if (match) {
        cleanDomain = match[1];
        break;
      }
    }
  }

  const rescuedEmail = `${user}@${cleanDomain}`.toLowerCase().trim();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(rescuedEmail)) {
    return { valid: false, reason: 'Formato inválido após higienização', email: rescuedEmail };
  }

  return { valid: true, email: rescuedEmail, wasModified: rescuedEmail !== raw.trim().toLowerCase() };
}

async function runFastClean() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== 1. HIGIENIZANDO E RESGATANDO SINTAXE DE E-MAILS ===');
  const leadsRes = await c.query('SELECT id, name, email, tags FROM core_comercial.leads WHERE email IS NOT NULL AND email != \'\';');
  const leads = leadsRes.rows;

  let rescued = 0;
  let invalid = 0;

  for (const lead of leads) {
    const res = rescueEmailSyntax(lead.email);
    if (!res.valid) {
      invalid++;
      const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
      if (!currentTags.includes('E-mail Inválido')) {
        currentTags.push('E-mail Inválido');
      }
      await c.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [currentTags, lead.id]);
    } else if (res.wasModified) {
      rescued++;
      console.log(`🔧 Resgatado: ${lead.email} ➔ ${res.email}`);
      await c.query('UPDATE core_comercial.leads SET email = $1, updated_at = NOW() WHERE id = $2;', [res.email, lead.id]);
    }
  }

  console.log(`\nSintaxe Resgatada/Corrigida: ${rescued}`);
  console.log(`E-mails Inválidos Marcados: ${invalid}`);

  console.log('\n=== 2. PROCESSANDO HISTÓRICO DE BOUNCES (CSV DA RESEND) ===');
  const csvPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\emails-sent-1787694135291.csv';
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    const bouncedSet = new Set();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 9) {
        const lastEvent = parts[8].trim().toLowerCase();
        const recipient = parts[4].trim().toLowerCase();
        if (lastEvent === 'bounced' || lastEvent === 'suppressed') {
          bouncedSet.add(recipient);
        }
      }
    }

    const bouncedList = Array.from(bouncedSet);
    console.log(`Total de e-mails únicos com Bounce na lista: ${bouncedList.length}`);

    // Batch update leads with tags
    const updateResult = await c.query(`
      UPDATE core_comercial.leads
      SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'Bounce'),
          notes = COALESCE(notes, '') || '\n[Resend: Caixa postal com erro de entrega (Bounce)]'
      WHERE lower(email) = ANY($1) 
        AND NOT (tags @> ARRAY['Bounce']::text[]);
    `, [bouncedList]);

    console.log(`Total de Leads no Banco Marcados com Tag 'Bounce': ${updateResult.rowCount}`);
  }

  console.log('\n=== 3. AUDITORIA DA BASE FINAL APÓS HIGIENIZAÇÃO ===');
  const audit = await c.query(`
    SELECT 
      count(*) as total_leads,
      count(*) FILTER (WHERE tags @> ARRAY['Bounce']::text[]) as total_bounces_isolados,
      count(*) FILTER (WHERE tags @> ARRAY['E-mail Inválido']::text[]) as total_invalidos_isolados,
      count(*) FILTER (WHERE NOT (tags @> ARRAY['Bounce']::text[]) AND NOT (tags @> ARRAY['E-mail Inválido']::text[])) as total_leads_limpos_ativos
    FROM core_comercial.leads;
  `);
  console.table(audit.rows);

  await c.end();
}

runFastClean();
