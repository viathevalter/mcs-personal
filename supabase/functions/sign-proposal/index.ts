import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // 4. Buscar email do destinatário (Cliente ou Lead)
    let emailUsed = "desconhecido@stoco.es";
    if (est.client_id) {
      const { data: client, error: clientErr } = await supabase
        .schema("core_common")
        .from("clients")
        .select("email")
        .eq("id", est.client_id)
        .single();
      if (!clientErr && client && client.email) {
        emailUsed = client.email;
      }
    } else if (est.lead_id) {
      const { data: lead, error: leadErr } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("email")
        .eq("id", est.lead_id)
        .single();
      if (!leadErr && lead && lead.email) {
        emailUsed = lead.email;
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
