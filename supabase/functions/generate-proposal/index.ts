import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createReport } from "npm:docx-templates@4.13.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

async function normalizeDocxTemplates(templateBuffer: Uint8Array): Promise<Uint8Array> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(templateBuffer);
    let modified = false;
    for (const [path, file] of Object.entries(zip.files)) {
      if (path.endsWith('.xml')) {
        let content = await file.async('string');
        const originalContent = content;

        // 1. Clean split XML tags inside {{...}}
        if (content.includes('{{')) {
          content = content.replace(/\{\{([\s\S]*?)\}\}/g, (match, p1) => {
            const cleaned = p1.replace(/<[^>]+>/g, '');
            return `{{${cleaned}}}`;
          });
        }

        // 2. Normalize IMAGE: tags (compatibility)
        if (/\{\{\s*IMAGE\s*:\s*[a-zA-Z0-9_]+\s*\}\}/i.test(content) || content.includes('IMAGE:')) {
          console.log(`[normalizeDocx] Normalizing IMAGE: tags in ${path}`);
          content = content.replace(/\{\{\s*IMAGE\s*:\s*([a-zA-Z0-9_]+)\s*\}\}/gi, '{{IMAGE $1}}');
        }

        if (content !== originalContent) {
          console.log(`[normalizeDocx] Saved normalized XML content for ${path}`);
          zip.file(path, content);
          modified = true;
        }
      }
    }
    if (modified) {
      return await zip.generateAsync({ type: 'uint8array' });
    }
    return templateBuffer;
  } catch (err) {
    console.error("[normalizeDocx] Error normalising docx template:", err);
    return templateBuffer;
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendMailViaGraph(
  senderEmail: string,
  senderName: string,
  targetEmail: string,
  subject: string,
  htmlContent: string,
  microsoftCredentials?: { tenantId?: string; clientId?: string; clientSecret?: string }
): Promise<{ success: boolean; error?: string; tokenClaims?: any }> {
  try {
    const tenantId = microsoftCredentials?.tenantId || Deno.env.get('SHAREPOINT_TENANT_ID');
    const clientId = microsoftCredentials?.clientId || Deno.env.get('SHAREPOINT_CLIENT_ID');
    const clientSecret = microsoftCredentials?.clientSecret || Deno.env.get('SHAREPOINT_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      console.warn("Microsoft Graph configurations are missing.");
      return { success: false, error: "Microsoft Graph secrets are missing." };
    }

    // 1. Obter Token de Acesso
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const formData = new URLSearchParams();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'https://graph.microsoft.com/.default');
    formData.append('grant_type', 'client_credentials');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Failed to authenticate Microsoft Graph token:", errText);
      return { success: false, error: `Auth Token Error: ${errText}` };
    }

    const { access_token } = await tokenRes.json();

    // Decode token claims for debugging
    let tokenClaims = {};
    try {
      const parts = access_token.split('.');
      if (parts.length > 1) {
        const payloadDecoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        tokenClaims = JSON.parse(payloadDecoded);
      }
    } catch (e) {
      console.error("Error decoding token claims:", e);
    }

    // 2. Disparar email via Microsoft Graph API
    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
    const mailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: targetEmail,
            },
          },
        ],
      },
      saveToSentItems: "true",
    };

    console.log(`Disparando e-mail Microsoft Graph via ${senderEmail} para ${targetEmail}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail enviado com sucesso via Microsoft Graph e gravado nos itens enviados.");
      return { success: true, tokenClaims };
    } else {
      const errText = await graphRes.text();
      console.error("Falha no Microsoft Graph sendMail:", errText);
      return { success: false, error: `Microsoft Graph API Error (Status ${graphRes.status}): ${errText}`, tokenClaims };
    }
  } catch (err) {
    console.error("Erro na integração do e-mail via Microsoft Graph:", err);
    return { success: false, error: `Exception: ${err.message || err}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const { estimacion_id, client_email } = await req.json();

    if (!estimacion_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetro estimacion_id é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar a estimación base
    const { data: est, error: estErr } = await supabase
      .schema("core_comercial")
      .from("estimaciones")
      .select("*")
      .eq("id", estimacion_id)
      .single();

    if (estErr || !est) {
      throw new Error(`Estimación não encontrada: ${estErr?.message}`);
    }

    // Se um e-mail customizado foi fornecido, salvar na estimativa
    if (client_email) {
      console.log(`[generate-proposal] Salvando contact_email customizado: ${client_email}`);
      const { error: updateEmailErr } = await supabase
        .schema("core_comercial")
        .from("estimaciones")
        .update({ contact_email: client_email })
        .eq("id", estimacion_id);

      if (updateEmailErr) {
        console.warn(`[generate-proposal] Erro ao salvar e-mail na estimativa: ${updateEmailErr.message}`);
      } else {
        est.contact_email = client_email;
      }
    }

    // 2. Buscar dados da empresa remetente
    const { data: empresa, error: empErr } = await supabase
      .schema("core_common")
      .from("empresas")
      .select("*")
      .eq("id", est.empresa_id)
      .single();

    if (empErr || !empresa) {
      throw new Error(`Empresa não encontrada: ${empErr?.message}`);
    }

    const senderEmail = empresa.proposal_sender_email || "vendas@stoco.es";
    const senderName = `${empresa.trade_name || empresa.legal_name || "Vendas"}`;

    // 3. Buscar dados do Cliente ou Lead (incluindo morada e nif do cliente)
    let targetName = "";
    let targetEmail = "";
    let targetPhone = "";
    let targetCompany = "";
    let clientAddress = "";
    let clientTaxId = "";

    if (est.client_id) {
      const { data: client, error: clientErr } = await supabase
        .schema("core_common")
        .from("clients")
        .select("*")
        .eq("id", est.client_id)
        .single();
      
      if (!clientErr && client) {
        targetName = est.contact_name || client.trade_name || client.legal_name || "";
        targetEmail = est.contact_email || client.email || "";
        targetPhone = client.phone || "";
        targetCompany = client.legal_name || client.trade_name || "";
        clientTaxId = client.tax_id || client.vat_id || "";
        clientAddress = `${client.address_line || ""}, ${client.city || ""}, ${client.postal_code || ""} (${client.province || ""})`;
      }
    } else if (est.lead_id) {
      const { data: lead, error: leadErr } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("*")
        .eq("id", est.lead_id)
        .single();
      
      if (!leadErr && lead) {
        targetName = est.contact_name || lead.name || "";
        targetEmail = est.contact_email || lead.email || "";
        targetPhone = lead.phone || "";
        targetCompany = lead.company_name || "";
        clientAddress = lead.notes || ""; // Fallback
      }
    }

    // 3.5. Buscar dados do Obra/Local (client_site) para morada da obra
    let siteAddress = "";
    if (est.client_site_id) {
      const { data: site } = await supabase
        .schema("core_common")
        .from("client_sites")
        .select("*")
        .eq("id", est.client_site_id)
        .single();
      if (site) {
        siteAddress = `${site.address_line || ""}, ${site.city || ""}, ${site.postal_code || ""} (${site.province || ""})`;
      }
    }

    // 4. Buscar a versão atual e seus itens
    const versionId = est.current_version_id;
    if (!versionId) {
      throw new Error("A estimación não possui uma versão atual cadastrada.");
    }

    const { data: version, error: verErr } = await supabase
      .schema("core_comercial")
      .from("estimacion_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (verErr || !version) {
      throw new Error(`Versão não encontrada: ${verErr?.message}`);
    }

    const { data: items, error: itemsErr } = await supabase
      .schema("core_comercial")
      .from("estimacion_items")
      .select(`
        *,
        job_function:job_functions(name)
      `)
      .eq("estimacion_version_id", versionId);

    if (itemsErr) {
      throw new Error(`Erro ao buscar itens da estimativa: ${itemsErr.message}`);
    }

    const formattedItems = (items || []).map((item: any) => {
      const totalHours = Number(item.planned_total_hours || item.total_hours || 0);
      const sellRate = Number(item.sell_rate_hour || 0);
      const quantity = Number(item.quantity || 0);
      return {
        funcao: item.job_function_name_snapshot || item.job_function?.name || "Perfil",
        quantidade: quantity,
        horas_dia: item.planned_hours_per_day,
        dias_semana: item.planned_days_per_week,
        total_horas: totalHours,
        tarifa_venda: sellRate,
        valor_total: (quantity * totalHours * sellRate).toFixed(2),
      };
    });

    const docLang = est.document_language || 'pt';
    const folderName = empresa.trade_name?.toLowerCase().replace(/\s+/g, "_") || "default";

    // Helper to download templates with tiered fallbacks
    async function loadTemplate(type: 'proposta' | 'contrato', lang: string) {
      // Tier 1: Custom template for specific language: company/lang/type.docx
      const pathTier1 = `${folderName}/${lang}/${type}.docx`;
      console.log(`[Tier 1] Buscando template customizado no idioma (${lang}): ${pathTier1}`);
      const { data: b1 } = await supabase.storage.from("proposal-templates").download(pathTier1);
      if (b1) return b1;

      // Tier 2: Custom template (no language fallback): company/type.docx
      const pathTier2 = `${folderName}/${type}.docx`;
      console.log(`[Tier 2] Buscando template customizado (sem idioma): ${pathTier2}`);
      const { data: b2 } = await supabase.storage.from("proposal-templates").download(pathTier2);
      if (b2) return b2;

      // Tier 3: Global template for specific language: default_lang.docx
      const defaultName = type === 'proposta' 
        ? (lang === 'pt' ? 'default.docx' : `default_${lang}.docx`)
        : (lang === 'pt' ? 'default_contrato.docx' : `default_contrato_${lang}.docx`);
      console.log(`[Tier 3] Buscando template padrão global no idioma (${lang}): ${defaultName}`);
      const { data: b3 } = await supabase.storage.from("proposal-templates").download(defaultName);
      if (b3) return b3;

      // Tier 4: Global fallback template: default.docx
      const fallbackName = type === 'proposta' ? 'default.docx' : 'default_contrato.docx';
      console.log(`[Tier 4] Buscando template padrão global base (pt): ${fallbackName}`);
      const { data: b4 } = await supabase.storage.from("proposal-templates").download(fallbackName);
      if (b4) return b4;

      throw new Error(`Template padrão fallback ${fallbackName} não encontrado em proposal-templates. Por favor faça upload.`);
    }

    // 5. Baixar o template DOCX da proposta do storage 'proposal-templates'
    console.log(`Iniciando carregamento do template de proposta no idioma: ${docLang}`);
    const templateBlob = await loadTemplate('proposta', docLang);
    let templateBuffer = new Uint8Array(await templateBlob.arrayBuffer());
    templateBuffer = await normalizeDocxTemplates(templateBuffer);



    // 6. Mesclar os dados usando docx-templates
    const mergeData = {
      empresa_nome: empresa.legal_name || empresa.trade_name || "",
      empresa_nif: empresa.tax_id || empresa.vat_id || "",
      empresa_telefone: empresa.phone || empresa.mobile || "",
      empresa_email: senderEmail,
      empresa_morada: empresa.address_line || "",
      
      proposta_codigo: est.codigo || "",
      proposta_data: new Date(est.created_at).toLocaleDateString("pt-PT"),
      proposta_validade: est.validity_date ? new Date(est.validity_date).toLocaleDateString("pt-PT") : "",
      proposta_pagamento: est.payment_terms || "A combinar",
      proposta_notes: est.general_notes || "",
      
      cliente_nome: targetName,
      cliente_empresa: targetCompany,
      cliente_email: targetEmail,
      cliente_telefone: targetPhone,
      cliente_morada: clientAddress,
      cliente_nif: clientTaxId,

      obra_morada: siteAddress || "Instalações do Cliente",
      tarifa_tipo: "Completa",
      data_inicio: est.expected_start_date ? new Date(est.expected_start_date).toLocaleDateString("pt-PT") : "",
      data_fim: est.expected_end_date ? new Date(est.expected_end_date).toLocaleDateString("pt-PT") : "",
      condicoes_pagamento: est.payment_terms || "A combinar",

      itens: formattedItems,
      
      total_custo: (version.total_cost || 0).toFixed(2),
      total_receita: (version.total_revenue || 0).toFixed(2),
      margem_percentual: (version.margin_percent || 0).toFixed(2),

      // ALIASES EM ESPANHOL (Suporte aos modelos de presupuesto customizados)
      NUMERO_PRESUPUESTO: est.codigo || "",
      PRESUPUESTO_NUMERO: est.codigo || "",
      FECHA_EMISION: new Date(est.created_at).toLocaleDateString("es-ES"),
      PAIS: "España",
      CLIENTE_CONTRATANTE: targetCompany || targetName || "",
      UBICACION: siteAddress || "Instalaciones del Cliente",
      UBICACION_OBRA: siteAddress || "Instalaciones del Cliente",
      TIPO_TRABAJO: "Suministro de Mano de Obra",
      FECHA_INICIO: est.expected_start_date ? new Date(est.expected_start_date).toLocaleDateString("es-ES") : "",
      FECHA_FIN: est.expected_end_date ? new Date(est.expected_end_date).toLocaleDateString("es-ES") : "",
      TARIFA_APLICABLE: "Completa",
      CONDICIONES_PAGO: est.payment_terms || "A convenir",
      PLAZO_PAGO: est.payment_terms || "A convenir",
      VALIDEZ_PRESUPUESTO: est.validity_date ? Math.ceil((new Date(est.validity_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : "30",
      OBSERVACIONES: est.general_notes || "",
      CLIENTE_NIF: clientTaxId || "",
      CLIENTE_MORADA: clientAddress || "",
      PRESTADORA_NIF: empresa.tax_id || empresa.vat_id || "",
      PRESTADORA_MORADA: empresa.address_line || "",
      EPI_DESCRIPCION: "EPI básicos (calzado de seguridad, uniforme de trabajo, protectores auditivos, gafas de protección y casco).",
      NOTA_EPI: "Cualquier equipo especial o protección específica para a obra será proporcionada por EL CLIENTE, salvo pacto en contrario.",
      EPI_NOTA: "Cualquier equipo especial o protección específica para la obra será proporcionada por EL CLIENTE, salvo pacto en contrario.",
      
      // Assinaturas e Representantes
      NOMBRE_REPRESENTANTE_CLIENTE: targetName,
      NOMBRE_FIRMANTE_CLIENTE: targetName,
      CARGO_CLIENTE: "Representante Autorizado",
      CARGO_FIRMANTE_CLIENTE: "Representante Autorizado",
      EMPRESA_CLIENTE: targetCompany || "",
      EMAIL_FIRMANTE_CLIENTE: targetEmail,
      
      NOMBRE_REPRESENTANTE_PRESTADORA: empresa.trade_name || "MCS",
      NOMBRE_FIRMANTE_PRESTADORA: empresa.trade_name || "MCS",
      CARGO_FIRMANTE_PRESTADORA: "Administrador",
      EMPRESA_PRESTADORA: empresa.legal_name || empresa.trade_name || "",
      EMAIL_PRESTADORA: senderEmail,
      WEB_EMPRESA: "www.stoco.es",
    };

    console.log("Gerando proposta preenchida...");
    const generatedDoc = await createReport({
      template: templateBuffer,
      data: mergeData,
      cmdDelimiter: ["{{", "}}"],
      noSandbox: true,
      errorHandler: (err, command_code) => {
        console.error(`Erro ao processar tag proposta "${command_code}":`, err);
        let code = command_code;
        if ((!code || code === "undefined") && err && err.message) {
          const matchSpace = err.message.match(/Error executing command '(IMAGE\s+([^']+))'/i) || 
                             err.message.match(/Invalid command syntax: (IMAGE\s+([^']+))/i);
          if (matchSpace) {
            code = matchSpace[1];
          } else {
            const matchColon = err.message.match(/Error executing command '(IMAGE:([^']+))'/i) || 
                               err.message.match(/Invalid command syntax: (IMAGE:([^']+))/i);
            if (matchColon) {
              code = `IMAGE ${matchColon[2]}`;
            } else {
              const matchGeneral = err.message.match(/Invalid command syntax: (.*)/);
              if (matchGeneral) {
                code = matchGeneral[1];
              }
            }
          }
        }
        if (!code) return "";
        const codeUpper = code.toUpperCase();
        if (codeUpper.includes("FIRMA") || codeUpper.includes("SIGNATURE")) {
          const cleanCode = code.replace("IMAGE:", "IMAGE ");
          return `{{${cleanCode}}}`;
        }
        return "";
      }
    });

    let generatedContractDoc;
    if (est.custom_contract_url) {
      console.log(`Buscando contrato personalizado carregado em: ${est.custom_contract_url}`);
      const { data: customBlob, error: customErr } = await supabase.storage
        .from("proposal-templates")
        .download(est.custom_contract_url);
        
      if (customErr || !customBlob) {
        throw new Error(`Falha ao carregar o contrato personalizado do storage: ${customErr?.message || 'Arquivo não encontrado'}`);
      }
      generatedContractDoc = new Uint8Array(await customBlob.arrayBuffer());
    } else {
      // Baixar o template DOCX do contrato do storage 'proposal-templates'
      console.log(`Iniciando carregamento do template de contrato no idioma: ${docLang}`);
      const contractTemplateBlob = await loadTemplate('contrato', docLang);
      let contractTemplateBuffer = new Uint8Array(await contractTemplateBlob.arrayBuffer());
      contractTemplateBuffer = await normalizeDocxTemplates(contractTemplateBuffer);

      console.log("Gerando contrato preenchido...");
      generatedContractDoc = await createReport({
        template: contractTemplateBuffer,
        data: mergeData,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
          console.error(`Erro ao processar tag contrato "${command_code}":`, err);
          let code = command_code;
          if ((!code || code === "undefined") && err && err.message) {
            const matchSpace = err.message.match(/Error executing command '(IMAGE\s+([^']+))'/i) || 
                               err.message.match(/Invalid command syntax: (IMAGE\s+([^']+))/i);
            if (matchSpace) {
              code = matchSpace[1];
            } else {
              const matchColon = err.message.match(/Error executing command '(IMAGE:([^']+))'/i) || 
                                 err.message.match(/Invalid command syntax: (IMAGE:([^']+))/i);
              if (matchColon) {
                code = `IMAGE ${matchColon[2]}`;
              } else {
                const matchGeneral = err.message.match(/Invalid command syntax: (.*)/);
                if (matchGeneral) {
                  code = matchGeneral[1];
                }
              }
            }
          }
          if (!code) return "";
          const codeUpper = code.toUpperCase();
          if (codeUpper.includes("FIRMA") || codeUpper.includes("SIGNATURE")) {
            const cleanCode = code.replace("IMAGE:", "IMAGE ");
            return `{{${cleanCode}}}`;
          }
          return "";
        }
      });
    }

    // 7. Salvar ambos no bucket 'proposal-signatures'
    const docPath = `${est.id}/proposta_${Date.now()}.docx`;
    const { error: uploadErr } = await supabase.storage
      .from("proposal-signatures")
      .upload(docPath, generatedDoc, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Falha ao salvar proposta gerada no storage: ${uploadErr.message}`);
    }

    const contractDocPath = `${est.id}/contrato_${Date.now()}.docx`;
    const { error: uploadContractErr } = await supabase.storage
      .from("proposal-signatures")
      .upload(contractDocPath, generatedContractDoc, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadContractErr) {
      throw new Error(`Falha ao salvar contrato gerado no storage: ${uploadContractErr.message}`);
    }

    // 8. Gerar OTP e signature token
    const signatureToken = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // OTP 6 dígitos
    // OTP/Link validity: if the estimation has a validity_date, keep the link active until that date.
    // Otherwise, fallback to a longer period (e.g., 30 days) to avoid deactivating the link too soon.
    let otpExpiresAt = new Date();
    if (est.validity_date) {
      const parsedValDate = new Date(`${est.validity_date}T23:59:59`);
      if (!isNaN(parsedValDate.getTime())) {
        otpExpiresAt = parsedValDate;
      } else {
        otpExpiresAt.setDate(otpExpiresAt.getDate() + 30);
      }
    } else {
      otpExpiresAt.setDate(otpExpiresAt.getDate() + 30); // 30 days fallback
    }

    // Inserir registro em core_comercial.proposal_signatures
    const sigPayload = {
      empresa_id: est.empresa_id,
      estimacion_id: est.id,
      status: "pending_signature",
      document_url: docPath,
      contract_document_url: contractDocPath,
      signature_token: signatureToken,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt.toISOString(),
      sent_at: new Date().toISOString(),
    };

    const { data: sigRecord, error: sigInsertErr } = await supabase
      .schema("core_comercial")
      .from("proposal_signatures")
      .insert(sigPayload)
      .select()
      .single();

    if (sigInsertErr || !sigRecord) {
      throw new Error(`Falha ao registrar assinatura no banco: ${sigInsertErr?.message}`);
    }

    // Atualizar estimación status para sent
    await supabase
      .schema("core_comercial")
      .from("estimaciones")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", est.id);

    // 9. Enviar o email via Microsoft Graph API (Opção B)
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const signingLink = `${origin}/assinar-proposta/${signatureToken}`;
    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (targetEmail) {
      const lang = est.document_language || "pt";
      let subject = "";
      let htmlContent = "";

      if (lang === "es") {
        subject = `Propuesta y Contrato Comercial ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>¡Hola, ${targetName}!</h2>
          <p>La empresa <strong>${empresa.trade_name}</strong> ha enviado la propuesta comercial y el contrato correspondiente para su revisión.</p>
          <p>Por favor, haga clic en el enlace a continuación para leer los términos y realizar la firma electrónica de ambos documentos de forma unificada:</p>
          <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar y Firmar Documentos</a></p>
          <br/>
          <p>Su código de validación OTP es: <strong>${otpCode}</strong></p>
          <p>Este enlace y el código expiran en 48 horas.</p>
          <p>Si tiene alguna duda, responda directamente a este correo electrónico.</p>
        `;
      } else if (lang === "en") {
        subject = `Commercial Proposal and Contract ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Hello, ${targetName}!</h2>
          <p>The company <strong>${empresa.trade_name}</strong> has sent the commercial proposal and the respective contract for your review.</p>
          <p>Please click on the link below to read the terms and complete the electronic signature of both documents in a unified way:</p>
          <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">View and Sign Documents</a></p>
          <br/>
          <p>Your OTP validation code is: <strong>${otpCode}</strong></p>
          <p>This link and code expire in 48 hours.</p>
          <p>If you have any questions, please reply directly to this email.</p>
        `;
      } else if (lang === "it") {
        subject = `Proposta Commerciale e Contratto ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Ciao, ${targetName}!</h2>
          <p>La società <strong>${empresa.trade_name}</strong> ha inviato la proposta commerciale e il relativo contratto per la tua revisione.</p>
          <p>Per favore, clicca sul link sottostante per leggere i termini ed effettuare la firma elettronica di entrambi i documenti in modo unificato:</p>
          <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizza e Firma Documenti</a></p>
          <br/>
          <p>Il tuo codice di validazione OTP è: <strong>${otpCode}</strong></p>
          <p>Questo link e il codice scadono tra 48 ore.</p>
          <p>Se hai domande, rispondi direttamente a questa email.</p>
        `;
      } else if (lang === "fr") {
        subject = `Proposition Commerciale et Contrat ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Bonjour, ${targetName}!</h2>
          <p>L'entreprise <strong>${empresa.trade_name}</strong> a envoyé la proposition commerciale et le contrat respectif pour votre examen.</p>
          <p>Veuillez cliquer sur le lien ci-dessous pour lire les termes et procéder à la signature électronique des deux documents de manière unifiée :</p>
          <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualiser et Signer les Documents</a></p>
          <br/>
          <p>Votre code de validation OTP est : <strong>${otpCode}</strong></p>
          <p>Ce lien et le code expirent dans 48 heures.</p>
          <p>Si vous avez des questions, veuillez répondre directement à cet e-mail.</p>
        `;
      } else {
        // Default: pt
        subject = `Proposta e Contrato Comercial ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Olá, ${targetName}!</h2>
          <p>A empresa <strong>${empresa.trade_name}</strong> enviou a proposta comercial e o respectivo contrato para sua análise.</p>
          <p>Por favor, clique no link abaixo para ler os termos e realizar a assinatura eletrônica de ambos os documentos de forma unificada:</p>
          <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar e Assinar Documentos</a></p>
          <br/>
          <p>Seu código de validação OTP é: <strong>${otpCode}</strong></p>
          <p>Este link e o código expiram em 48 horas.</p>
          <p>Se tiver alguma dúvida, responda diretamente a este e-mail.</p>
        `;
      }

      let msCredentials: { tenantId?: string; clientId?: string; clientSecret?: string } | undefined = undefined;
      if (empresa && empresa.microsoft_tenant_id && empresa.microsoft_client_id && empresa.microsoft_client_secret) {
        msCredentials = {
          tenantId: empresa.microsoft_tenant_id,
          clientId: empresa.microsoft_client_id,
          clientSecret: empresa.microsoft_client_secret
        };
      }

      const mailResult = await sendMailViaGraph(
        senderEmail,
        senderName,
        targetEmail,
        subject,
        htmlContent,
        msCredentials
      );
      emailSent = mailResult.success;
      emailError = mailResult.error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_signature_id: sigRecord.id,
        signature_token: signatureToken,
        otp_code: otpCode,
        signing_link: signingLink,
        email_sent: emailSent,
        email_error: emailError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao gerar proposta:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
