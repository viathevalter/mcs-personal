require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function sendTestTrackingEmail() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const key = process.env.VITE_RESEND_API_KEY;

  // Reset Valter lead to Stage 2 (E-mail Enviado)
  const stage2 = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND order_index = 2;");
  const stage2Id = stage2.rows[0]?.id;
  await c.query("UPDATE core_comercial.leads SET stage_id = $1 WHERE email = 'thevalter@gmail.com';", [stage2Id]);
  console.log("Valter Teles (thevalter@gmail.com) resetado para o Estágio 2 (E-mail Enviado)!");

  // Send real email with Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "LUMINOUS <comercial1@mail.luminousalley.com>",
      to: ["thevalter@gmail.com"],
      subject: "TESTE REAL DE RASTREAMENTO - LUMINOUS",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Teste de Rastreamento Automático de Abertura</h2>
          <p>Olá Valter,</p>
          <p>Este e-mail foi enviado agora com o subdomínio <b>links.mail.luminousalley.com</b> 100% ativo e verificado na Resend.</p>
          <p>Basta abrir este e-mail no seu Gmail para que a Resend registre a abertura e mova o seu card para 'E-mail Lido / Clicado'!</p>
        </div>
      `
    })
  });

  const data = await res.json();
  console.log("Status do envio na Resend:", data);

  // Link to marketing_campaign_queue or insert for tracking
  if (data.id) {
    const valterLead = await c.query("SELECT id FROM core_comercial.leads WHERE email = 'thevalter@gmail.com';");
    const valterId = valterLead.rows[0]?.id;
    await c.query(`
      INSERT INTO core_comercial.marketing_campaign_queue (campaign_id, lead_id, status, sent_at, resend_email_id)
      VALUES ('c7f04ca1-d119-4275-adf5-252198aee2c2', $1, 'sent', NOW(), $2);
    `, [valterId, data.id]);
    console.log("Disparo vinculado na fila com ID:", data.id);
  }

  await c.end();
}

sendTestTrackingEmail();
