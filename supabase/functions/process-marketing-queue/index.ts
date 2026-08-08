import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'core_comercial' },
    });

    console.log("Iniciando processamento da fila de e-mail marketing...");

    // 1. Ativar campanhas agendadas que já deveriam estar enviando
    const { data: scheduledCampaigns, error: errScheduled } = await supabase
      .from("marketing_campaigns")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (errScheduled) throw errScheduled;

    if (scheduledCampaigns && scheduledCampaigns.length > 0) {
      const ids = scheduledCampaigns.map((c) => c.id);
      await supabase
        .from("marketing_campaigns")
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .in("id", ids);
      console.log(`Ativadas ${ids.length} campanhas agendadas.`);
    }

    // 2. Buscar campanhas que estão ativas ('sending')
    const { data: activeCampaigns, error: errActive } = await supabase
      .from("marketing_campaigns")
      .select("id")
      .eq("status", "sending");

    if (errActive) throw errActive;

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma campanha ativa no momento." }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    const activeCampaignIds = activeCampaigns.map((c) => c.id);

    // 3. Buscar até 50 e-mails pendentes na fila dessas campanhas
    const { data: queueItems, error: errQueue } = await supabase
      .from("marketing_campaign_queue")
      .select(`
        id,
        campaign_id,
        lead_id,
        marketing_campaigns (
          empresa_id,
          title,
          template_id,
          marketing_templates (
            subject,
            html_content
          )
        ),
        leads:lead_id (
          name,
          email,
          company_name,
          phone
        )
      `)
      .eq("status", "pending")
      .in("campaign_id", activeCampaignIds)
      .limit(100);

    if (errQueue) throw errQueue;

    if (!queueItems || queueItems.length === 0) {
      // Se não houver itens pendentes para campanhas marcadas como 'sending',
      // podemos finalizá-las mudando o status para 'completed'
      for (const campaignId of activeCampaignIds) {
        const { count, error: errCount } = await supabase
          .from("marketing_campaign_queue")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaignId)
          .eq("status", "pending");

        if (!errCount && count === 0) {
          await supabase
            .from("marketing_campaigns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", campaignId);
          console.log(`Campanha ${campaignId} marcada como concluída.`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Nenhum e-mail pendente na fila." }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    console.log(`Processando ${queueItems.length} e-mails da fila...`);

    for (const item of queueItems) {
      const campaign = item.marketing_campaigns;
      const template = campaign?.marketing_templates;
      const lead = item.leads;

      if (!lead || !template || !campaign) {
        await supabase
          .from("marketing_campaign_queue")
          .update({
            status: "failed",
            error_message: "Dados incompletos (Lead, Template ou Campanha ausente).",
          })
          .eq("id", item.id);
        continue;
      }

      // Buscar dados da empresa explicitamente do schema core_common
      const { data: company } = await supabase
        .schema("core_common")
        .from("empresas")
        .select("trade_name, proposal_sender_email, marketing_sender_email")
        .eq("id", campaign.empresa_id)
        .maybeSingle();

      // Substituição de placeholders dinâmicos
      const rawHtml = template.html_content;
      const rawSubject = template.subject;

      const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://mcs.gestaologinpro.com";
      const formatVars = (text: string) => {
        const unsubscribeLink = `${appUrl}/public/coleta-dados/${lead.id}?opt_out=1`;
        return text
          .replace(/\{\{\s*name\s*\}\}/g, lead.name || "")
          .replace(/\{\{\s*company_name\s*\}\}/g, lead.company_name || "")
          .replace(/\{\{\s*email\s*\}\}/g, lead.email || "")
          .replace(/\{\{\s*phone\s*\}\}/g, lead.phone || "")
          .replace(/\{\{\s*lead_id\s*\}\}/g, lead.id || "")
          .replace(/\{\{\s*lead\.id\s*\}\}/g, lead.id || "")
          .replace(/\{\{\s*id\s*\}\}/g, lead.id || "")
          .replace(/\{\{\s*empresa_id\s*\}\}/g, campaign.empresa_id || "")
          .replace(/\{\{\s*empresa\.id\s*\}\}/g, campaign.empresa_id || "")
          .replace(/\{\{\s*form_url\s*\}\}/g, `${appUrl}/public/coleta-dados/${lead.id}?empresa_id=${campaign.empresa_id}`)
          .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=${lead.id}&empresa_id=${campaign.empresa_id}`)
          .replace(/\{\{\s*opt_out_url\s*\}\}/g, unsubscribeLink)
          .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, unsubscribeLink)
          .replace(/\*\|UNSUB\|\*/gi, unsubscribeLink)
          .replace(/\*\|UNSUBSCRIBE\|\*/gi, unsubscribeLink)
          .replace(/%UNSUBSCRIBE_URL%/gi, unsubscribeLink)
          .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=${lead.id}`);
      };

      const htmlBody = formatVars(rawHtml);
      const emailSubject = formatVars(rawSubject);
      
      let rawSender = company?.marketing_sender_email || company?.proposal_sender_email || "comercial1@mail.luminousalley.com";
      let validSenderEmail = rawSender;
      const lowerSender = rawSender.toLowerCase();
      if (!lowerSender.includes("gestaologinpro.com") && !lowerSender.includes("luminousalley.com") && !lowerSender.includes("mastercorp")) {
        validSenderEmail = "alex@mail.gestaologinpro.com";
      }

      const senderName = company?.trade_name || "Luminous";
      const fromHeader = rawSender.includes("<") ? rawSender : `${senderName} <${validSenderEmail}>`;

      try {
        if (!resendApiKey) {
          // Modo Simulação (caso não haja API Key configurada em Dev)
          console.log(`[SIMULAÇÃO] Enviando e-mail de campanha:
            De: ${fromHeader}
            Para: ${lead.email}
            Assunto: ${emailSubject}
          `);
          
          await supabase
            .from("marketing_campaign_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", item.id);
            
          // Atualizar o estágio do lead para 'E-mail Enviado' se ele estiver no estágio padrão
          await updateLeadStageToSent(supabase, lead.email, campaign.empresa_id);

        } else {
          const cleanLeadEmail = (lead.email || "")
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\.+$|\s+/g, "")
            .replace(/(\.(com|es|eu|org|net|pt|co|info))[a-z0-9_-]+$/gi, "$1");

          // Envio real via API do Resend
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromHeader,
              to: [cleanLeadEmail],
              subject: emailSubject,
              html: htmlBody,
              tags: [
                { name: "campaign_id", value: campaign.id },
                { name: "lead_id", value: lead.id },
              ],
            }),
          });

          const resData = await res.json();

          if (!res.ok) {
            throw new Error(`Erro na API do Resend: ${JSON.stringify(resData)}`);
          }

          console.log(`E-mail enviado para ${lead.email} via Resend. ID: ${resData.id}`);

          await supabase
            .from("marketing_campaign_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_email_id: resData.id,
            })
            .eq("id", item.id);

          await updateLeadStageToSent(supabase, lead.email, campaign.empresa_id);
        }
      } catch (err: any) {
        console.error(`Falha ao processar item da fila ${item.id}:`, err.message);
        await supabase
          .from("marketing_campaign_queue")
          .update({
            status: "failed",
            error_message: err.message,
          })
          .eq("id", item.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `${queueItems.length} itens processados.` }),
      { headers: corsHeaders(), status: 200 }
    );

  } catch (err: any) {
    console.error("Erro geral na Edge Function process-marketing-queue:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: corsHeaders(), status: 500 }
    );
  }
});

// Helper para mover o lead para a coluna 'E-mail Enviado'
async function updateLeadStageToSent(supabase: any, leadEmail: string, empresaId: string) {
  try {
    const { data: stageData } = await supabase
      .from("kanban_stages")
      .select("id")
      .or(`name.eq.E-mail Enviado,order_index.eq.2`)
      .limit(1)
      .maybeSingle();

    if (stageData) {
      await supabase
        .from("leads")
        .update({ stage_id: stageData.id, updated_at: new Date().toISOString() })
        .eq("email", leadEmail);
    }
  } catch (e: any) {
    console.error("Erro ao atualizar estágio do lead:", e);
  }
}
