require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Client } = require('pg');

const MAILING_DIR = 'C:\\Projetos IA\\Kotrik\\PowerApps\\Mailing';
const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
const spainCountryId = '2f487ab4-c7f5-4b70-9c37-995dc4cda125';

async function fastBatchImport() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("=== ⚡ IMPORTAÇÃO ULTRA-RÁPIDA EM LOTE (COMERCIAL 3) ===");

  const excelPath = path.join(MAILING_DIR, 'MAILING_COMERCIAL_3_AUDITADO_COMPLETO.xlsx');
  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const stage1Res = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1;", [empresaId]);
  const stage1Id = stage1Res.rows[0]?.id;

  const existingRes = await c.query("SELECT id, lower(trim(email)) as email, tags FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const existingMap = new Map();
  existingRes.rows.forEach(r => existingMap.set(r.email, r));

  const newLeadsToInsert = [];
  const leadsToTagIds = [];

  for (const r of rows) {
    if (r.Status_DNS_MX !== 'VÁLIDO (MX Ativo)') continue;

    const email = String(r.Email).trim().toLowerCase();
    const company = String(r.Empresa || 'Empresa Industrial').trim();
    const website = r.Website && r.Website !== 'N/A (Provedor Público)' ? String(r.Website).trim() : null;

    if (existingMap.has(email)) {
      const existing = existingMap.get(email);
      const tags = existing.tags || [];
      if (!tags.includes('Comercial 3')) {
        leadsToTagIds.push(existing.id);
      }
    } else {
      existingMap.set(email, { id: null }); // Previne duplicata interna
      newLeadsToInsert.push({
        name: company,
        company_name: company,
        email: email,
        website: website,
        notes: `Lead importado da prospecção de arquivos EML (Comercial 3). Arquivos: ${r.Arquivos_Origem || 'EML'}.`
      });
    }
  }

  console.log(`📊 Total de novos leads para inserir: ${newLeadsToInsert.length}`);
  console.log(`🏷️ Total de leads existentes para taguear: ${leadsToTagIds.length}`);

  // 1. Tagging em lote
  if (leadsToTagIds.length > 0) {
    await c.query(`
      UPDATE core_comercial.leads 
      SET tags = array_append(tags, 'Comercial 3'),
          updated_at = NOW()
      WHERE id = ANY($1::uuid[]) AND NOT ('Comercial 3' = ANY(tags));
    `, [leadsToTagIds]);
    console.log(`✅ ${leadsToTagIds.length} leads existentes tagueados com 'Comercial 3'!`);
  }

  // 2. Inserção em lote (chunks de 400)
  const chunkSize = 400;
  let inserted = 0;

  for (let i = 0; i < newLeadsToInsert.length; i += chunkSize) {
    const chunk = newLeadsToInsert.slice(i, i + chunkSize);
    const valueClauses = [];
    const params = [empresaId, stage1Id, spainCountryId];

    chunk.forEach((l, idx) => {
      const baseIdx = params.length + 1;
      params.push(l.name, l.company_name, l.email, l.website, l.notes);
      valueClauses.push(`($1::uuid, $2::uuid, $${baseIdx}, $${baseIdx+1}, $${baseIdx+2}, $${baseIdx+3}, $3::uuid, ARRAY['Comercial 3', 'Mailing Comercial 3', 'Espanha']::text[], $${baseIdx+4}, 'mailing_comercial_3', NOW(), NOW())`);
    });

    const sql = `
      INSERT INTO core_comercial.leads (
        empresa_id, stage_id, name, company_name, email, website,
        country_id, tags, notes, origen_lead, created_at, updated_at
      ) VALUES ${valueClauses.join(', ')};
    `;

    await c.query(sql, params);
    inserted += chunk.length;
    console.log(`Progresso inserção: ${inserted}/${newLeadsToInsert.length}...`);
  }

  // Estatísticas finais
  const totalCRMRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const totalComercial3Res = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1 AND 'Comercial 3' = ANY(tags);", [empresaId]);

  console.log(`\n🎉 CONCLUÍDO COM SUCESSO!`);
  console.log(`📊 Novo Total Geral de Leads no CRM Luminous: ${totalCRMRes.rows[0].count}`);
  console.log(`🎯 Total de Leads Ativos do 'Comercial 3': ${totalComercial3Res.rows[0].count}`);

  await c.end();
}

fastBatchImport();
