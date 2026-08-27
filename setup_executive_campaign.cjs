require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const executiveHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUMINOUS - Soluciones en Mano de Obra Industrial</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f6f9;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 28px 32px;
      border-bottom: 3px solid #f59e0b;
    }
    .header-tag {
      display: inline-block;
      background-color: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #334155;
    }
    .value-box {
      background-color: #f8fafc;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .value-box p {
      margin: 0;
      font-size: 13.5px;
      font-weight: 500;
      color: #1e293b;
    }
    .grid-profiles {
      margin: 24px 0;
    }
    .profile-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }
    .profile-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .profile-desc {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .benefits-badge-container {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    .benefit-cell {
      display: table-cell;
      width: 33.33%;
      text-align: center;
      padding: 10px;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .btn-container {
      margin: 28px 0 20px 0;
      text-align: center;
    }
    .btn-primary {
      display: inline-block;
      background-color: #f59e0b;
      color: #0f172a !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      margin: 6px;
    }
    .btn-whatsapp {
      display: inline-block;
      background-color: #25d366;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 26px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
      margin: 6px;
    }
    .signature {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .signature-title {
      font-size: 12.5px;
      color: #64748b;
    }
    .signature-contact {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      
      <!-- Header -->
      <div class="header">
        <div class="header-tag">Subcontratación Industrial B2B</div>
        <h1>LUMINOUS ALLEY · Soluciones de Mano de Obra</h1>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Estimado/a responsable de compras y producción de {{company_name}},</div>
        
        <p>Le contacto directamente porque sabemos que actualmente en España uno de los mayores cuellos de botella en obras y talleres industriales es <strong>la disponibilidad inmediata de profesionales técnicos homologados</strong> sin incurrir en costes fijos de contratación.</p>

        <div class="value-box">
          <p>⚡ <strong>Disponemos de brigadas y operarios cualificados listos para incorporación inmediata en cualquier provincia de España.</strong></p>
        </div>

        <p>En <strong>LUMINOUS</strong> asumimos la gestión integral del personal para que su empresa solo se preocupe del avance del proyecto:</p>

        <!-- Profiles -->
        <div class="grid-profiles">
          <div class="profile-item">
            <div class="profile-title">🔥 Soldadores Homologados (TIG, MIG-MAG, Electrodo 6G)</div>
            <div class="profile-desc">Especialistas en tubería inox, acero al carbono, recipientes a presión y estructuras pesadas.</div>
          </div>
          
          <div class="profile-item">
            <div class="profile-title">🚰 Tuberos Industriales e Instaladores Piping</div>
            <div class="profile-desc">Lectura e interpretación de planos isométricos, trazado, conformado y montajes en planta.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">⚙️ Caldereros, Montadores Mecánicos y Estructuristas</div>
            <div class="profile-desc">Fabricación, premontaje y ensamblaje de grandes estructuras y mantenimiento de plantas.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">⚡ Electricistas Industriales y Mecatrónicos</div>
            <div class="profile-desc">Cuadros de control, cableado de potencia, conexionado y puesta en marcha industrial.</div>
          </div>
        </div>

        <!-- All Inclusive Badge -->
        <p style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">¿Qué incluye nuestro servicio llave en mano?</p>
        <p style="font-size: 13px; color: #475569;">
          ✔️ <strong>Alojamiento y dietas</strong> 100% gestionados por Luminous.<br>
          ✔️ <strong>Vehículos de empresa</strong> y movilidad hasta la obra.<br>
          ✔️ <strong>EPIs certificados</strong>, PRL y reconocimientos médicos en regla.<br>
          ✔️ <strong>Flexibilidad total:</strong> Contratación por semanas, meses o duración de obra.
        </p>

        <!-- CTA Buttons -->
        <div class="btn-container">
          <a href="{{presupuesto_url}}" class="btn-primary">📋 Solicitar Presupuesto Online</a>
          <a href="{{whatsapp_url}}" class="btn-whatsapp">💬 Hablar por WhatsApp</a>
        </div>

        <p style="font-size: 12.5px; color: #64748b; text-align: center; margin-top: 10px;">
          <em>Respuesta y tarifa personalizada en menos de 2 horas.</em>
        </p>

        <!-- Signature -->
        <div class="signature">
          <div class="signature-name">Alex Carmona</div>
          <div class="signature-title">Departamento Comercial & Operaciones</div>
          <div class="signature-contact">
            <strong>LUMINOUS ALLEY, UNIPESSOAL LDA</strong><br>
            📞 Tel / WhatsApp: <a href="{{whatsapp_url}}" style="color: #f59e0b; text-decoration: none;">+34 645 56 74 01</a><br>
            ✉️ Email: comercial1@luminousalley.com<br>
            🌐 Web: <a href="https://luminousalley.com" style="color: #64748b; text-decoration: none;">www.luminousalley.com</a>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        Este mensaje es una propuesta comercial B2B dirigida a {{company_name}}.<br>
        Si no desea recibir más información sobre disponibilidad de personal, puede <a href="{{opt_out_url}}">darse de baja aquí</a>.
      </div>

    </div>
  </div>
</body>
</html>`;

async function setup() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== 1. CRIANDO/ATUALIZANDO TEMPLATE EXECUTIVO DE ALTA CONVERSÃO ===\n');

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  // Inserir ou atualizar template executivo
  const tmplTitle = 'Luminous Executivo - Alex Carmona (Alta Conversão)';
  const existTmpl = await c.query('SELECT id FROM core_comercial.marketing_templates WHERE empresa_id = $1 AND title = $2;', [empresaId, tmplTitle]);

  let templateId;
  if (existTmpl.rows.length > 0) {
    templateId = existTmpl.rows[0].id;
    await c.query(`
      UPDATE core_comercial.marketing_templates
      SET html_content = $1, subject = $2, updated_at = NOW()
      WHERE id = $3;
    `, [executiveHtml, 'Disponibilidad de Mano de Obra Técnica (Soldadores, Tuberos & Montadores) para {{company_name}}', templateId]);
    console.log(`Template atualizado com sucesso! ID: ${templateId}`);
  } else {
    const insertTmpl = await c.query(`
      INSERT INTO core_comercial.marketing_templates (
        empresa_id, title, subject, html_content, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id;
    `, [empresaId, tmplTitle, 'Disponibilidad de Mano de Obra Técnica (Soldadores, Tuberos & Montadores) para {{company_name}}', executiveHtml]);
    templateId = insertTmpl.rows[0].id;
    console.log(`Novo Template Executivo Criado com Sucesso! ID: ${templateId}`);
  }

  console.log('\n=== 2. RESETANDO CARDS NÃO INTERAGIDOS PARA "NOVO / SEM CONTATO" ===\n');

  // Buscar ID do estágio 1 (Novo / Sem Contato) da Luminous
  const stage1 = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1;", [empresaId]);
  const stage1Id = stage1.rows[0]?.id;

  // Buscar ID do estágio 2 (E-mail Enviado)
  const stage2 = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 2;", [empresaId]);
  const stage2Id = stage2.rows[0]?.id;

  // Mover todos os leads que estão em 'E-mail Enviado' (e que NÃO estão em Quarentena de Bounce) de volta para o Estágio 1
  const resetRes = await c.query(`
    UPDATE core_comercial.leads
    SET stage_id = $1, updated_at = NOW()
    WHERE empresa_id = $2 
      AND (stage_id = $3 OR stage_id IS NULL)
      AND NOT (tags @> ARRAY['Bounce']::text[])
      AND NOT (tags @> ARRAY['E-mail Inválido']::text[]);
  `, [stage1Id, empresaId, stage2Id]);

  console.log(`Total de Leads Limpos Movidos para 'Novo / Sem Contato': ${resetRes.rowCount}`);

  // Auditoria do Kanban da Luminous agora
  const dist = await c.query(`
    SELECT s.order_index, s.name as stage_name, count(l.id) as total_leads
    FROM core_comercial.kanban_stages s
    LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
    WHERE s.empresa_id = $1
    GROUP BY s.order_index, s.name
    ORDER BY s.order_index ASC;
  `, [empresaId]);

  console.log('\n=== STATUS ATUAL DO FUNIL DE VENDAS LUMINOUS ===');
  console.table(dist.rows);

  await c.end();
}

setup();
