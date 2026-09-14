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
      .select("id, stage_id, empresa_id, email, name, tags")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) return;

    let targetEmpresaId = hintEmpresaId || lead.empresa_id;

    if (campaignId) {
      const { data: campaign } = await supabase
        .schema("core_comercial")
        .from("marketing_campaigns")
        .select("empresa_id")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaign?.empresa_id) {
        targetEmpresaId = campaign.empresa_id;
      }
    }

    if (!targetEmpresaId) targetEmpresaId = lead.empresa_id;
    if (!targetEmpresaId) return;

    const { data: stages3 } = await supabase
      .schema("core_comercial")
      .from("kanban_stages")
      .select("id, order_index")
      .eq("empresa_id", targetEmpresaId)
      .eq("order_index", 3)
      .limit(1);

    let stage3 = stages3 && stages3.length > 0 ? stages3[0] : null;
    if (!stage3) {
      const { data: altStages3 } = await supabase
        .schema("core_comercial")
        .from("kanban_stages")
        .select("id, order_index")
        .eq("empresa_id", targetEmpresaId)
        .or("name.ilike.%Lido%,name.ilike.%Clicado%")
        .limit(1);
      stage3 = altStages3 && altStages3.length > 0 ? altStages3[0] : null;
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

    if (targetEmpresaId && targetEmpresaId !== lead.empresa_id) {
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

  // --- TRATAMENTO DE PIXEL DE ABERTURA (GET) ---
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const leadId = url.searchParams.get("lead_id");
      const campaignId = url.searchParams.get("campaign_id");

      if (leadId && leadId !== "undefined" && leadId !== "null") {
        await markLeadAsRead(supabase, leadId, campaignId);
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

    const eventType = body.type; // e.g. "email.opened", "email.clicked", "email.bounced"
    const recipientEmail = body.data?.to?.[0];

    if (!eventType || !recipientEmail) {
      return new Response(JSON.stringify({ message: "Payload sem tipo ou destinatário." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOpenOrClick =
      eventType === "email.opened" ||
      eventType === "email.clicked" ||
      eventType === "email.aberto" ||
      eventType === "email.clicado";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const TRIANGULO_ID = "a0000000-0000-0000-0000-000000000001";
    const LUMINOUS_ID = "847796c4-d1ee-4a87-ba86-25f08cb6fb3f";

    if (fromHeader.includes("wiseowe") || fromHeader.includes("fr.wiseowe.com") || cleanEmail.endsWith(".fr")) {
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
