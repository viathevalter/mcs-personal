require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const logoUrl = 'https://mcs.gestaologinpro.com/luminous-logo-official-2026.png';

const executiveHtmlWithNewLogo = `<!DOCTYPE html>
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
      padding: 26px 32px;
      border-bottom: 3px solid #f59e0b;
      text-align: left;
    }
    .header-logo {
      height: 46px;
      max-width: 220px;
      object-fit: contain;
      display: block;
      margin-bottom: 12px;
    }
    .header-tag {
      display: inline-block;
      background-color: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 6px;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 19px;
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
      
      <!-- Header with Official Vector Logo -->
      <div class="header">
        <img src="${logoUrl}" alt="LUMINOUS" class="header-logo" style="height: 46px; max-width: 220px; margin-bottom: 12px; display: block;">
        <div class="header-tag">Subcontratación Industrial B2B</div>
        <h1>Soluciones de Mano de Obra Cualificada</h1>
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
            <div class="profile-desc">Cuadros de control, cableado de potencia, conexionado y puesta em marcha industrial.</div>
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
          <div class="signature-details">
            <div class="signature-name">Alex Carmona</div>
            <div class="signature-title">Departamento Comercial & Operaciones</div>
            <div class="signature-contact">
              <strong>LUMINOUS ALLEY, UNIPESSOAL LDA</strong><br>
              📞 Tel / WhatsApp: <a href="{{whatsapp_url}}" style="color: #f59e0b; text-decoration: none; font-weight: 700;">+34 645 56 74 01</a><br>
              ✉️ Email: comercial1@luminousalley.com<br>
              🌐 Web: <a href="https://luminousalley.com" style="color: #64748b; text-decoration: none;">www.luminousalley.com</a>
            </div>
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

async function updateTemplate() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
  const tmplTitle = 'Luminous Executivo - Alex Carmona (Alta Conversão)';

  await c.query(`
    UPDATE core_comercial.marketing_templates
    SET html_content = $1, updated_at = NOW()
    WHERE empresa_id = $2 AND title = $3;
  `, [executiveHtmlWithNewLogo, empresaId, tmplTitle]);

  console.log('✅ Template atualizado com a NOVA LOGO OFICIAL 2026 da Luminous!');

  await c.end();
}

updateTemplate();
