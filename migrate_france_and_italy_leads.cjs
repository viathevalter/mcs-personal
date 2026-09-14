require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const WISEOWE_EMPRESA_ID = 'dae64d51-2181-4510-b14f-e63d2f111a8e';
const WISEOWE_STAGE_ID = '048f4587-f416-4fc2-b3c9-09c42347df95'; // Novo / Sem Contato (Wiseowe)

const TRIANGULO_EMPRESA_ID = 'a798620a-358a-4c6c-9db2-3a507c583cac';
const TRIANGULO_STAGE_ID = '194d24b4-8e2c-4778-9200-639263e6de77'; // Novo / Sem Contato (Triângulo)
const GIADA_USER_ID = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65'; // Giada
const MICHELLE_USER_ID = 'dbc361a1-e4af-446a-8079-39c0caab00d2'; // Mitchelle

async function migrate() {
  console.log('================================================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO E UNIFICAÇÃO: FRANÇA (WISEOWE) & ITÁLIA (TRIÂNGULO/GIADA)');
  console.log('================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();
  console.log('Conectado ao Supabase PostgreSQL.\n');

  // -------------------------------------------------------------------------
  // PARTE 1: UNIFICAÇÃO DA FRANÇA NA WISEOWE
  // -------------------------------------------------------------------------
  console.log('--- PARTE 1: Migrando todos os leads da França para a Wiseowe ---');

  // Identificar leads da França que não estão na Wiseowe
  const checkFr = await client.query(`
    SELECT count(1) as total 
    FROM core_comercial.leads 
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags) OR email LIKE '%.fr' OR phone LIKE '+33%')
      AND empresa_id != $1;
  `, [WISEOWE_EMPRESA_ID]);
  console.log(`Leads da França fora da Wiseowe encontrados: ${checkFr.rows[0].total}`);

  // Migrar leads da França para Wiseowe
  const migrateFr = await client.query(`
    UPDATE core_comercial.leads 
    SET 
      empresa_id = $1,
      stage_id = COALESCE(
        CASE 
          WHEN stage_id IN (SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1) THEN stage_id 
          ELSE NULL 
        END, 
        $2
      ),
      region = 'França',
      country_id = NULL,
      tags = array_cat(
        ARRAY(SELECT unnest(tags) EXCEPT SELECT unnest(ARRAY['Luminous', 'Alex Carmona', 'Mailing Alex'])),
        ARRAY['🇫🇷 França']
      ),
      updated_at = NOW()
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags) OR email LIKE '%.fr' OR phone LIKE '+33%')
      AND empresa_id != $1
    RETURNING id;
  `, [WISEOWE_EMPRESA_ID, WISEOWE_STAGE_ID]);
  console.log(`✅ ${migrateFr.rows.length} leads franceses migrados com sucesso para a Wiseowe!`);

  // Verificar total consolidado da Wiseowe
  const totalWise = await client.query(`
    SELECT count(1) as total 
    FROM core_comercial.leads 
    WHERE empresa_id = $1;
  `, [WISEOWE_EMPRESA_ID]);
  console.log(`🎯 Total consolidado de leads na Wiseowe: ${totalWise.rows[0].total}`);

  const wiseStages = await client.query(`
    SELECT s.name, count(1) as total 
    FROM core_comercial.leads l 
    LEFT JOIN core_comercial.kanban_stages s ON l.stage_id = s.id 
    WHERE l.empresa_id = $1 
    GROUP BY s.name;
  `, [WISEOWE_EMPRESA_ID]);
  console.log('Distribuição por etapas na Wiseowe:', wiseStages.rows);

  // -------------------------------------------------------------------------
  // PARTE 2: ATRIBUIÇÃO E MIGRAÇÃO DA ITÁLIA NA TRIÂNGULO (GIADA)
  // -------------------------------------------------------------------------
  console.log('\n--- PARTE 2: Migrando todos os leads da Itália para a Triângulo (Giada) ---');

  // Migrar leads da Itália para Triângulo com assigned_to = Giada
  const migrateIt = await client.query(`
    UPDATE core_comercial.leads 
    SET 
      empresa_id = $1,
      assigned_to = $2,
      stage_id = COALESCE(
        CASE 
          WHEN stage_id IN (SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1) THEN stage_id 
          ELSE NULL 
        END, 
        $3
      ),
      region = 'Itália',
      country_id = NULL,
      tags = array_cat(
        ARRAY(SELECT unnest(tags) EXCEPT SELECT unnest(ARRAY['Luminous', 'Alex Carmona', 'Mailing Alex'])),
        ARRAY['🇮🇹 Itália', 'Itália', 'Giada', 'Mailing Giada']
      ),
      updated_at = NOW()
    WHERE (region = 'Itália' OR '🇮🇹 Itália' = ANY(tags) OR email LIKE '%.it' OR phone LIKE '+39%')
    RETURNING id;
  `, [TRIANGULO_EMPRESA_ID, GIADA_USER_ID, TRIANGULO_STAGE_ID]);
  console.log(`✅ ${migrateIt.rows.length} leads italianos migrados para a Triângulo e atribuídos à Giada!`);

  // Garantir que os leads de Espanha na Triângulo estejam atribuídos à Michelle
  const updateMichelle = await client.query(`
    UPDATE core_comercial.leads 
    SET 
      assigned_to = $1,
      tags = array_append(tags, 'Michelle')
    WHERE empresa_id = $2 
      AND (region = 'Espanha' OR '🇪🇸 Espanha' = ANY(tags) OR email LIKE '%.es' OR phone LIKE '+34%')
      AND (assigned_to IS NULL OR assigned_to = $1)
      AND NOT ('Michelle' = ANY(tags))
    RETURNING id;
  `, [MICHELLE_USER_ID, TRIANGULO_EMPRESA_ID]);
  console.log(`✅ ${updateMichelle.rows.length} leads espanhóis na Triângulo tagueados para Michelle.`);

  // Verificar distribuição na Triângulo
  const triBreakdown = await client.query(`
    SELECT 
      CASE 
        WHEN assigned_to = $1 THEN 'Giada (Itália)'
        WHEN assigned_to = $2 THEN 'Michelle (Espanha)'
        ELSE 'Outros'
      END as comercial,
      count(1) as total
    FROM core_comercial.leads 
    WHERE empresa_id = $3 
    GROUP BY 1;
  `, [GIADA_USER_ID, MICHELLE_USER_ID, TRIANGULO_EMPRESA_ID]);
  console.log('Distribuição de leads na Triângulo por Comercial:', triBreakdown.rows);

  console.log('\n================================================================================');
  console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO NO BANCO DE DADOS!');
  console.log('================================================================================');

  await client.end();
}

migrate().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
