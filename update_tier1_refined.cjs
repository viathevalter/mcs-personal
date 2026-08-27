require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const logoUrl = 'https://mcs.gestaologinpro.com/luminous-logo-official-2026.png';

const tier1HtmlRefined = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUMINOUS - Homologación de Proveedor & Subcontratación Estratégica</title>
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
    .header-logo-box {
      text-align: center;
      margin-bottom: 14px;
    }
    .header-logo {
      height: 56px;
      max-width: 250px;
      object-fit: contain;
      display: inline-block;
      margin: 0 auto;
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
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }
    .header-sub {
      margin: 0;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 15.5px;
      font-weight: 700;
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
      margin: 22px 0;
    }
    .value-box p {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
    }
    .grid-capabilities {
      margin: 24px 0;
    }
    .capability-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .capability-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .capability-desc {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .compliance-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 18px 20px;
      margin: 24px 0;
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
      
      <!-- Header -->
      <div class="header">
        <div class="header-logo-box">
          <img src="${logoUrl}" alt="LUMINOUS" class="header-logo">
        </div>
        <div>
          <div class="header-tag">Contratación Estratégica & Proyectos EPC</div>
          <h1>Acuerdos Marco de Mano de Obra Industrial</h1>
          <div class="header-sub">Refuerzo Técnico Homologado para Paradas de Planta y Grandes Obras</div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Estimada Dirección de Operaciones y Compras de {{company_name}},</div>
        
        <p>Nos ponemos en contacto institucional con {{company_name}} en relación con sus proyectos industriales y necesidades de subcontratación técnica especializada en territorio nacional e internacional.</p>

        <div class="value-box">
          <p>🎯 <strong>Objetivo:</strong> Homologación como proveedor estratégico de brigadas técnicas (Soldadura, Piping, Calderería y Montaje) bajo acuerdos marco y flexibilidad operativa.</p>
        </div>

        <p>En <strong>LUMINOUS ALLEY</strong> respaldamos a las principales contratas y empresas del sector energético, petroquímico, naval e industrial pesado con personal altamente cualificado y plena solvencia técnica:</p>

        <!-- Capabilities -->
        <div class="grid-capabilities">
          <div class="capability-item">
            <div class="capability-title">👨‍🏭 Brigadas de Soldadura Homologada (ASME / UNE-EN ISO 9606)</div>
            <div class="capability-desc">Procedimientos TIG 6G, MIG-MAG y Electrodo en aceros especiales, austeníticos, dúplex y titanio.</div>
          </div>
          
          <div class="capability-item">
            <div class="capability-title">📐 Especialistas en Piping e Isométricas</div>
            <div class="capability-desc">Equipos con capataces y jefes de equipo para prefabricación en taller y montaje crítico en planta.</div>
          </div>

          <div class="capability-item">
            <div class="capability-title">⏱️ Despliegue Rápido en Paradas Programadas (Overhauls)</div>
            <div class="capability-desc">Capacidad para movilizar de 10 a 50 operarios en plazos reducidos con logística integral resuelta.</div>
          </div>
        </div>

        <!-- Compliance & SLA -->
        <div class="compliance-box">
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">🛡️ Garantía de Cumplimiento & Compliance Laboral:</div>
          <p style="margin: 0; font-size: 12.5px; color: #334155; line-height: 1.7;">
            • <strong>PRL, Reconocimientos Médicos y EPIs</strong> vigentes y auditables previo a la entrada en obra.<br>
            • <strong>Cero contingencias laborales:</strong> Gestión 100% asumida de nóminas, dietas, traslados y alojamientos.<br>
            • <strong>Póliza de Responsabilidad Civil</strong> con amplias coberturas para industria pesada.
          </p>
        </div>

        <p>Estaríamos encantados de coordinar una <strong>breve llamada de 10 minutos</strong> o mantener una reunión técnica telemática para presentar nuestras tarifas de acuerdo marco y catálogo de capacidades.</p>

        <!-- CTA Buttons -->
        <div class="btn-container">
          <a href="{{presupuesto_url}}" class="btn-primary">📑 Solicitar Dossier & Tarifas Marco</a>
          <a href="{{whatsapp_url}}" class="btn-whatsapp">💬 Contactar con Dirección Comercial</a>
        </div>

        <!-- Signature -->
        <div class="signature">
          <div class="signature-details">
            <div class="signature-name">Alex Carmona</div>
            <div class="signature-title">Responsable Comercial de Grandes Cuentas & Expansión</div>
            <div class="signature-contact">
              <strong>LUMINOUS ALLEY, UNIPESSOAL LDA</strong><br>
              📞 Tel / WhatsApp Directo: <a href="{{whatsapp_url}}" style="color: #f59e0b; text-decoration: none; font-weight: 700;">+34 645 56 74 01</a><br>
              ✉️ Email: comercial1@luminousalley.com<br>
              🌐 Portal Corporativo: <a href="https://luminousalley.com" style="color: #64748b; text-decoration: none;">www.luminousalley.com</a>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        Comunicación comercial B2B dirigida exclusivamente al departamento de compras y contratación de {{company_name}}.<br>
        Para gestionar sus preferencias o darse de baja, <a href="{{opt_out_url}}">haga clic aquí</a>.
      </div>

    </div>
  </div>
</body>
</html>`;

async function updateTier1() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
  const tier1Title = 'Luminous Tier 1 - Acordos Marco & Grandes Obras (Diretoria & EPC)';

  await c.query(`
    UPDATE core_comercial.marketing_templates
    SET html_content = $1, updated_at = NOW()
    WHERE empresa_id = $2 AND title = $3;
  `, [tier1HtmlRefined, empresaId, tier1Title]);

  console.log('✅ Template Tier 1 refinado e perfeitamente centralizado no banco de dados!');

  await c.end();
}

updateTier1();
