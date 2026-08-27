require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const logoUrl = 'https://mcs.gestaologinpro.com/luminous-logo-official-2026.png';

const executiveHtmlPremiumCentered = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUMINOUS - Soluciones en Mano de Obra Industrial</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(180deg, #090e17 0%, #151e2e 100%);
      padding: 36px 24px 32px 24px;
      text-align: center;
      border-bottom: 3px solid #f59e0b;
    }
    .header-logo-container {
      text-align: center;
      margin-bottom: 18px;
    }
    .header-logo {
      height: 56px;
      max-width: 250px;
      object-fit: contain;
      display: inline-block;
    }
    .header-tag {
      display: inline-block;
      background-color: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 5px 14px;
      border-radius: 24px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }
    .header-sub {
      margin: 0;
      color: #94a3b8;
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 18px;
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
      margin: 22px 0;
    }
    .value-box p {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
    }
    .grid-profiles {
      margin: 26px 0;
    }
    .profile-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .profile-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .profile-desc {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .all-inclusive-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 18px 20px;
      margin: 24px 0;
    }
    .all-inclusive-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 10px;
    }
    .btn-container {
      margin: 32px 0 20px 0;
      text-align: center;
    }
    .btn-primary {
      display: inline-block;
      background-color: #f59e0b;
      color: #0f172a !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 14.5px;
      padding: 15px 30px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
      margin: 6px;
    }
    .btn-whatsapp {
      display: inline-block;
      background-color: #25d366;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14.5px;
      padding: 15px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(37, 211, 102, 0.28);
      margin: 6px;
    }
    .signature {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-name {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .signature-title {
      font-size: 13px;
      color: #64748b;
    }
    .signature-contact {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 8px;
      line-height: 1.7;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 11.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      line-height: 1.6;
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
      
      <!-- Header with Centralized Premium Logo and Title -->
      <div class="header">
        <div class="header-logo-container">
          <img src="${logoUrl}" alt="LUMINOUS" class="header-logo" style="height: 56px; max-width: 250px; display: inline-block; margin: 0 auto;">
        </div>
        <div>
          <div class="header-tag">Subcontratación Industrial B2B</div>
          <h1>Soluciones de Mano de Obra Cualificada</h1>
          <div class="header-sub">Soldadores Homologados · Tuberos Piping · Montadores Mecánicos</div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Estimado/a responsable de compras y producción de {{company_name}},</div>
        
        <p>Le contacto directamente porque sabemos que actualmente en España uno de los mayores cuellos de botella en obras y talleres industriales es <strong>la disponibilidad inmediata de profesionales técnicos homologados</strong> sin incurrir en costes fijos de contratación.</p>

        <div class="value-box">
          <p>⚡ Disponemos de brigadas y operarios cualificados listos para incorporación inmediata en cualquier provincia de España.</p>
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
        <div class="all-inclusive-card">
          <div class="all-inclusive-title">📦 ¿Qué incluye nuestro servicio llave en mano?</div>
          <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.7;">
            ✔️ <strong>Alojamiento y dietas</strong> 100% gestionados y costeados por Luminous.<br>
            ✔️ <strong>Vehículos de empresa</strong> y movilidad completa hasta la obra.<br>
            ✔️ <strong>EPIs certificados</strong>, PRL y reconocimientos médicos en regla.<br>
            ✔️ <strong>Flexibilidad total:</strong> Contratación por semanas, meses o duración de obra.
          </p>
        </div>

        <!-- CTA Buttons -->
        <div class="btn-container">
          <a href="{{presupuesto_url}}" class="btn-primary">📋 Solicitar Presupuesto Online</a>
          <a href="{{whatsapp_url}}" class="btn-whatsapp">💬 Hablar por WhatsApp</a>
        </div>

        <p style="font-size: 12.5px; color: #64748b; text-align: center; margin-top: 12px;">
          <em>⚡ Respuesta y tarifa personalizada en menos de 2 horas.</em>
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

async function updateTemplateHeader() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
  const tmplTitle = 'Luminous Executivo - Alex Carmona (Alta Conversão)';

  await c.query(`
    UPDATE core_comercial.marketing_templates
    SET html_content = $1, updated_at = NOW()
    WHERE empresa_id = $2 AND title = $3;
  `, [executiveHtmlPremiumCentered, empresaId, tmplTitle]);

  console.log('✅ Template atualizado com Cabeçalho Centralizado Premium e Harmonioso!');

  await c.end();
}

updateTemplateHeader();
