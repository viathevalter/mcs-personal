import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// 1x1 Transparent GIF Base64
const TRANSPARENT_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0)
);

async function markLeadAsRead(supabase: any, leadId: string, campaignId?: string | null, hintEmpresaId?: string | null) {
  try {
    const { data: lead } = await supabase
      .schema("core_comercial")
      .from("leads")
      .select("id, stage_id, empresa_id, email, name, tags, notes")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) return;

    // Nunca promover leads descadastrados (Opt-out) para 'E-mail Lido / Clicado'
    if (
      String(lead.name || "").startsWith("[DESCADASTRADO]") ||
      String(lead.notes || "").includes("Opt-out")
    ) {
      return;
    }

    // NUNCA alterar o empresa_id de um lead que já possui empresa atribuída!
    const targetEmpresaId = lead.empresa_id || hintEmpresaId;
    if (!targetEmpresaId) return;

    // 1. Buscar primeiro pelo NOME da etapa ('E-mail Lido / Clicado' / 'Correo Leído / Clicado')
    const { data: namedStages3 } = await supabase
      .schema("core_comercial")
      .from("kanban_stages")
      .select("id, order_index")
      .eq("empresa_id", targetEmpresaId)
      .or("name.ilike.%Lido%,name.ilike.%Clicado%,name_es.ilike.%Leído%,name_es.ilike.%Clicado%")
      .limit(1);

    let stage3 = namedStages3 && namedStages3.length > 0 ? namedStages3[0] : null;
    // 2. Fallback para order_index = 3 apenas se nenhuma etapa com o nome existir
    if (!stage3) {
      const { data: fallbackStages3 } = await supabase
        .schema("core_comercial")
        .from("kanban_stages")
        .select("id, order_index")
        .eq("empresa_id", targetEmpresaId)
        .eq("order_index", 3)
        .limit(1);
      stage3 = fallbackStages3 && fallbackStages3.length > 0 ? fallbackStages3[0] : null;
    }

    if (!stage3) return;

    let currentOrderIndex = 0;
    if (lead.stage_id) {
      const { data: curStages } = await supabase
        .schema("core_comercial")
        .from("kanban_stages")
        .select("order_index")
        .eq("id", lead.stage_id)
        .limit(1);
      if (curStages && curStages.length > 0) {
        currentOrderIndex = curStages[0].order_index;
      }
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (!lead.empresa_id && targetEmpresaId) {
      updatePayload.empresa_id = targetEmpresaId;
    }

    if (stage3.order_index > currentOrderIndex) {
      updatePayload.stage_id = stage3.id;
    }

    await supabase
      .schema("core_comercial")
      .from("leads")
      .update(updatePayload)
      .eq("id", lead.id);

    console.log(`[SUCESSO] Lead ${lead.id} (${lead.email}) atualizado para Etapa 3 da Empresa ${targetEmpresaId}.`);
  } catch (err: any) {
    console.error("Erro em markLeadAsRead:", err.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --- TRATAMENTO DE ABERTURA DE IMAGEM / PIXEL (GET COM FILTRO ANTI-BOT) ---
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const leadId = url.searchParams.get("lead_id");
      const campaignId = url.searchParams.get("campaign_id");
      const ua = req.headers.get("x-original-ua") || req.headers.get("user-agent") || "";
      const isAutomatedScanner =
        /HeadlessChrome|PhantomJS|Barracuda|SpamAssassin|Proofpoint|Mimecast|Libraesva|curl|wget|python|Go-http-client/i.test(
          ua
        );

      if (leadId && leadId !== "undefined" && leadId !== "null" && !isAutomatedScanner) {
        let shouldMarkRead = true;

        // Verificar se não é pré-varredura instantânea (< 25s do envio) de gateway corporativo externo
        const { data: leadCheck } = await supabase
          .schema("core_comercial")
          .from("leads")
          .select("email")
          .eq("id", leadId)
          .maybeSingle();

        const leadDomain = String(leadCheck?.email || "").toLowerCase().split("@")[1] || "";
        const internalTestDomains = new Set([
          "gestaologinpro.com",
          "luminousalley.com",
          "wiseowe.com",
          "triangulolda.com",
          "geniomontagens.com",
        ]);

        if (!internalTestDomains.has(leadDomain)) {
          const { data: latestSent } = await supabase
            .schema("core_comercial")
            .from("marketing_campaign_queue")
            .select("sent_at")
            .eq("lead_id", leadId)
            .eq("status", "sent")
            .not("sent_at", "is", null)
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestSent?.sent_at) {
            const deltaSec = (Date.now() - new Date(latestSent.sent_at).getTime()) / 1000;
            if (deltaSec >= 0 && deltaSec < 25) {
              console.log(`[ANTI-BOT] Ignorando pré-carregamento SMTP (${deltaSec.toFixed(1)}s) para lead ${leadId}`);
              shouldMarkRead = false;
            }
          }
        }

        if (shouldMarkRead) {
          await markLeadAsRead(supabase, leadId, campaignId);
        }
      }
    } catch (e: any) {
      console.error("Erro no pixel_open GET:", e.message);
    }

    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders,
      },
    });
  }

  try {
    const body = await req.json();
    console.log("Resend Webhook received:", JSON.stringify(body));

    const eventType = body.type; // e.g. "email.opened", "email.clicked", "email.bounced", "email.received"
    const recipientEmail = body.data?.to?.[0];

    // --- ENCAMINHAMENTO AUTOMÁTICO DE E-MAILS RECEBIDOS NOS SUBDOMÍNIOS (PROVA DE VIDA / MAILINBLACK / RESPOSTAS) ---
    if (eventType === "email.received") {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const toAddr = String(recipientEmail || "").toLowerCase();
        const fromSender = String(body.data?.from || "Remetente Externo");
        const inboundSubject = String(body.data?.subject || "Mensagem Recebida");
        const inboundEmailId = body.data?.email_id;

        let forwardTarget = "comercial3@wiseowe.com";
        let relayFrom = "Wiseowe Industrie <comercial3@fr.wiseowe.com>";

        if (toAddr.includes("it.wiseowe.com") || (toAddr.includes("wiseowe.com") && toAddr.includes("comercial4@"))) {
          forwardTarget = "comercial4@wiseowe.com";
          relayFrom = "Wiseowe Servizi Industriali <comercial4@it.wiseowe.com>";
        } else if (toAddr.includes("es.wiseowe.com") || toAddr.includes("comercial2@")) {
          forwardTarget = "comercial2@wiseowe.com";
          relayFrom = "Wiseowe Servicios Industriales <comercial2@es.wiseowe.com>";
        } else if (toAddr.includes("fr.wiseowe.com") || toAddr.includes("comercial3@")) {
          forwardTarget = "comercial3@wiseowe.com";
          relayFrom = "Wiseowe Industrie <comercial3@fr.wiseowe.com>";
        } else if (toAddr.includes("triangulolda.com") || toAddr.includes("comercial4@")) {
          forwardTarget = "comercial4@triangulolda.com";
          relayFrom = "Triángulo Servicios Industriales <comercial4@es.triangulolda.com>";
        } else if (toAddr.includes("luminousalley.com") || toAddr.includes("comercial1@")) {
          forwardTarget = "comercial1@luminousalley.com";
          relayFrom = "Luminous Alley <comercial1@mail.luminousalley.com>";
        }

        let htmlContent = body.data?.html || "";
        let textContent = body.data?.text || "";

        // Se o payload do webhook trouxer apenas o email_id, buscar o corpo completo na API de Inbound do Resend
        if ((!htmlContent && !textContent) && inboundEmailId && resendApiKey) {
          const getRes = await fetch(`https://api.resend.com/emails/receiving/${inboundEmailId}`, {
            headers: { "Authorization": `Bearer ${resendApiKey}` },
          });
          if (getRes.ok) {
            const fullEmail = await getRes.json();
            htmlContent = fullEmail.html || "";
            textContent = fullEmail.text || "";
          }
        }

        if (resendApiKey) {
          const bannerHtml = `<div style="background:#0f172a;color:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-family:Arial,sans-serif;font-size:13px;">
            <strong>📩 Mensagem / Verificação Anti-Spam Recebida no Subdomínio (${toAddr})</strong><br/>
            <strong>De:</strong> ${fromSender}<br/>
            <strong>Assunto Original:</strong> ${inboundSubject}
          </div>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: relayFrom,
              to: [forwardTarget],
              reply_to: fromSender,
              subject: `[Encaminhado / Verificação] ${inboundSubject}`,
              html: htmlContent ? `${bannerHtml}${htmlContent}` : `${bannerHtml}<pre style="font-family:sans-serif;white-space:pre-wrap;">${textContent || "(Sem conteúdo textual)"}</pre>`,
              text: `De: ${fromSender}\nPara: ${toAddr}\n\n${textContent || ""}`,
            }),
          });
          console.log(`[INBOUND FORWARD] E-mail de ${fromSender} para ${toAddr} encaminhado para ${forwardTarget}`);
        }
      } catch (fwdErr: any) {
        console.error("Erro ao encaminhar email.received:", fwdErr.message);
      }

      return new Response(JSON.stringify({ forwarded: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!eventType || !recipientEmail) {
      return new Response(JSON.stringify({ message: "Payload sem tipo ou destinatário." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clickedLink = String(body.data?.click?.link || body.data?.click?.url || "").toLowerCase();
    const isOptOutLinkClick = clickedLink.includes("opt_out=1") || clickedLink.includes("unsubscribe");

    const isOpenOrClick =
      (eventType === "email.opened" ||
        eventType === "email.clicked" ||
        eventType === "email.aberto" ||
        eventType === "email.clicado") &&
      !isOptOutLinkClick;

    const rawEmail = recipientEmail.toLowerCase().trim();
    const cleanEmail = rawEmail.includes("<") && rawEmail.includes(">") 
      ? rawEmail.replace(/.*<([^>]+)>.*/, "$1").trim() 
      : rawEmail;

    const resendEmailId = body.data?.email_id;

    // Extração de tags do Resend (podem vir como array [{ name, value }] ou objeto { name: value })
    let tagLeadId: string | null = null;
    let tagCampaignId: string | null = null;
    const rawTags = body.data?.tags;
    if (Array.isArray(rawTags)) {
      for (const t of rawTags) {
        if (t.name === "lead_id" || t.key === "lead_id") tagLeadId = String(t.value);
        if (t.name === "campaign_id" || t.key === "campaign_id") tagCampaignId = String(t.value);
      }
    } else if (rawTags && typeof rawTags === "object") {
      tagLeadId = rawTags.lead_id ? String(rawTags.lead_id) : null;
      tagCampaignId = rawTags.campaign_id ? String(rawTags.campaign_id) : null;
    }

    // Detecção da empresa pelo remetente (header 'from') ou TLD do destinatário
    const fromHeader = String(body.data?.from || "").toLowerCase();
    let hintEmpresaId: string | null = null;
    const WISEOWE_ID = "dae64d51-2181-4510-b14f-e63d2f111a8e";
    const TRIANGULO_ID = "a798620a-358a-4c6c-9db2-3a507c583cac";
    const LUMINOUS_ID = "847796c4-b253-4e53-9e6b-34a127ec7d85";

    if (fromHeader.includes("wiseowe") || fromHeader.includes("es.wiseowe.com") || fromHeader.includes("fr.wiseowe.com") || cleanEmail.endsWith(".fr")) {
      hintEmpresaId = WISEOWE_ID;
    } else if (fromHeader.includes("triangulolda") || fromHeader.includes("es.triangulolda.com") || fromHeader.includes("it.triangulolda.com")) {
      hintEmpresaId = TRIANGULO_ID;
    } else if (fromHeader.includes("luminousalley") || fromHeader.includes("luminous")) {
      hintEmpresaId = LUMINOUS_ID;
    }

    let lead: any = null;
    let queueItem: any = null;

    // 1. Busca prioritária por tagLeadId
    if (tagLeadId) {
      const { data: leadData } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("id, stage_id, empresa_id, email, name, tags, notes")
        .eq("id", tagLeadId)
        .maybeSingle();

      if (leadData) {
        lead = leadData;
      }
    }

    // 2. Busca por resend_email_id na fila da campanha
    if (!lead && resendEmailId) {
      const { data: queueItems } = await supabase
        .schema("core_comercial")
        .from("marketing_campaign_queue")
        .select("id, lead_id, campaign_id, status")
        .eq("resend_email_id", resendEmailId)
        .limit(1);

      if (queueItems && queueItems.length > 0) {
        queueItem = queueItems[0];
        if (queueItem.lead_id) {
          const { data: leadData } = await supabase
            .schema("core_comercial")
            .from("leads")
            .select("id, stage_id, empresa_id, email, name, tags, notes")
            .eq("id", queueItem.lead_id)
            .maybeSingle();

          if (leadData) {
            lead = leadData;
          }
        }
      }
    }

    // 3. Fallback: busca por e-mail priorizando a empresa detectada
    if (!lead && cleanEmail) {
      if (hintEmpresaId) {
        const { data: hintedLeads } = await supabase
          .schema("core_comercial")
          .from("leads")
          .select("id, stage_id, empresa_id, email, name, tags, notes")
          .ilike("email", cleanEmail)
          .eq("empresa_id", hintEmpresaId)
          .limit(1);

        if (hintedLeads && hintedLeads.length > 0) {
          lead = hintedLeads[0];
        }
      }

      if (!lead) {
        const { data: leads } = await supabase
          .schema("core_comercial")
          .from("leads")
          .select("id, stage_id, empresa_id, email, name, tags, notes")
          .ilike("email", cleanEmail)
          .limit(1);

        if (leads && leads.length > 0) {
          lead = leads[0];
        }
      }
    }

    // 4. Processar abertura ou clique
    if (isOpenOrClick && lead) {
      const effectiveCampaignId = queueItem?.campaign_id || tagCampaignId;
      await markLeadAsRead(supabase, lead.id, effectiveCampaignId, hintEmpresaId);
    }

    // 4. Processar Bounces ou Falhas
    const isBounce = eventType === "email.bounced" || eventType === "email.failed";
    if (isBounce) {
      if (queueItem?.id) {
        await supabase
          .schema("core_comercial")
          .from("marketing_campaign_queue")
          .update({ status: "failed", error_message: "Bounce / Falha de entrega no Resend" })
          .eq("id", queueItem.id);
      }
      if (lead) {
        const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
        if (!leadTags.includes("Bounce")) {
          await supabase
            .schema("core_comercial")
            .from("leads")
            .update({
              tags: [...leadTags, "Bounce"],
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, event: eventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro no resend-webhook:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
