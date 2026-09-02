const { Client } = require('pg');

const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function syncAll() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });

  await clientDev.connect();
  await clientProd.connect();

  console.log("==========================================================");
  console.log("🚀 INICIANDO SINCRONIZAÇÃO TOTAL DO BANCO DE DADOS DEV");
  console.log("==========================================================");

  // 1. DDL: Adicionar colunas e tabelas faltantes no DEV
  console.log("\n📦 1. Aplicando DDL no banco DEV...");
  
  await clientDev.query(`
    -- core_comercial
    ALTER TABLE core_comercial.kanban_stages ADD COLUMN IF NOT EXISTS name_es text;
    ALTER TABLE core_comercial.lead_prospecting_results ADD COLUMN IF NOT EXISTS company_size text;
    ALTER TABLE core_comercial.lead_prospecting_results ADD COLUMN IF NOT EXISTS region text;
    ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS assigned_to uuid;
    ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS company_size text;
    ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS region text;
    ALTER TABLE core_comercial.marketing_campaign_queue ADD COLUMN IF NOT EXISTS resend_email_id text;
    ALTER TABLE core_comercial.marketing_campaigns ADD COLUMN IF NOT EXISTS assigned_to uuid;

    -- core_personal
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS data_pagamento date;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS metodo_pagamento text;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS observacao_pagamento text;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS pago_por uuid;
    ALTER TABLE core_personal.worker_ibans ADD COLUMN IF NOT EXISTS autorizacao_url text;
    ALTER TABLE core_personal.worker_ibans ADD COLUMN IF NOT EXISTS certificado_url text;

    -- Tabela worker_alocacoes_history se não existir
    CREATE TABLE IF NOT EXISTS core_personal.worker_alocacoes_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id uuid,
      cod_colab text,
      contratado_id bigint,
      cod_servico text,
      tipo_servico text,
      status_servico text,
      data_inicio text,
      data_fim text,
      tarifa_acordada_trab text,
      cliente_nome text,
      cliente_local text,
      data_alocacao timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );
  `);
  console.log("✅ DDL aplicado com sucesso no DEV!");

  // 2. Sincronizar kanban_stages do PROD para o DEV
  console.log("\n🔄 2. Sincronizando core_comercial.kanban_stages...");
  const prodStages = await clientProd.query(`SELECT * FROM core_comercial.kanban_stages ORDER BY empresa_id, order_index;`);
  
  for (const s of prodStages.rows) {
    await clientDev.query(`
      INSERT INTO core_comercial.kanban_stages (id, empresa_id, name, name_es, color, order_index, is_system, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        name_es = EXCLUDED.name_es,
        color = EXCLUDED.color,
        order_index = EXCLUDED.order_index,
        empresa_id = EXCLUDED.empresa_id,
        is_system = EXCLUDED.is_system,
        updated_at = EXCLUDED.updated_at;
    `, [s.id, s.empresa_id, s.name, s.name_es, s.color, s.order_index, s.is_system, s.created_at, s.updated_at]);
  }
  console.log(`✅ ${prodStages.rows.length} estágios kanban sincronizados no DEV!`);

  // 3. Sincronizar marketing_templates e marketing_campaigns
  console.log("\n🔄 3. Sincronizando templates e campanhas de marketing...");
  const prodMktTemplates = await clientProd.query(`SELECT * FROM core_comercial.marketing_templates;`).catch(() => ({ rows: [] }));
  for (const t of prodMktTemplates.rows) {
    await clientDev.query(`
      INSERT INTO core_comercial.marketing_templates (id, empresa_id, title, subject, body_html, target_segment, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        body_html = EXCLUDED.body_html,
        target_segment = EXCLUDED.target_segment,
        updated_at = EXCLUDED.updated_at;
    `, [t.id, t.empresa_id, t.title, t.subject, t.body_html, t.target_segment, t.created_at, t.updated_at, t.created_by, t.updated_by]);
  }

  const prodCampaigns = await clientProd.query(`SELECT * FROM core_comercial.marketing_campaigns;`).catch(() => ({ rows: [] }));
  for (const c of prodCampaigns.rows) {
    await clientDev.query(`
      INSERT INTO core_comercial.marketing_campaigns (id, empresa_id, template_id, title, status, scheduled_at, created_at, updated_at, created_by, updated_by, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        scheduled_at = EXCLUDED.scheduled_at,
        assigned_to = EXCLUDED.assigned_to,
        updated_at = EXCLUDED.updated_at;
    `, [c.id, c.empresa_id, c.template_id, c.title, c.status, c.scheduled_at, c.created_at, c.updated_at, c.created_by, c.updated_by, c.assigned_to]);
  }
  console.log(`✅ Campanhas e Templates sincronizados!`);

  // 4. Sincronizar core_comercial.leads de PROD para DEV
  console.log("\n🔄 4. Sincronizando todos os leads de PROD para DEV...");
  const prodLeads = await clientProd.query(`
    SELECT id, empresa_id, stage_id, name, company_name, email, phone, website,
           city, province, region, address_line, postal_code, sector, cargo,
           company_size, origen_lead, notes, tags, client_id, legal_name, tax_id,
           billing_email, country_id, region_id, payment_term_id, prospecting_job_id,
           assigned_to, created_at, updated_at
    FROM core_comercial.leads;
  `);

  console.log(`📦 Carregados ${prodLeads.rows.length} leads de PROD. Gravando no DEV em lotes...`);

  const BATCH_SIZE = 400;
  for (let i = 0; i < prodLeads.rows.length; i += BATCH_SIZE) {
    const chunk = prodLeads.rows.slice(i, i + BATCH_SIZE);
    
    // Upsert em lote
    const valueTuples = [];
    const params = [];
    let pIdx = 1;

    for (const l of chunk) {
      valueTuples.push(`(
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}
      )`);

      params.push(
        l.id, l.empresa_id, l.stage_id, l.name, l.company_name, l.email, l.phone, l.website,
        l.city, l.province, l.region, l.address_line, l.postal_code, l.sector, l.cargo,
        l.company_size, l.origen_lead, l.notes, l.tags, l.client_id, l.legal_name, l.tax_id,
        l.billing_email, l.country_id, l.region_id, l.payment_term_id, l.prospecting_job_id,
        l.assigned_to, l.created_at, l.updated_at
      );
    }

    const upsertSql = `
      INSERT INTO core_comercial.leads (
        id, empresa_id, stage_id, name, company_name, email, phone, website,
        city, province, region, address_line, postal_code, sector, cargo,
        company_size, origen_lead, notes, tags, client_id, legal_name, tax_id,
        billing_email, country_id, region_id, payment_term_id, prospecting_job_id,
        assigned_to, created_at, updated_at
      ) VALUES ${valueTuples.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        empresa_id = EXCLUDED.empresa_id,
        stage_id = EXCLUDED.stage_id,
        name = EXCLUDED.name,
        company_name = EXCLUDED.company_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        region = EXCLUDED.region,
        address_line = EXCLUDED.address_line,
        postal_code = EXCLUDED.postal_code,
        sector = EXCLUDED.sector,
        cargo = EXCLUDED.cargo,
        company_size = EXCLUDED.company_size,
        origen_lead = EXCLUDED.origen_lead,
        notes = EXCLUDED.notes,
        tags = EXCLUDED.tags,
        client_id = EXCLUDED.client_id,
        legal_name = EXCLUDED.legal_name,
        tax_id = EXCLUDED.tax_id,
        billing_email = EXCLUDED.billing_email,
        country_id = EXCLUDED.country_id,
        region_id = EXCLUDED.region_id,
        payment_term_id = EXCLUDED.payment_term_id,
        prospecting_job_id = EXCLUDED.prospecting_job_id,
        assigned_to = EXCLUDED.assigned_to,
        updated_at = EXCLUDED.updated_at;
    `;

    await clientDev.query(upsertSql, params);
    process.stdout.write(`Progresso DEV Leads: ${Math.min(i + BATCH_SIZE, prodLeads.rows.length)}/${prodLeads.rows.length} leads gravados...\r`);
  }

  console.log(`\n✅ 4. Todos os ${prodLeads.rows.length} leads sincronizados com sucesso no DEV!`);

  // Verificação final
  const devCount = await clientDev.query('SELECT count(*) FROM core_comercial.leads;');
  const prodCount = await clientProd.query('SELECT count(*) FROM core_comercial.leads;');

  console.log("\n==========================================================");
  console.log(`🎉 SINCRONIZAÇÃO DEV CONCLUÍDA COM SUCESSO!`);
  console.log(`📊 Leads em DEV: ${devCount.rows[0].count} | Leads em PROD: ${prodCount.rows[0].count}`);
  console.log("==========================================================");

  await clientDev.end();
  await clientProd.end();
}

syncAll().catch(console.error);
