require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function organizeKanban() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  const stage1Id = '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69'; // Novo / Sem Contato
  const stage8Id = 'e9c00a1a-eb96-4c18-be10-7c72e3f041f6'; // Perdido / Desvinculado

  // 1. Mover leads com Bounce / Inválido para 'Perdido / Desvinculado' (Estágio 8)
  const quarantineRes = await c.query(`
    UPDATE core_comercial.leads
    SET stage_id = $1, empresa_id = $2, updated_at = NOW()
    WHERE tags @> ARRAY['Bounce']::text[] 
       OR tags @> ARRAY['E-mail Inválido']::text[];
  `, [stage8Id, empresaId]);

  console.log(`Leads em Quarentena Movidos para 'Perdido / Desvinculado': ${quarantineRes.rowCount}`);

  // 2. Mover todos os outros leads limpos ativos para 'Novo / Sem Contato' (Estágio 1)
  // Preservando apenas os que estão em Orçamento Solicitado (Stage 4) ou Lido (Stage 3)
  const cleanLeadsRes = await c.query(`
    UPDATE core_comercial.leads
    SET stage_id = $1, empresa_id = $2, updated_at = NOW()
    WHERE stage_id NOT IN ('17b2da98-ba46-4600-8286-036960ac4afe', '445fdbe8-abaa-4b96-a411-db69a23d203e', $3)
      AND NOT (tags @> ARRAY['Bounce']::text[])
      AND NOT (tags @> ARRAY['E-mail Inválido']::text[]);
  `, [stage1Id, empresaId, stage8Id]);

  console.log(`Leads Limpos e Ativos Prontos em 'Novo / Sem Contato': ${cleanLeadsRes.rowCount}`);

  // 3. Auditoria do Kanban da Luminous
  const dist = await c.query(`
    SELECT s.order_index, s.name as stage_name, count(l.id) as total_leads
    FROM core_comercial.kanban_stages s
    LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
    WHERE s.empresa_id = $1
    GROUP BY s.order_index, s.name
    ORDER BY s.order_index ASC;
  `, [empresaId]);

  console.log('\n=== STATUS ATUAL DO KANBAN LUMINOUS ===');
  console.table(dist.rows);

  await c.end();
}

organizeKanban();
