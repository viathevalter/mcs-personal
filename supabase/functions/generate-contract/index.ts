import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createReport } from "npm:docx-templates@4.13.0";

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const { worker_id, assignment_id, contratante, contract_type } = await req.json();

    if (!worker_id || !contratante || !contract_type) {
      return new Response(
        JSON.stringify({ error: "Parâmetros worker_id, contratante e contract_type são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar informações do trabalhador
    const { data: worker, error: workerErr } = await supabase
      .schema("core_personal")
      .from("workers")
      .select("*")
      .eq("id", worker_id)
      .single();

    if (workerErr || !worker) {
      throw new Error(`Trabalhador não encontrado: ${workerErr?.message}`);
    }

    // 2. Buscar informações da alocação se informada, caso contrário buscar a mais recente do trabalhador
    let assignment = null;
    if (assignment_id) {
      const { data: assoc, error: assocErr } = await supabase
        .schema("core_personal")
        .from("vw_worker_allocations")
        .select("*")
        .eq("assignment_id", assignment_id)
        .single();
      
      if (!assocErr && assoc) {
        assignment = assoc;
      }
    } else {
      const { data: assoc, error: assocErr } = await supabase
        .schema("core_personal")
        .from("vw_worker_allocations")
        .select("*")
        .eq("cod_colab", worker.cod_colab)
        .order("fechainiciopedido", { ascending: false })
        .limit(1);
      
      if (!assocErr && assoc && assoc.length > 0) {
        assignment = assoc[0];
      }
    }

    // Mapear caminho do template .docx no bucket 'contract-templates'
    const upperContratante = contratante.toUpperCase();
    let templateFileName = "";
    if (contract_type === "contrato_nis") {
      templateFileName = `${contratante}/CONTRATO NIS - ${upperContratante}.docx`;
    } else if (contract_type === "contrato_termo_incerto") {
      templateFileName = `${contratante}/CONTRATO TERMO INCERTO - ${upperContratante}.docx`;
    } else if (contract_type === "contrato_alta") {
      templateFileName = `${contratante}/CONTRATO DE ALTA - ${upperContratante}.docx`;
    } else if (contract_type === "niss") {
      templateFileName = `${contratante}/CONTRATO DE TRABALHO - ${upperContratante} - NISS.docx`;
    } else if (contract_type === "trabalho_geral") {
      templateFileName = `${contratante}/CONTRATO DE TRABALHO - ${upperContratante}.docx`;
    } else if (contract_type === "termo_incerto") {
      templateFileName = `${contratante}/CONTRATO TERMO INCERTO - ${upperContratante} - ALTA.docx`;
    } else if (contract_type === "rescisao") {
      templateFileName = `${contratante}/COMUNICADO RESCISÃO ${upperContratante}.docx`;
    } else {
      throw new Error(`Tipo de contrato desconhecido: ${contract_type}`);
    }

    console.log(`Baixando template do Storage: ${templateFileName}`);

    // 3. Download do template do Supabase Storage
    const { data: templateBlob, error: downloadErr } = await supabase.storage
      .from("contract-templates")
      .download(templateFileName);

    if (downloadErr || !templateBlob) {
      throw new Error(`Falha ao baixar template do storage (${templateFileName}): ${downloadErr?.message}`);
    }

    const templateBuffer = new Uint8Array(await templateBlob.arrayBuffer());

    // 4. Preparar dados para mesclagem
    const mergeData = {
      nome: worker.nome || "",
      nome_completo: worker.nome || "",
      nif: worker.nif || "",
      niss: worker.niss || "",
      nie: worker.nie || "",
      dni: worker.dni || "",
      pasaporte: worker.pasaporte || "",
      nacionalidade: worker.nacionalidade || "",
      morada: worker.morada || "",
      data_nascimento: worker.fecha_nacimiento || "",
      contato: worker.movil || "",
      
      cliente: assignment?.client_name || "Trabalho Temporário",
      cliente_nome: assignment?.client_name || "Trabalho Temporário",
      obra_local: assignment?.client_site_name || "Instalações do Cliente",
      
      data_inicio: assignment?.planned_start_date || assignment?.start_date || new Date().toISOString().split("T")[0],
      funcao: assignment?.job_function_name_snapshot || worker.funcion || "Colaborador",
      salario_base: assignment?.salario_base || "A combinar",
    };

    console.log("Mesclando variáveis no arquivo Word...");

    // 5. Mesclar variáveis usando docx-templates
    const generatedDoc = await createReport({
      template: templateBuffer,
      data: mergeData,
      cmdDelimiter: ["{{", "}}"],
    });

    // 6. Fazer upload do arquivo Word preenchido para o bucket 'worker-contracts'
    const generatedFileName = `${worker.id}/${contract_type}_${Date.now()}.docx`;
    
    console.log(`Fazendo upload do arquivo gerado para: ${generatedFileName}`);
    const { error: uploadErr } = await supabase.storage
      .from("worker-contracts")
      .upload(generatedFileName, generatedDoc, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Falha ao salvar documento gerado no storage: ${uploadErr.message}`);
    }

    // 7. Gerar OTP e Token para o registro do banco
    const signatureToken = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Código OTP de 6 dígitos
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Válido por 24 horas

    const isAlta = contract_type === "contrato_alta";
    const status = isAlta ? "no_signature" : "pending_signature";

    // Inserir registro na tabela de contratos
    const contractPayload = {
      empresa_id: worker.empresa_id,
      worker_id: worker.id,
      assignment_id: assignment_id || null,
      contratante,
      contract_type,
      status,
      document_url: generatedFileName,
      signature_token: isAlta ? null : signatureToken,
      otp_code: isAlta ? null : otpCode,
      otp_expires_at: isAlta ? null : otpExpiresAt.toISOString(),
      sent_at: isAlta ? null : new Date().toISOString(),
      created_by: null, // Pode ser preenchido se houver auth nas Edge Functions
    };

    const { data: contract, error: contractInsertErr } = await supabase
      .schema("core_personal")
      .from("contracts")
      .insert(contractPayload)
      .select()
      .single();

    if (contractInsertErr || !contract) {
      throw new Error(`Erro ao salvar registro de contrato no banco de dados: ${contractInsertErr?.message}`);
    }

    // 8. Enviar E-mail (Resend se configurado, senão devolvemos o OTP no JSON para testes/fallback)
    const signingLink = isAlta ? "" : `${req.headers.get("origin") || "http://localhost:5173"}/assinar/${signatureToken}`;
    let emailSent = false;

    if (!isAlta && resendApiKey && worker.email) {
      try {
        console.log(`Enviando e-mail de assinatura para: ${worker.email}`);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Mastercorp Contratos <contratos@mastercorp.pt>",
            to: worker.email,
            subject: `Assinatura de Contrato - ${contratante}`,
            html: `
              <h2>Olá, ${worker.nome}!</h2>
              <p>Seu contrato de trabalho com a empresa <strong>${contratante}</strong> está pronto para assinatura eletrônica.</p>
              <p>Por favor, acesse o link abaixo para visualizar o contrato e realizar a assinatura:</p>
              <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar e Assinar Contrato</a></p>
              <br/>
              <p>Seu código de validação OTP é: <strong>${otpCode}</strong></p>
              <p>Este link e código expiram em 24 horas.</p>
              <p>Se tiver alguma dúvida, entre em contato com o setor de RH.</p>
            `,
          }),
        });

        if (res.ok) {
          emailSent = true;
        } else {
          console.error("Falha ao enviar e-mail via Resend:", await res.text());
        }
      } catch (errEmail) {
        console.error("Erro na integração do e-mail:", errEmail);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contract_id: contract.id,
        signature_token: isAlta ? null : signatureToken,
        otp_code: isAlta ? null : otpCode, // Devolvido para testes
        signing_link: isAlta ? null : signingLink,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na geração do contrato:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
