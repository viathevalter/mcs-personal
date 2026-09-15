import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // Base64
}

async function sendMailViaGraph(
  senderEmail: string,
  senderName: string,
  targetEmail: string,
  subject: string,
  htmlContent: string,
  attachments: EmailAttachment[] = [],
  microsoftCredentials?: { tenantId?: string; clientId?: string; clientSecret?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = microsoftCredentials?.tenantId || Deno.env.get('SHAREPOINT_TENANT_ID');
    const clientId = microsoftCredentials?.clientId || Deno.env.get('SHAREPOINT_CLIENT_ID');
    const clientSecret = microsoftCredentials?.clientSecret || Deno.env.get('SHAREPOINT_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      console.warn("Microsoft Graph configurations are missing.");
      return { success: false, error: "Microsoft Graph secrets are missing in environment/empresa." };
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

    // 2. Montar Payload do E-mail
    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
    const mailPayload: any = {
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
      },
      saveToSentItems: "true",
    };

    if (attachments && attachments.length > 0) {
      mailPayload.message.attachments = attachments.map(att => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      }));
    }

    console.log(`Disparando e-mail Microsoft Graph via ${senderEmail} para ${targetEmail}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail comercial enviado com sucesso via Microsoft Graph.");
      return { success: true };
    } else {
      const errText = await graphRes.text();
      console.error("Falha no Microsoft Graph sendMail:", errText);
      return { success: false, error: `Microsoft Graph API Error (${graphRes.status}): ${errText}` };
    }
  } catch (err: any) {
    console.error("Erro no envio de e-mail:", err);
    return { success: false, error: err.message || "Erro desconhecido ao enviar e-mail via Graph" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      senderEmail,
      senderName,
      recipientEmail,
      subject,
      htmlContent,
      leadId,
      queueItemId,
      empresaId,
      updateLeadEmail = true,
      userId,
      attachments = [],
      materialTitle,
    } = await req.json();

    if (!recipientEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes (recipientEmail, subject, htmlContent)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obter credenciais da empresa caso existam
    let msCredentials: { tenantId?: string; clientId?: string; clientSecret?: string } | undefined = undefined;
    let fromEmail = senderEmail;

    if (empresaId) {
      const { data: empresa } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('email, microsoft_tenant_id, microsoft_client_id, microsoft_client_secret')
        .eq('id', empresaId)
        .maybeSingle();

      if (empresa) {
        if (empresa.microsoft_tenant_id && empresa.microsoft_client_id && empresa.microsoft_client_secret) {
          msCredentials = {
            tenantId: empresa.microsoft_tenant_id,
            clientId: empresa.microsoft_client_id,
            clientSecret: empresa.microsoft_client_secret,
          };
        }
        if (!fromEmail && empresa.email) {
          fromEmail = empresa.email;
        }
      }
    }

    if (!fromEmail) {
      fromEmail = "valter@gestaologinpro.com";
    }

    // 2. Disparar via Microsoft Graph
    const mailResult = await sendMailViaGraph(
      fromEmail,
      senderName || "Comercial MCS",
      recipientEmail,
      subject,
      htmlContent,
      attachments,
      msCredentials
    );

    if (!mailResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: mailResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Atualizar Lead se solicitado e se houver leadId
    if (updateLeadEmail && leadId) {
      try {
        await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            email: recipientEmail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);
        console.log(`Lead ${leadId} atualizado com novo e-mail: ${recipientEmail}`);
      } catch (leadErr) {
        console.error("Erro ao atualizar e-mail do lead:", leadErr);
      }
    }

    // 4. Registrar na fila do discador caso haja queueItemId
    if (queueItemId) {
      try {
        // Obter item para atualizar tentativas
        const { data: qItem } = await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .select('attempts_count, campaign_id')
          .eq('id', queueItemId)
          .maybeSingle();

        const currentAttempts = (qItem?.attempts_count || 0) + 1;

        // Atualizar item na fila
        await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .update({
            status: 'completed',
            last_call_at: new Date().toISOString(),
            attempts_count: currentAttempts,
            notes: `Material enviado (${materialTitle || subject}) para ${recipientEmail} via M365 (${fromEmail})`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', queueItemId);

        // Inserir log detalhado
        await supabase
          .schema('core_comercial')
          .from('dialer_queue_logs')
          .insert({
            queue_item_id: queueItemId,
            lead_id: leadId,
            user_id: userId,
            outcome: 'material_sent',
            call_duration: 0,
            notes: `Material enviado (${materialTitle || subject}) para ${recipientEmail} a partir de ${fromEmail}.`,
            created_at: new Date().toISOString(),
          });
      } catch (queueErr) {
        console.error("Erro ao atualizar item da fila do discador:", queueErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "E-mail enviado com sucesso via Microsoft 365 e gravado nos itens enviados.",
        senderEmail: fromEmail,
        recipientEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro inesperado em send-commercial-email:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro interno no servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
