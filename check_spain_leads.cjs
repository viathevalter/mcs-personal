const { Client } = require('pg');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkSpainLeads() {
  const client = new Client({ connectionString: prodConn });
  await client.connect();

  console.log("=== 1. DISTRIBUIÇÃO DOS LEADS DA ESPANHA ===");
  const r1 = await client.query(`
    SELECT 
      count(*) as total_spain,
      count(*) FILTER (WHERE tags::text ILIKE '%Alex%' OR assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7' OR origen_lead ILIKE '%Alex%') as total_alex,
      count(*) FILTER (WHERE NOT (tags::text ILIKE '%Alex%' OR assigned_to = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7' OR origen_lead ILIKE '%Alex%')) as non_alex
    FROM core_comercial.leads
    WHERE (
      country_id = '2f487ab4-c7f5-4b70-9c37-995dc4cda125' 
      OR tags::text ILIKE '%Espanha%' 
      OR tags::text ILIKE '%Spain%'
      OR tags::text ILIKE '%ES%'
    );
  `);
  console.table(r1.rows);

  console.log("\n=== 2. ESTÁGIOS DOS LEADS NON-ALEX NA ESPANHA ===");
  const r2 = await client.query(`
    SELECT 
      COALESCE(s.name, 'Sem Estágio') as stage_name,
      count(l.id) as count
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
    GROUP BY stage_name
    ORDER BY count DESC;
  `);
  console.table(r2.rows);

  console.log("\n=== 3. ORIGENS / TAGS DOS LEADS NON-ALEX NA ESPANHA ===");
  const r3 = await client.query(`
    SELECT 
      origen_lead,
      count(*) as count
    FROM core_comercial.leads l
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
    GROUP BY origen_lead
    ORDER BY count DESC;
  `);
  console.table(r3.rows);

  console.log("\n=== 4. PROVÍNCIAS DOS LEADS NON-ALEX NA ESPANHA ===");
  const r4 = await client.query(`
    SELECT 
      COALESCE(NULLIF(province, ''), NULLIF(city, ''), 'Espanha Geral') as provincia,
      count(*) as count
    FROM core_comercial.leads l
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
    GROUP BY provincia
    ORDER BY count DESC
    LIMIT 20;
  `);
  console.table(r4.rows);

  console.log("\n=== 5. SETORES DOS LEADS NON-ALEX NA ESPANHA ===");
  const r5 = await client.query(`
    SELECT 
      COALESCE(NULLIF(sector, ''), 'Industrial Geral') as setor,
      count(*) as count
    FROM core_comercial.leads l
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
    GROUP BY setor
    ORDER BY count DESC;
  `);
  console.table(r5.rows);

  await client.end();
}

checkSpainLeads().catch(console.error);
