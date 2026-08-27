require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function deleteQuarantinedLeads() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  console.log("🔍 Buscando os 406 leads com domínios inválidos/sem MX...");
  const targetLeads = await c.query(`
    SELECT id, email, company_name 
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Domínio Inválido / Sem MX' = ANY(tags);
  `, [empresaId]);

  console.log(`📊 Leads identificados para exclusão definitiva: ${targetLeads.rows.length}`);

  if (targetLeads.rows.length === 0) {
    console.log("Nenhum lead encontrado para exclusão.");
    await c.end();
    return;
  }

  const ids = targetLeads.rows.map(r => r.id);

  // 1. Limpar possíveis referências na fila de campanhas
  const delQueueRes = await c.query(`
    DELETE FROM core_comercial.marketing_campaign_queue 
    WHERE lead_id = ANY($1::uuid[]);
  `, [ids]);
  console.log(`🧹 Removidas ${delQueueRes.rowCount} entradas na fila de campanhas.`);

  // 2. Desvincular de lead_prospecting_results caso exista
  const updProspectingRes = await c.query(`
    UPDATE core_comercial.lead_prospecting_results 
    SET imported_lead_id = NULL 
    WHERE imported_lead_id = ANY($1::uuid[]);
  `, [ids]);
  console.log(`🧹 Desvinculados ${updProspectingRes.rowCount} resultados de prospecção.`);

  // 3. Excluir definitivamente da tabela core_comercial.leads
  const delLeadsRes = await c.query(`
    DELETE FROM core_comercial.leads 
    WHERE id = ANY($1::uuid[]);
  `, [ids]);

  console.log(`\n🗑️ SUCESSO! ${delLeadsRes.rowCount} leads com domínios inválidos foram EXCLUÍDOS DEFINITIVAMENTE da base de dados!`);

  // Total atualizado de leads no CRM
  const totalRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const mailingAlexRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1 AND 'Mailing Alex' = ANY(tags);", [empresaId]);
  
  console.log(`\n📊 Novo Total de Leads no CRM Luminous: ${totalRes.rows[0].count}`);
  console.log(`🎯 Total de Leads Ativos do Mailing Alex: ${mailingAlexRes.rows[0].count}`);

  await c.end();
}

deleteQuarantinedLeads();
