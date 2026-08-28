require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Client } = require('pg');

const MAILING_DIR = 'C:\\Projetos IA\\Kotrik\\PowerApps\\Mailing';
const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

async function importComercial3Leads() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("=== 📥 IMPORTANDO LEADS AUDITADOS DO MAILING COMERCIAL 3 ===");

  // 1. Ler a planilha auditada
  const excelPath = path.join(MAILING_DIR, 'MAILING_COMERCIAL_3_AUDITADO_COMPLETO.xlsx');
  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log(`Linhas totais lidas da planilha: ${rows.length}`);

  // 2. Obter o estágio 1 "Novo / Sem Contato"
  const stage1Res = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1;", [empresaId]);
  const stage1Id = stage1Res.rows[0]?.id;

  // 3. Obter todos os e-mails já existentes no CRM
  const existingRes = await c.query("SELECT id, lower(trim(email)) as email, tags FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const existingMap = new Map();
  existingRes.rows.forEach(r => existingMap.set(r.email, r));

  let insertedCount = 0;
  let taggedExistingCount = 0;
  let skippedInvalid = 0;

  for (const r of rows) {
    if (r.Status_DNS_MX !== 'VÁLIDO (MX Ativo)') {
      skippedInvalid++;
      continue;
    }

    const email = String(r.Email).trim().toLowerCase();
    const company = String(r.Empresa || 'Empresa').trim();
    const website = r.Website && r.Website !== 'N/A (Provedor Público)' ? String(r.Website).trim() : null;

    if (existingMap.has(email)) {
      // Adicionar tag 'Comercial 3' se ainda não tiver
      const existing = existingMap.get(email);
      const tags = existing.tags || [];
      if (!tags.includes('Comercial 3')) {
        await c.query(`
          UPDATE core_comercial.leads 
          SET tags = array_append(tags, 'Comercial 3'),
              website = COALESCE(website, $1),
              updated_at = NOW()
          WHERE id = $2;
        `, [website, existing.id]);
        taggedExistingCount++;
      }
    } else {
      // Inserir novo lead
      const tags = ['Comercial 3', 'Mailing Comercial 3', 'Espanha'];
      const notes = `Lead importado da prospecção de arquivos EML (Comercial 3). Arquivos: ${r.Arquivos_Origem || 'EML'}.`;

      await c.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, website,
          country_id, tags, notes, origen_lead, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $3, $4, $5,
          '2f487ab4-c7f5-4b70-9c37-995dc4cda125'::uuid, $6, $7, 'mailing_comercial_3', NOW(), NOW()
        );
      `, [
        empresaId, stage1Id, company, email, website, tags, notes
      ]);
      insertedCount++;
    }
  }

  console.log(`\n🎉 RESULTADO DA IMPORTAÇÃO NO BANCO DE DADOS:`);
  console.log(`✅ Novos Leads Inseridos com Sucesso no Estágio 1: ${insertedCount}`);
  console.log(`🏷️ Leads já existentes Tagueados com 'Comercial 3': ${taggedExistingCount}`);
  console.log(`🚫 Descartados por DNS Inválido/Sem MX: ${skippedInvalid}`);

  const totalCRMRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const totalComercial3Res = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1 AND 'Comercial 3' = ANY(tags);", [empresaId]);

  console.log(`\n📊 Novo Total de Leads da Luminous: ${totalCRMRes.rows[0].count}`);
  console.log(`🎯 Total de Leads Tagueados com 'Comercial 3': ${totalComercial3Res.rows[0].count}`);

  await c.end();
}

importComercial3Leads();
