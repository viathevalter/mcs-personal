import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    let lead: any = null;
    let queueItem: any = null;

    // 1. Busca prioritária por resend_email_id na fila da campanha
    if (resendEmailId) {
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

    // 2. Fallback: busca direta por e-mail na tabela de leads
    if (!lead && cleanEmail) {
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

    // 3. Processar abertura ou clique
    if (isOpenOrClick && lead && lead.empresa_id) {
      // Fetch 'E-mail Lido / Clicado' stage (order_index = 3) for this specific company
      const { data: stages3 } = await supabase
        .schema("core_comercial")
        .from("kanban_stages")
        .select("id, order_index")
        .eq("empresa_id", lead.empresa_id)
        .eq("order_index", 3)
        .limit(1);

      let stage3 = stages3 && stages3.length > 0 ? stages3[0] : null;
      if (!stage3) {
        const { data: altStages3 } = await supabase
          .schema("core_comercial")
          .from("kanban_stages")
          .select("id, order_index")
          .eq("empresa_id", lead.empresa_id)
          .or("name.ilike.%Lido%,name.ilike.%Clicado%")
          .limit(1);
        stage3 = altStages3 && altStages3.length > 0 ? altStages3[0] : null;
      }

      if (stage3) {
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

        // Move to Stage 3 if lead is currently in Stage 1 or 2
        if (stage3.order_index > currentOrderIndex) {
          await supabase
            .schema("core_comercial")
            .from("leads")
            .update({
              stage_id: stage3.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.id);

          console.log(`Lead ${lead.id} (${cleanEmail}) promovido para Estágio 3 (E-mail Lido/Clicado) via Webhook (${eventType}) da Empresa ${lead.empresa_id}.`);
        }
      }
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
