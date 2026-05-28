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
    const { token, otp_code, ip_address, user_agent } = await req.json();

    if (!token || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Parâmetros token e otp_code são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar o contrato pelo token de assinatura
    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("signature_token", token)
      .schema("core_personal")
      .single();

    if (contractErr || !contract) {
      return new Response(
        JSON.stringify({ error: "Contrato não encontrado ou token inválido." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contract.status !== "pending_signature") {
      return new Response(
        JSON.stringify({ error: `Este contrato já está no status: ${contract.status}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validar OTP e expiração
    if (contract.otp_code !== otp_code) {
      return new Response(
        JSON.stringify({ error: "Código de verificação OTP inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(contract.otp_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "O código OTP expirou. Por favor, solicite a reemissão do contrato." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar e-mail do trabalhador
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("email, name")
      .eq("id", contract.worker_id)
      .schema("core_personal")
      .single();

    if (workerErr || !worker) {
      throw new Error(`Erro ao obter dados do trabalhador: ${workerErr?.message}`);
    }

    // 4. Inserir log de auditoria
    const auditPayload = {
      contract_id: contract.id,
      ip_address: ip_address || "0.0.0.0",
      user_agent: user_agent || "Desconhecido",
      verification_code: otp_code,
      email_or_phone_used: worker.email || "e-mail-nao-cadastrado@mastercorp.pt",
    };

    const { error: auditErr } = await supabase
      .from("contract_audit_logs")
      .insert(auditPayload)
      .schema("core_personal");

    if (auditErr) {
      throw new Error(`Falha ao registrar log de auditoria: ${auditErr.message}`);
    }

    // 5. Atualizar o status do contrato para 'signed'
    const { error: updateErr } = await supabase
      .from("contracts")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        otp_code: null, // Limpa o OTP usado
        otp_expires_at: null,
      })
      .eq("id", contract.id)
      .schema("core_personal");

    if (updateErr) {
      throw new Error(`Falha ao atualizar status do contrato: ${updateErr.message}`);
    }

    // 6. Atualizar status do trabalhador e da alocação se necessário
    // Por exemplo, marcar a alocação relacionada como confirmada ou ativa.
    if (contract.assignment_id) {
      await supabase
        .from("worker_assignments")
        .update({ status: "active", start_date: new Date().toISOString().split("T")[0] })
        .eq("id", contract.assignment_id)
        .schema("core_personal");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contrato assinado eletronicamente com sucesso!",
        signed_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na assinatura do contrato:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
