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

    // 1. Verificar campanhas com status 'sending' em ordem de agendamento/criação
    const { data: currentSendingCampaigns, error: errSending } = await supabase
      .from("marketing_campaigns")
      .select("id, title, scheduled_at, created_at")
      .eq("status", "sending")
      .order("scheduled_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (errSending) throw errSending;

    let targetCampaignId: string | null = null;

    // Priorizar a primeira campanha 'sending' que ainda possua e-mails pendentes
    if (currentSendingCampaigns && currentSendingCampaigns.length > 0) {
      for (const camp of currentSendingCampaigns) {
        const { count, error: errCount } = await supabase
          .from("marketing_campaign_queue")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", camp.id)
          .eq("status", "pending");

        if (!errCount && count && count > 0) {
          targetCampaignId = camp.id;
          console.log(`Campanha prioritária em andamento: ${camp.title} (${count} pendentes).`);
          break;
        } else {
          // Campanha sem pendências: marca como concluída
          await supabase
            .from("marketing_campaigns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", camp.id);
          console.log(`Campanha ${camp.title} finalizada como 'completed'.`);
        }
      }
    }

    // Se NÃO houver nenhuma campanha enviando ativa, ativa a próxima agendada da fila (1 por vez)
    if (!targetCampaignId) {
      const { data: nextScheduled, error: errNext } = await supabase
        .from("marketing_campaigns")
        .select("id, title")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (errNext) throw errNext;

      if (nextScheduled) {
        targetCampaignId = nextScheduled.id;
        await supabase
          .from("marketing_campaigns")
          .update({ status: "sending", updated_at: new Date().toISOString() })
          .eq("id", nextScheduled.id);
        console.log(`Iniciando próxima campanha agendada: ${nextScheduled.title}`);
      }
    }

    if (!targetCampaignId) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma campanha ativa ou agendada para envio no momento." }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    // 2. Buscar até 25 e-mails pendentes estritamente da campanha prioritária da vez
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
      .eq("campaign_id", targetCampaignId)
      .limit(25);

    if (errQueue) throw errQueue;

    if (!queueItems || queueItems.length === 0) {
      // Se não restou nenhum item para a campanha ativa, marca como completed
      await supabase
        .from("marketing_campaigns")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", targetCampaignId);

      return new Response(
        JSON.stringify({ success: true, message: `Campanha ${targetCampaignId} concluída.` }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    console.log(`Processando ${queueItems.length} e-mails da fila com cadência suave...`);

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
          .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=${lead.id}`)
          .replace(/https:\/\/wa\.me\/[0-9]+(?:\?[^"'\s]*)?/gi, `${appUrl}/public/whatsapp?lead_id=${lead.id}`);
      };

      const htmlBody = formatVars(rawHtml);
      const emailSubject = formatVars(rawSubject);
      
      let rawSender = company?.marketing_sender_email || company?.proposal_sender_email || "comercial1@mail.luminousalley.com";
      let validSenderEmail = rawSender;
      const lowerSender = rawSender.toLowerCase();
      if (
        !lowerSender.includes("triangulolda.com") &&
        !lowerSender.includes("wiseowe.com") &&
        !lowerSender.includes("luminousalley.com") &&
        !lowerSender.includes("gestaologinpro.com") &&
        !lowerSender.includes("universatv.com") &&
        !lowerSender.includes("mastercorp")
      ) {
        validSenderEmail = "alex@mail.gestaologinpro.com";
      }

      const senderName = company?.trade_name || "Comercial";
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
          // 1. Verificar se o lead está em quarentena (Bounce ou E-mail Inválido)
          const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
          if (leadTags.includes("Bounce") || leadTags.includes("E-mail Inválido")) {
            console.log(`[PULANDO] Lead ${lead.email} está em quarentena (Bounce/Inválido).`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: "E-mail em quarentena de entrega (Bounce prévio ou Inválido)",
              })
              .eq("id", item.id);
            continue;
          }

          // 2. Higienização e descolamento de sintaxe de e-mail inteligente
          let cleanLeadEmail = (lead.email || "")
            .toLowerCase()
            .trim()
            .replace(/^mailto:/i, "")
            .replace(/^[<"'\(\[\{]+|[>"'\)\]\}\.,;:]+$/g, "");

          // Desgrudar extensões coladas
          const tlds = ["com.es", "nom.es", "org.es", "gob.es", "edu.es", "com", "es", "pt", "it", "fr", "net", "org", "eu", "cat", "gal", "eus", "info", "biz", "co", "io"];
          if (cleanLeadEmail.includes("@")) {
            const [u, d] = cleanLeadEmail.split("@");
            if (u && d) {
              let cleanD = d;
              for (const tld of tlds) {
                const escaped = tld.replace(".", "\\.");
                const regex = new RegExp(`^(.+\\.${escaped})[a-z]{3,}$`, "i");
                if (regex.test(cleanD)) {
                  const match = cleanD.match(regex);
                  if (match) {
                    cleanD = match[1];
                    break;
                  }
                }
              }
              cleanLeadEmail = `${u}@${cleanD}`;
            }
          }

          const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
          if (!emailRegex.test(cleanLeadEmail) || /\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf)$/i.test(cleanLeadEmail)) {
            console.warn(`[INVÁLIDO] E-mail com sintaxe incorreta descartado: ${lead.email}`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: "Formato de e-mail inválido",
              })
              .eq("id", item.id);
            continue;
          }

          // Envio real via API do Resend com retry e delay
          let res = await fetch("https://api.resend.com/emails", {
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

          // Se bater rate limit (429), pausa 1.5s e tenta novamente
          if (res.status === 429) {
            console.warn(`[429 Rate Limit] Pausando 1.5s para ${lead.email}...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            res = await fetch("https://api.resend.com/emails", {
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
          }

          const resData = await res.json();

          if (!res.ok) {
            // Se ainda for 429 após retry, não marca como falha definitiva: mantém pending para o próximo ciclo
            if (res.status === 429) {
              console.warn(`Item ${item.id} retido em pending devido a rate limit do Resend.`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
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

          // Delay de cadência controlado (~1350ms) entre cada disparo para evitar Greylisting/Transient Bounces
          await new Promise((resolve) => setTimeout(resolve, 1350));
        }
      } catch (err: any) {
        console.error(`Falha ao processar item da fila ${item.id}:`, err.message);
        // Se for erro de rate limit na exceção, mantém pending
        if (err.message && err.message.includes("429")) {
          console.warn(`Item ${item.id} mantido em pending.`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

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
