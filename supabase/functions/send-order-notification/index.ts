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
  toEmails: string[],
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
    
    const toRecipients = toEmails.map(email => ({
      emailAddress: {
        address: email.trim(),
      },
    }));

    const mailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: toRecipients,
        attachments: attachments.map(att => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        })),
      },
      saveToSentItems: "true",
    };

    console.log(`Disparando e-mail de notificação de pedido via Microsoft Graph para: ${toEmails.join(', ')}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail de notificação de pedido enviado com sucesso.");
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
    const { pedido_id, to_emails, email_subject, email_body } = await req.json();

    if (!pedido_id || !to_emails || !Array.isArray(to_emails) || to_emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Parâmetros pedido_id e to_emails (array não vazio) são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar o pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .schema("core_comercial")
      .from("pedidos")
      .select("*")
      .eq("id", pedido_id)
      .single();

    if (pedidoErr || !pedido) {
      return new Response(
        JSON.stringify({ error: `Pedido não encontrado: ${pedidoErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados relacionados do Cliente e Localização separadamente (sem joins cruzados de schemas)
    let client = null;
    if (pedido.client_id) {
      const { data: clientData, error: clientErr } = await supabase
        .schema("core_common")
        .from("clients")
        .select("*")
        .eq("id", pedido.client_id)
        .single();
      if (!clientErr) {
        client = clientData;
      }
    }

    let client_site = null;
    if (pedido.client_site_id) {
      const { data: siteData, error: siteErr } = await supabase
        .schema("core_common")
        .from("client_sites")
        .select("*")
        .eq("id", pedido.client_site_id)
        .single();
      if (!siteErr) {
        client_site = siteData;
      }
    }

    // Acoplar client e client_site ao objeto pedido
    pedido.client = client;
    pedido.client_site = client_site;

    // 2. Buscar empresa
    const { data: empresa, error: empErr } = await supabase
      .schema("core_common")
      .from("empresas")
      .select("*")
      .eq("id", pedido.empresa_id)
      .single();

    if (empErr || !empresa) {
      return new Response(
        JSON.stringify({ error: `Empresa não encontrada: ${empErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = empresa.proposal_sender_email || "vendas@stoco.es";
    const senderName = empresa.trade_name || "Comercial";

    // 3. Buscar os arquivos assinados de proposta e contrato associados à estimativa de origem
    const attachments: EmailAttachment[] = [];

    if (pedido.source_estimacion_id) {
      const { data: signature } = await supabase
        .schema("core_comercial")
        .from("proposal_signatures")
        .select("*")
        .eq("estimacion_id", pedido.source_estimacion_id)
        .eq("status", "signed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (signature) {
        // Baixar proposta assinada
        if (signature.document_url) {
          console.log(`Baixando proposta assinada para notificação: ${signature.document_url}`);
          const { data: blob, error: dlErr } = await supabase.storage
            .from("proposal-signatures")
            .download(signature.document_url);
          if (!dlErr && blob) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            attachments.push({
              name: `proposta_assinada_${pedido.codigo}.docx`,
              contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              contentBytes: encode(bytes),
            });
          }
        }

        // Baixar contrato assinado
        if (signature.contract_document_url) {
          console.log(`Baixando contrato assinado para notificação: ${signature.contract_document_url}`);
          const { data: blob, error: dlErr } = await supabase.storage
            .from("proposal-signatures")
            .download(signature.contract_document_url);
          if (!dlErr && blob) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            attachments.push({
              name: `contrato_assinado_${pedido.codigo}.docx`,
              contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              contentBytes: encode(bytes),
            });
          }
        }
      }
    }

    // 4. Enviar email via Microsoft Graph API
    const mailRes = await sendMailViaGraph(
      senderEmail,
      senderName,
      to_emails,
      email_subject || `Novo Pedido Gerado - ${pedido.codigo}`,
      email_body,
      attachments
    );

    if (!mailRes.success) {
      return new Response(
        JSON.stringify({ error: mailRes.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro na Edge Function send-order-notification:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
