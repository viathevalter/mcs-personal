const { Client } = require('pg');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function investigate() {
  const client = new Client({ connectionString: prodConn });
  await client.connect();

  console.log("=== 1. KANBAN STAGES ===");
  const stagesRes = await client.query('SELECT * FROM core_comercial.kanban_stages;');
  console.table(stagesRes.rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, is_default: r.is_default })));

  console.log("\n=== 2. TOTAL LEADS ESPANHA ===");
  const spainRes = await client.query(`
    SELECT count(*) as total_spain 
    FROM core_comercial.leads 
    WHERE (
      country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR tags::text ILIKE '%Espanha%' 
      OR tags::text ILIKE '%Spain%'
      OR tags::text ILIKE '%ES%'
    );
  `);
  console.log("Total leads Espanha:", spainRes.rows[0].total_spain);

  console.log("\n=== 3. LEADS DO ALEX (A EXCLUIR) ===");
  const alexRes = await client.query(`
    SELECT count(*) as total_alex 
    FROM core_comercial.leads 
    WHERE (
      tags::text ILIKE '%Alex%' 
      OR assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
      OR origen_lead ILIKE '%Alex%'
    );
  `);
  console.log("Total leads do Alex:", alexRes.rows[0].total_alex);

  console.log("\n=== 4. LEADS DISPONÍVEIS PARA A MICHELLE / TRIÂNGULO (ESPANHA, SEM ALEX, SEM PROPOSTA) ===");
  const availableRes = await client.query(`
    SELECT 
      count(*) as total_disponivel,
      count(DISTINCT email) as total_emails_unicos
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON l.stage_id = s.id
    WHERE (
      l.country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR l.tags::text ILIKE '%Espanha%' 
      OR l.tags::text ILIKE '%Spain%'
      OR l.tags::text ILIKE '%ES%'
    )
    AND NOT (
      l.tags::text ILIKE '%Alex%' 
      OR l.assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
      OR l.origen_lead ILIKE '%Alex%'
    )
    AND (
      s.name IS NULL 
      OR (
        s.name NOT ILIKE '%Proposta%' 
        AND s.name NOT ILIKE '%Presupuesto%' 
        AND s.name NOT ILIKE '%Negociação%' 
        AND s.name NOT ILIKE '%Negociacion%' 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Fechado%'
      )
    )
    AND l.email IS NOT NULL 
    AND l.email != '';
  `);
  console.table(availableRes.rows);

  console.log("\n=== 5. DISTRIBUIÇÃO DOS LEADS DA MICHELLE POR REGIÃO / PROVÍNCIA ===");
  const provRes = await client.query(`
    SELECT 
      COALESCE(NULLIF(province, ''), NULLIF(city, ''), 'Espanha Geral') as regiao,
      count(*) as count
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON l.stage_id = s.id
    WHERE (
      l.country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR l.tags::text ILIKE '%Espanha%' 
      OR l.tags::text ILIKE '%Spain%'
      OR l.tags::text ILIKE '%ES%'
    )
    AND NOT (
      l.tags::text ILIKE '%Alex%' 
      OR l.assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
      OR l.origen_lead ILIKE '%Alex%'
    )
    AND (
      s.name IS NULL 
      OR (
        s.name NOT ILIKE '%Proposta%' 
        AND s.name NOT ILIKE '%Presupuesto%' 
        AND s.name NOT ILIKE '%Negociação%' 
        AND s.name NOT ILIKE '%Negociacion%' 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Fechado%'
      )
    )
    AND l.email IS NOT NULL 
    AND l.email != ''
    GROUP BY regiao
    ORDER BY count DESC
    LIMIT 25;
  `);
  console.table(provRes.rows);

  console.log("\n=== 6. DISTRIBUIÇÃO DOS LEADS DA MICHELLE POR SETOR ===");
  const sectorRes = await client.query(`
    SELECT 
      COALESCE(NULLIF(sector, ''), 'Industrial Geral') as setor,
      count(*) as count
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON l.stage_id = s.id
    WHERE (
      l.country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR l.tags::text ILIKE '%Espanha%' 
      OR l.tags::text ILIKE '%Spain%'
      OR l.tags::text ILIKE '%ES%'
    )
    AND NOT (
      l.tags::text ILIKE '%Alex%' 
      OR l.assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
      OR l.origen_lead ILIKE '%Alex%'
    )
    AND (
      s.name IS NULL 
      OR (
        s.name NOT ILIKE '%Proposta%' 
        AND s.name NOT ILIKE '%Presupuesto%' 
        AND s.name NOT ILIKE '%Negociação%' 
        AND s.name NOT ILIKE '%Negociacion%' 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Fechado%'
      )
    )
    AND l.email IS NOT NULL 
    AND l.email != ''
    GROUP BY setor
    ORDER BY count DESC;
  `);
  console.table(sectorRes.rows);

  console.log("\n=== 7. TAGS PRINCIPAIS DOS LEADS DISPONÍVEIS ===");
  const tagsRes = await client.query(`
    SELECT unnest(tags) as tag, count(*) as count
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON l.stage_id = s.id
    WHERE (
      l.country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR l.tags::text ILIKE '%Espanha%' 
      OR l.tags::text ILIKE '%Spain%'
      OR l.tags::text ILIKE '%ES%'
    )
    AND NOT (
      l.tags::text ILIKE '%Alex%' 
      OR l.assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
      OR l.origen_lead ILIKE '%Alex%'
    )
    AND (
      s.name IS NULL 
      OR (
        s.name NOT ILIKE '%Proposta%' 
        AND s.name NOT ILIKE '%Presupuesto%' 
        AND s.name NOT ILIKE '%Negociação%' 
        AND s.name NOT ILIKE '%Negociacion%' 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Fechado%'
      )
    )
    AND l.email IS NOT NULL 
    AND l.email != ''
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 20;
  `);
  console.table(tagsRes.rows);

  await client.end();
}

investigate().catch(console.error);
