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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Recebido Webhook do Resend:", JSON.stringify(body));

    const eventType = body.type; // ex: 'email.clicked', 'email.opened', 'email.bounced'
    const eventData = body.data;

    if (!eventType || !eventData) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        headers: corsHeaders(),
        status: 400,
      });
    }

    const emailId = eventData.email_id;
    const recipient = eventData.to?.[0];
    
    // Obter tags do Resend (podem vir formatadas como objeto ou array dependendo da versão)
    let leadId = eventData.tags?.lead_id;
    let queueId = eventData.tags?.queue_id;
    let campaignId = eventData.tags?.campaign_id;

    // Se as tags vierem como array, convertemos para busca simplificada
    if (Array.isArray(eventData.tags)) {
      const leadTag = eventData.tags.find((t: any) => t.name === "lead_id");
      const queueTag = eventData.tags.find((t: any) => t.name === "queue_id");
      const campaignTag = eventData.tags.find((t: any) => t.name === "campaign_id");
      if (leadTag) leadId = leadTag.value;
      if (queueTag) queueId = queueTag.value;
      if (campaignTag) campaignId = campaignTag.value;
    }

    console.log(`Evento: ${eventType} | Destinatário: ${recipient} | Lead ID: ${leadId} | Queue ID: ${queueId}`);

    // Se não tivermos o leadId via tags, tentamos buscar pelo e-mail
    if (!leadId && recipient) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, empresa_id")
        .eq("email", recipient)
        .limit(1)
        .maybeSingle();
      if (leadData) {
        leadId = leadData.id;
      }
    }

    if (!leadId) {
      console.warn("Lead não encontrado para o e-mail/tag recebido. Ignorando atualização de estágio.");
    }

    // 1. Gravar a interação na tabela lead_interactions
    let details = "";
    if (eventType === "email.clicked" && eventData.click?.url) {
      details = `Clicou no link: ${eventData.click.url}`;
    } else if (eventType === "email.bounced") {
      details = eventData.bounce?.message || "E-mail rejeitado.";
    }

    // Registrar a interação se tivermos mapeado o queueId
    if (queueId) {
      let interactionType = "open";
      if (eventType === "email.clicked") interactionType = "click";
      if (eventType === "email.bounced") interactionType = "bounce";

      await supabase.from("lead_interactions").insert({
        queue_id: queueId,
        interaction_type: interactionType,
        details: details || null,
      });

      // Se for bounce, atualizamos o item da fila para bounced
      if (eventType === "email.bounced") {
        await supabase
          .from("marketing_campaign_queue")
          .update({ status: "bounced" })
          .eq("id", queueId);
      }
    }

    // 2. Mover o Lead de estágio se houver interação positiva (abertura ou clique)
    if (leadId) {
      // Buscar dados do lead para descobrir qual a empresa dele
      const { data: lead } = await supabase
        .from("leads")
        .select("empresa_id, stage_id")
        .eq("id", leadId)
        .single();

      if (lead) {
        let targetStageName = "";
        
        if (eventType === "email.clicked") {
          targetStageName = "Interessado";
        }

        if (targetStageName) {
          // Buscar o ID do estágio correspondente na empresa do lead
          const { data: stage } = await supabase
            .from("kanban_stages")
            .select("id")
            .eq("empresa_id", lead.empresa_id)
            .eq("name", targetStageName)
            .single();

          if (stage && lead.stage_id !== stage.id) {
            await supabase
              .from("leads")
              .update({
                stage_id: stage.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", leadId);

            console.log(`Lead ${leadId} movido para estágio '${targetStageName}' com sucesso.`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders(),
      status: 200,
    });
  } catch (err: any) {
    console.error("Erro no processamento do webhook:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: corsHeaders(),
      status: 500,
    });
  }
});
