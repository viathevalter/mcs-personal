require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const logoUrl = 'https://mcs.gestaologinpro.com/luminous-logo-official-2026.png';

const tier1AlexRefinedHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUMINOUS - Acuerdos Marco de Mano de Obra Industrial</title>
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
    .header-logo {
      height: 56px;
      max-width: 250px;
      object-fit: contain;
      display: inline-block;
      margin-bottom: 16px;
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
      margin: 0 0 10px 0;
      color: #ffffff;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }
    .header-sub {
      margin: 0;
      color: #cbd5e1;
      font-size: 12.5px;
      font-weight: 500;
      line-height: 1.5;
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
      font-weight: 500;
      color: #0f172a;
      line-height: 1.6;
    }
    .grid-profiles {
      margin: 26px 0;
    }
    .profile-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .profile-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .profile-desc {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 3px;
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
      
      <!-- Header -->
      <div class="header">
        <img src="${logoUrl}" alt="LUMINOUS" class="header-logo" style="height: 56px; max-width: 250px; display: inline-block; margin: 0 auto 16px auto;">
        <div class="header-tag">Contratación Estratégica & Proyectos EPC</div>
        <h1>Acuerdos Marco de Mano de Obra Industrial</h1>
        <div class="header-sub">Soldadores (todos los procesos) · Tuberos · Caldereros · Montadores · Electricistas · Mecánicos · Electromecánicos y más perfiles.</div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Estimada Dirección de Operaciones y Compras de {{company_name}}, ¿qué tal estáis?</div>
        
        <p>Nos ponemos en contacto directamente con usted porque conocemos de primera mano uno de los principales desafíos que afrontan actualmente las grandes constructoras y empresas industriales en España: la <strong>disponibilidad inmediata de brigadas técnicas homologadas</strong> para paradas de planta y grandes proyectos, sin asumir costes fijos ni contingencias laborales.</p>

        <div class="value-box">
          <p>⚡ Ponemos a su disposición <strong>equipos técnicos y brigadas altamente cualificadas</strong>, preparados para incorporarse de forma inmediata en cualquier provincia de España o proyectos internacionales, adaptándose a las necesidades de su proyecto y garantizando rapidez, flexibilidad y continuidad operativa.</p>
        </div>

        <p>En <strong>LUMINOUS</strong> respaldamos sus obras y paradas con todas las especialidades técnicas requeridas:</p>

        <!-- Profiles in exact order requested by Alex -->
        <div class="grid-profiles">
          <div class="profile-item">
            <div class="profile-title">🔥 1. Soldadores (todos los procesos)</div>
            <div class="profile-desc">Homologados ASME / UNE-EN ISO 9606 en TIG 6G, MIG-MAG y Electrodo (inox, carbono, dúplex y alta presión).</div>
          </div>
          
          <div class="profile-item">
            <div class="profile-title">🚰 2. Tuberos</div>
            <div class="profile-desc">Lectura de planos isométricos, trazado, conformado y montajes piping de máxima exigencia.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">🔨 3. Caldereros</div>
            <div class="profile-desc">Fabricación, conformado y ensamblaje de grandes estructuras metálicas y calderería pesada.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">⚙️ 4. Montadores</div>
            <div class="profile-desc">Montaje mecánico de precisión, estructuras pesadas, alineación y mantenimiento de plantas.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">⚡ 5. Electricistas</div>
            <div class="profile-desc">Cuadros de control, cableado de potencia, conexionado e instalaciones industriales en media/baja tensión.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">🔧 6. Mecánicos</div>
            <div class="profile-desc">Mantenimiento predictivo, correctivo, ajuste y puesta a punto de maquinaria industrial.</div>
          </div>

          <div class="profile-item">
            <div class="profile-title">🤖 7. Electromecánicos</div>
            <div class="profile-desc">Integración mecánica, eléctrica, neumática y automatización de líneas industriales.</div>
          </div>

          <div class="profile-item" style="background-color: #f8fafc; border-style: dashed;">
            <div class="profile-title" style="color: #f59e0b;">➕ Y más perfiles técnicos</div>
            <div class="profile-desc">Capataces, jefes de equipo y especialistas a medida según el alcance de su contrato.</div>
          </div>
        </div>

        <!-- All Inclusive Badge -->
        <div class="all-inclusive-card">
          <div class="all-inclusive-title">📦 ¿Qué incluye nuestro servicio llave en mano para Grandes Cuentas?</div>
          <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.7;">
            ✔️ <strong>Alojamiento y dietas</strong> 100% gestionados y costeados por Luminous.<br>
            ✔️ <strong>Vehículos de empresa</strong> y movilidad completa hasta el tajo o planta.<br>
            ✔️ <strong>PRL, EPIs certificados, reconocimientos médicos y compliance laboral</strong> en regla.<br>
            ✔️ <strong>Flexibilidad operativa:</strong> Contratación por semanas, meses, paradas programadas o duración de obra.
          </p>
        </div>

        <!-- CTA Buttons -->
        <div class="btn-container">
          <a href="{{presupuesto_url}}" class="btn-primary">📑 Solicitar Dossier & Tarifas Marco</a>
          <a href="{{whatsapp_url}}" class="btn-whatsapp">💬 Hablar con Dirección Comercial</a>
        </div>

        <p style="font-size: 12.5px; color: #64748b; text-align: center; margin-top: 12px;">
          <em>⚡ Homologación ágil y propuesta de acuerdo marco en menos de 2 horas.</em>
        </p>

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

async function updateAndSendTier1Test() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
  const tier1Title = 'Luminous Tier 1 - Acordos Marco & Grandes Obras (Diretoria & EPC)';

  await c.query(`
    UPDATE core_comercial.marketing_templates
    SET html_content = $1, subject = $2, updated_at = NOW()
    WHERE empresa_id = $3 AND title = $4;
  `, [tier1AlexRefinedHtml, 'Homologación de Proveedor y Refuerzo Técnico para Proyectos de {{company_name}}', empresaId, tier1Title]);

  console.log('✅ Template Tier 1 atualizado com a estética harmonizada e textos na linha do Alex!');

  // Enviar teste para Valter e Alex
  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const appUrl = 'https://mcs.gestaologinpro.com';

  const testRecipients = [
    { email: 'thevalter@gmail.com', name: 'Valter Teles', company: 'Técnicas Reunidas EPC S.A.' },
    { email: 'fenix9926@gmail.com', name: 'Alex Carmona', company: 'Iberia Engineering & Energy S.L.' }
  ];

  for (const r of testRecipients) {
    let html = tier1AlexRefinedHtml
      .replace(/\{\{\s*name\s*\}\}/g, r.name)
      .replace(/\{\{\s*company_name\s*\}\}/g, r.company)
      .replace(/\{\{\s*email\s*\}\}/g, r.email)
      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=test&empresa_id=847796c4-b253-4e53-9e6b-34a127ec7d85`)
      .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=test`)
      .replace(/\{\{\s*opt_out_url\s*\}\}/g, `${appUrl}/public/coleta-dados/test?opt_out=1`);

    let subject = 'Homologación de Proveedor y Refuerzo Técnico para Proyectos de ' + r.company;

    console.log(`\nEnviando e-mail Tier 1 atualizado para ${r.name} (${r.email})...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LUMINOUS · Alex Carmona <comercial1@mail.luminousalley.com>',
        to: [r.email],
        subject: `[TIER 1 REVISADO] ${subject}`,
        html: html,
        tags: [
          { name: 'test', value: 'tier1_refined_preview' }
        ]
      })
    });

    const data = await res.json();
    console.log(`✅ Resultado do envio para ${r.email}:`, data);
  }

  await c.end();
}

updateAndSendTier1Test();
