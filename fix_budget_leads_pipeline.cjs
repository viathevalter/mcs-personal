require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const connUrl = process.env.VITE_PROD_SUPABASE_DB_URL.replace(':5432', ':6543');
const client = new Client({ connectionString: connUrl });

async function fix() {
  await client.connect();

  console.log("=== BUSCANDO TODOS OS LEADS COM SOLICITAÇÃO DE ORÇAMENTO NO CRM ===");

  // Buscar todos os leads com solicitação de orçamento
  const query = `
    SELECT l.id, l.name, l.company_name, l.email, l.phone, l.empresa_id, l.stage_id,
           s.name as current_stage_name, s.order_index as current_stage_index, s.empresa_id as stage_empresa_id,
           e.nome as empresa_nome
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    LEFT JOIN core_common.empresas e ON e.id = l.empresa_id
    WHERE l.notes ILIKE '%SOLICITUD DE PRESUPUESTO%'
       OR l.notes ILIKE '%SOLICITAÇÃO DE ORÇAMENTO%'
       OR l.notes ILIKE '%RICHIESTA DI PREVENTIVO%'
       OR l.notes ILIKE '%DEMANDE DE DEVIS%'
    ORDER BY l.updated_at DESC;
  `;

  const leadsRes = await client.query(query);
  console.log(`Encontrados ${leadsRes.rows.length} leads com solicitação de orçamento.\n`);

  for (const lead of leadsRes.rows) {
    console.log(`Lead: ${lead.company_name} (${lead.name || lead.email})`);
    console.log(`  - Empresa Lead: ${lead.empresa_nome} (${lead.empresa_id})`);
    console.log(`  - Estágio Atual: "${lead.current_stage_name}" (order_index: ${lead.current_stage_index}) [Stage ID: ${lead.stage_id}]`);

    // Descobrir o estágio 'Orçamento Solicitado / Presupuesto Solicitado' da empresa do lead
    const stageQuery = `
      SELECT id, name, order_index
      FROM core_comercial.kanban_stages
      WHERE empresa_id = $1
        AND (name ILIKE '%Orçamento Solicitado%' OR name ILIKE '%Presupuesto Solicitado%' OR order_index = 4 OR order_index = 5)
      ORDER BY CASE 
        WHEN name ILIKE '%Orçamento Solicitado%' OR name ILIKE '%Presupuesto Solicitado%' THEN 1 
        ELSE 2 
      END, order_index
      LIMIT 1;
    `;
    const targetStageRes = await client.query(stageQuery, [lead.empresa_id]);

    if (targetStageRes.rows.length > 0) {
      const targetStage = targetStageRes.rows[0];
      
      // Se o estágio atual for inferior a Orçamento Solicitado (ou pertencer a outra empresa)
      if (lead.current_stage_index < targetStage.order_index || lead.stage_id !== targetStage.id) {
        console.log(`  ➔ 🚀 MOVENDO PARA: "${targetStage.name}" (ID: ${targetStage.id}, order_index: ${targetStage.order_index})`);
        
        await client.query(`
          UPDATE core_comercial.leads
          SET stage_id = $1,
              updated_at = NOW()
          WHERE id = $2;
        `, [targetStage.id, lead.id]);
        console.log(`  ✅ Atualizado com sucesso!`);
      } else {
        console.log(`  ✔️ Já está no estágio correto ("${lead.current_stage_name}").`);
      }
    } else {
      console.warn(`  ⚠️ Não foi encontrado estágio de orçamento para empresa ${lead.empresa_id}`);
    }
    console.log('------------------------------------------------------------');
  }

  // Verificação final
  const finalCheck = await client.query(query);
  console.log("\n=== STATUS FINAL DE TODOS OS LEADS COM ORÇAMENTO ===");
  console.table(finalCheck.rows.map(r => ({
    Empresa: r.company_name,
    Contato: r.name,
    Email: r.email,
    Telefone: r.phone,
    Estágio: r.current_stage_name,
    Posição: r.current_stage_index,
    Empresa_CRM: r.empresa_nome
  })));

  await client.end();
}

fix().catch(console.error);
