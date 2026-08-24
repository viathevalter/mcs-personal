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

    if (isOpenOrClick) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const cleanEmail = recipientEmail.toLowerCase().trim();

      // Find lead by email
      const { data: leads } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("id, stage_id, empresa_id")
        .ilike("email", cleanEmail)
        .limit(1);

      const lead = leads && leads.length > 0 ? leads[0] : null;

      if (lead && lead.empresa_id) {
        // Fetch 'E-mail Lido / Clicado' stage (order_index = 3) for this specific company
        const { data: stages3 } = await supabase
          .schema("core_comercial")
          .from("kanban_stages")
          .select("id, order_index")
          .eq("empresa_id", lead.empresa_id)
          .or("order_index.eq.3,name.ilike.%Lido%,name.ilike.%Clicado%")
          .limit(1);

        const stage3 = stages3 && stages3.length > 0 ? stages3[0] : null;

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
