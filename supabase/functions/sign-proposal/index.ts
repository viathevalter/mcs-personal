import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

async function sendMailViaGraph(
  senderEmail: string,
  senderName: string,
  targetEmail: string,
  ccEmails: string[],
  subject: string,
  htmlContent: string,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
    const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
    const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      console.warn("Microsoft Graph configurations are missing in Supabase secrets.");
      return { success: false, error: "Microsoft Graph secrets are missing." };
    }

    // 1. Obter Token de Acesso
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const formData = new URLSearchParams();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'https://graph.microsoft.com/.default');
    formData.append('grant_type', 'client_credentials');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Failed to authenticate Microsoft Graph token:", errText);
      return { success: false, error: `Auth Token Error: ${errText}` };
    }

    const { access_token } = await tokenRes.json();

    // 2. Disparar email via Microsoft Graph API
    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
    const mailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: targetEmail,
            },
          },
        ],
        ccRecipients: ccEmails.map(email => ({
          emailAddress: {
            address: email,
          },
        })),
        attachments: attachments.map(att => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        })),
      },
      saveToSentItems: "true",
    };

    console.log(`Disparando e-mail de conclusão via Microsoft Graph para ${targetEmail}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail de conclusão enviado com sucesso.");
      return { success: true };
    } else {
      const errText = await graphRes.text();
      console.error("Falha no Microsoft Graph sendMail:", errText);
      return { success: false, error: `Microsoft Graph API Error: ${errText}` };
    }
  } catch (err: any) {
    console.error("Erro no envio de e-mail via Graph:", err);
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const { token, otp_code, signature_image, ip_address, user_agent } = await req.json();

    if (!token || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Parâmetros token e otp_code são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar o registro de assinatura pelo token
    const { data: ps, error: psErr } = await supabase
      .schema("core_comercial")
      .from("proposal_signatures")
      .select("*")
      .eq("signature_token", token)
      .single();

    if (psErr || !ps) {
      return new Response(
        JSON.stringify({ error: "Assinatura de proposta não encontrada ou token inválido." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ps.status !== "pending_signature") {
      return new Response(
        JSON.stringify({ error: `Esta proposta já está no status: ${ps.status}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validar OTP e expiração
    if (ps.otp_code !== otp_code) {
      return new Response(
        JSON.stringify({ error: "Código de verificação OTP inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(ps.otp_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "O código OTP expirou. Por favor, solicite o reenvio da proposta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar a estimación correspondente
    const { data: est, error: estErr } = await supabase
      .schema("core_comercial")
      .from("estimaciones")
      .select("*")
      .eq("id", ps.estimacion_id)
      .single();

    if (estErr || !est) {
      throw new Error(`Estimación não encontrada: ${estErr?.message}`);
    }

    // 4. Buscar nome e email do destinatário (Cliente ou Lead)
    let clientOrLeadName = "Cliente";
    let emailUsed = "desconhecido@stoco.es";
    if (est.client_id) {
      const { data: client, error: clientErr } = await supabase
        .schema("core_common")
        .from("clients")
        .select("trade_name, legal_name, email")
        .eq("id", est.client_id)
        .single();
      if (!clientErr && client) {
        clientOrLeadName = client.trade_name || client.legal_name || "Cliente";
        if (client.email) emailUsed = client.email;
      }
    } else if (est.lead_id) {
      const { data: lead, error: leadErr } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("name, company_name, email")
        .eq("id", est.lead_id)
        .single();
      if (!leadErr && lead) {
        clientOrLeadName = lead.name || lead.company_name || "Cliente";
        if (lead.email) emailUsed = lead.email;
      }
    }

    // 5. Salvar a assinatura desenhada (canvas) no storage
    let signatureImageUrl = "";
    if (signature_image) {
      try {
        const base64Data = signature_image.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const sigImagePath = `${ps.estimacion_id}/signature_${Date.now()}.png`;
        
        const { error: uploadImgErr } = await supabase.storage
          .from("proposal-signatures")
          .upload(sigImagePath, binaryData, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadImgErr) {
          signatureImageUrl = sigImagePath;
        } else {
          console.error("Erro ao fazer upload da imagem de assinatura:", uploadImgErr);
          signatureImageUrl = signature_image; // Fallback para base64 direto
        }
      } catch (errSig) {
        console.error("Erro ao decodificar a assinatura base64:", errSig);
        signatureImageUrl = signature_image; // Fallback
      }
    }

    // 6. Criar o log de auditoria
    const auditPayload = {
      proposal_signature_id: ps.id,
      ip_address: ip_address || "0.0.0.0",
      user_agent: user_agent || "Desconhecido",
      verification_code: otp_code,
      signature_image: signatureImageUrl,
      email_or_phone_used: emailUsed,
    };

    const { error: auditErr } = await supabase
      .schema("core_comercial")
      .from("proposal_audit_logs")
      .insert(auditPayload);

    if (auditErr) {
      throw new Error(`Falha ao salvar log de auditoria: ${auditErr.message}`);
    }

    // 7. Atualizar o registro da assinatura
    const { error: updatePsErr } = await supabase
      .schema("core_comercial")
      .from("proposal_signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        otp_code: null,
        otp_expires_at: null,
      })
      .eq("id", ps.id);

    if (updatePsErr) {
      throw new Error(`Falha ao atualizar status da assinatura: ${updatePsErr.message}`);
    }

    // 8. Atualizar o status da estimación para 'signed'
    console.log(`Atualizando status da estimativa ${est.id} para 'signed'...`);
    await supabase
      .schema("core_comercial")
      .from("estimaciones")
      .update({ status: "signed", updated_at: new Date().toISOString() })
      .eq("id", est.id);

    // 8.5. Buscar dados da empresa para o e-mail de notificação
    const { data: empresa } = await supabase
      .schema("core_common")
      .from("empresas")
      .select("*")
      .eq("id", ps.empresa_id)
      .single();

    // Baixar proposta assinada do storage
    let proposalBase64 = "";
    if (ps.document_url) {
      console.log(`Baixando proposta para anexo: ${ps.document_url}`);
      const { data: blob, error: dlErr } = await supabase.storage
        .from("proposal-signatures")
        .download(ps.document_url);
      if (!dlErr && blob) {
        proposalBase64 = encode(new Uint8Array(await blob.arrayBuffer()));
      } else {
        console.error("Erro ao baixar proposta para anexo:", dlErr);
      }
    }

    // Baixar contrato assinado do storage
    let contractBase64 = "";
    if (ps.contract_document_url) {
      console.log(`Baixando contrato para anexo: ${ps.contract_document_url}`);
      const { data: blob, error: dlErr } = await supabase.storage
        .from("proposal-signatures")
        .download(ps.contract_document_url);
      if (!dlErr && blob) {
        contractBase64 = encode(new Uint8Array(await blob.arrayBuffer()));
      } else {
        console.error("Erro ao baixar contrato para anexo:", dlErr);
      }
    }

    // Enviar email de confirmação com anexos
    if (empresa) {
      const senderEmail = empresa.proposal_sender_email || "vendas@stoco.es";
      const senderName = empresa.trade_name || "Comercial";
      const subject = `[ASSINADO] Proposta e Contrato Comercial ${est.codigo} - ${empresa.trade_name}`;
      
      const origin = req.headers.get("origin") || "http://localhost:5173";
      const publicLink = `${origin}/assinar-proposta/${token}`;
      
      const htmlContent = `
        <h2>Processo de Assinatura Concluído!</h2>
        <p>Olá,</p>
        <p>Temos o prazer de informar que o processo de assinatura eletrónica da proposta comercial <strong>${est.codigo}</strong> e do respetivo contrato foi concluído com sucesso.</p>
        <p><strong>Detalhes do processo:</strong></p>
        <ul>
          <li><strong>Cliente/Empresa:</strong> ${clientOrLeadName}</li>
          <li><strong>Assinante:</strong> ${emailUsed}</li>
          <li><strong>IP de Assinatura:</strong> ${ip_address || "0.0.0.0"}</li>
          <li><strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-PT")}</li>
        </ul>
        <p>Os documentos originais assinados estão anexados a este e-mail em formato Microsoft Word (.docx).</p>
        <p>Se preferir visualizar e descarregar as versões em formato PDF (com carimbo e certificado digital eIDAS), aceda ao seguinte link público:</p>
        <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar e Baixar PDF</a></p>
        <br/>
        <p>Atenciosamente,</p>
        <p><strong>Equipa ${empresa.trade_name}</strong></p>
      `;

      const attachments: EmailAttachment[] = [];
      if (proposalBase64) {
        attachments.push({
          name: `proposta_${est.codigo}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: proposalBase64,
        });
      }
      if (contractBase64) {
        attachments.push({
          name: `contrato_${est.codigo}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: contractBase64,
        });
      }

      // Envia para o cliente com cópia oculta/CC para a empresa
      const mailRes = await sendMailViaGraph(senderEmail, senderName, emailUsed, [senderEmail], subject, htmlContent, attachments);
      if (!mailRes.success) {
        console.error("Erro no envio do e-mail de conclusão:", mailRes.error);
      }
    }

    let isConvertedToOrder = false;
    let conversionDetails = null;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Proposta assinada com sucesso!",
        signed_at: new Date().toISOString(),
        is_converted_to_order: isConvertedToOrder,
        conversion_details: conversionDetails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao assinar proposta:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
