import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { createReport } from "npm:docx-templates@4.13.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

async function normalizeDocxTemplates(templateBuffer: Uint8Array): Promise<Uint8Array> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(templateBuffer);
    let modified = false;
    for (const [path, file] of Object.entries(zip.files)) {
      if (path.endsWith('.xml')) {
        let content = await file.async('string');
        const originalContent = content;

        // Clean split XML tags inside {{...}}
        if (content.includes('{{')) {
          content = content.replace(/\{\{([\s\S]*?)\}\}/g, (match, p1) => {
            const cleaned = p1.replace(/<[^>]+>/g, '');
            return `{{${cleaned}}}`;
          });
        }

        if (content !== originalContent) {
          zip.file(path, content);
          modified = true;
        }
      }
    }
    if (modified) {
      return await zip.generateAsync({ type: "uint8array" });
    }
  } catch (err: any) {
    console.error("[normalizeDocx] Error:", err.message);
  }
  return templateBuffer;
}

async function convertDocxToPdfViaGraph(
  accessToken: string,
  driveId: string,
  docxBase64: string,
  fileName: string
): Promise<{ name: string; contentType: string; contentBytes: string }> {
  try {
    // Decode base64 to binary
    const binaryString = atob(docxBase64);
    const docxBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      docxBytes[i] = binaryString.charCodeAt(i);
    }

    const tempPath = `/temp_conversions/temp_${Date.now()}_${fileName}`;
    const encodedPath = tempPath.split('/').map(c => encodeURIComponent(c)).join('/');
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;

    console.log(`[PDF Convert] Sending temp DOCX for conversion: ${tempPath}`);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      body: docxBytes,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error(`[PDF Convert] Upload temp docx failed: ${errText}`);
      throw new Error(`Upload temp docx failed: ${errText}`);
    }

    const item = await uploadRes.json();
    const itemId = item.id;

    let pdfBytes: Uint8Array;
    try {
      const convertUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content?format=pdf`;
      console.log(`[PDF Convert] Downloading PDF from Graph: ${convertUrl}`);
      const convertRes = await fetch(convertUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!convertRes.ok) {
        const errText = await convertRes.text();
        console.error(`[PDF Convert] Conversion endpoint failed: ${errText}`);
        throw new Error(`Conversion endpoint failed: ${errText}`);
      }

      pdfBytes = new Uint8Array(await convertRes.arrayBuffer());
    } finally {
      // Async delete in background
      fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }).catch(err => console.error("[PDF Convert] Failed to delete temp DOCX:", err));
    }

    // Convert pdfBytes back to base64
    const pdfBase64 = encode(pdfBytes);
    const pdfName = fileName.replace(/\.docx$/i, '.pdf');

    console.log(`[PDF Convert] Successfully converted ${fileName} to ${pdfName}`);
    return {
      name: pdfName,
      contentType: "application/pdf",
      contentBytes: pdfBase64,
    };
  } catch (err: any) {
    console.error(`[PDF Convert] Error during conversion of ${fileName}:`, err);
    // Return original as fallback
    return {
      name: fileName,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      contentBytes: docxBase64,
    };
  }
}

async function sendMailViaGraph(
  senderEmail: string,
  senderName: string,
  toEmails: string[],
  subject: string,
  htmlContent: string,
  attachments: EmailAttachment[] = [],
  microsoftCredentials?: { tenantId?: string; clientId?: string; clientSecret?: string },
  replyToEmail?: string
): Promise<{ success: boolean; error?: string }> {
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

    // 2. Disparar email via Microsoft Graph API
    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
    
    const toRecipients = toEmails.map(email => ({
      emailAddress: {
        address: email.trim(),
      },
    }));

    const mailPayload: any = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: toRecipients,
        attachments: attachments.map(att => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        })),
        ...(replyToEmail ? {
          replyTo: [{
            emailAddress: {
              address: replyToEmail.trim()
            }
          }]
        } : {})
      },
      saveToSentItems: true,
    };

    console.log(`Disparando e-mail de notificação de pedido via Microsoft Graph para: ${toEmails.join(', ')}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail de notificação de pedido enviado com sucesso.");
      return { success: true };
    } else {
      const errText = await graphRes.text();
      console.error("Falha no Microsoft Graph sendMail:", errText);
      return { success: false, error: `Microsoft Graph API Error: ${errText}` };
    }
  } catch (err: any) {
    console.error("Erro no envio de e-mail via Graph:", err);
    return { success: false, error: err.message };
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
    const { pedido_id, solicitud_id, empresa_id, to_emails, email_subject, email_body, is_faturamento, fatura_code, client_name, custom_attachments, sender_email, reply_to_email } = await req.json();

    if (!to_emails || !Array.isArray(to_emails) || to_emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "O parâmetro to_emails (array não vazio) é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedEmpresaId = empresa_id;
    let senderEmail = "vendas@stoco.es";
    let senderName = "Comercial";
    let attachments: EmailAttachment[] = [];
    let resolvedEmpresa: any = null;
    let msCredentials: { tenantId?: string; clientId?: string; clientSecret?: string } | undefined = undefined;
    
    if (custom_attachments && Array.isArray(custom_attachments)) {
      attachments.push(...custom_attachments);
    }

    let pedido: any = null;

    if (pedido_id) {
      // 1. Buscar o pedido
      const { data: pedidoData, error: pedidoErr } = await supabase
        .schema("core_comercial")
        .from("pedidos")
        .select("*")
        .eq("id", pedido_id)
        .single();

      if (pedidoErr || !pedidoData) {
        return new Response(
          JSON.stringify({ error: `Pedido não encontrado: ${pedidoErr?.message}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      pedido = pedidoData;
      resolvedEmpresaId = pedido.empresa_id;

      // Buscar dados relacionados do Cliente e Localização separadamente
      let client = null;
      if (pedido.client_id) {
        const { data: clientData, error: clientErr } = await supabase
          .schema("core_common")
          .from("clients")
          .select("*")
          .eq("id", pedido.client_id)
          .single();
        if (!clientErr) {
          client = clientData;
        }
      }

      let client_site = null;
      if (pedido.client_site_id) {
        const { data: siteData, error: siteErr } = await supabase
          .schema("core_common")
          .from("client_sites")
          .select("*")
          .eq("id", pedido.client_site_id)
          .single();
        if (!siteErr) {
          client_site = siteData;
        }
      }

      pedido.client = client;
      pedido.client_site = client_site;

      // 2. Buscar empresa
      const { data: empresa, error: empErr } = await supabase
        .schema("core_common")
        .from("empresas")
        .select("*")
        .eq("id", resolvedEmpresaId)
        .single();

      if (empErr || !empresa) {
        return new Response(
          JSON.stringify({ error: `Empresa não encontrada: ${empErr?.message}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedEmpresa = empresa;
      senderEmail = empresa.proposal_sender_email || senderEmail;
      senderName = empresa.trade_name || senderName;

      // 3. Buscar os itens do pedido (pedido_items)
      const { data: items, error: itemsErr } = await supabase
        .schema("core_comercial")
        .from("pedido_items")
        .select(`
          *,
          job_function:job_functions(name)
        `)
        .eq("pedido_id", pedido.id);

      if (itemsErr) {
        console.error("[send-order-notification] Erro ao carregar itens do pedido:", itemsErr.message);
      }

      // 4. Mapear os itens para o template Word
      const activeLang = (pedido.document_language || 'pt').toLowerCase();
      const mappedItens = (items || []).map((item: any) => {
        const translateBool = (val: boolean) => {
          if (activeLang === 'pt') return val ? 'Sim' : 'Não';
          if (activeLang === 'es') return val ? 'Sí' : 'No';
          if (activeLang === 'en') return val ? 'Yes' : 'No';
          if (activeLang === 'it') return val ? 'Sì' : 'No';
          if (activeLang === 'fr') return val ? 'Oui' : 'Non';
          return val ? 'Sim' : 'Não';
        };

        return {
          funcao: item.job_function?.name || item.job_function_name_snapshot || 'Função',
          quantidade: item.quantity_requested || 0,
          alojamento: translateBool(!!item.includes_housing),
          transporte: translateBool(!!item.includes_transport),
          epis: translateBool(!!item.includes_epi)
        };
      });

      // 5. Determinar os fallbacks de template
      const folderName = empresa.trade_name?.toLowerCase().replace(/\s+/g, '_') || 'default';
      const templatePaths = [
        `${folderName}/${activeLang}/pedido.docx`,
        `${folderName}/pedido.docx`,
        `default_pedido_${activeLang}.docx`,
        `default_pedido.docx`
      ];

      let templateBlob: Blob | null = null;
      for (const path of templatePaths) {
        console.log(`[send-order-notification] Tentando baixar template: ${path}`);
        const { data, error } = await supabase.storage
          .from("proposal-templates")
          .download(path);
        
        if (!error && data) {
          templateBlob = data;
          console.log(`[send-order-notification] Template encontrado em: ${path}`);
          break;
        }
      }

      if (!templateBlob) {
        return new Response(
          JSON.stringify({ error: "Nenhum modelo de pedido operacional (pedido.docx) foi encontrado no Storage." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 6. Processar o Word
      const templateBytes = new Uint8Array(await templateBlob.arrayBuffer());
      const normalizedTemplate = await normalizeDocxTemplates(templateBytes);

      const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Não definida';
        return new Date(dateStr).toLocaleDateString(
          activeLang === 'pt' ? 'pt-PT' : activeLang === 'es' ? 'es-ES' : activeLang === 'en' ? 'en-US' : activeLang === 'it' ? 'it-IT' : 'fr-FR'
        );
      };

      // 1. Alojamento Observation
      let alojamentoObs = "Alojamento próximo ao local da obra.";
      if (activeLang === 'es') alojamentoObs = "Alojamiento próximo al lugar de la obra.";
      else if (activeLang === 'en') alojamentoObs = "Lodging close to the work site.";
      else if (activeLang === 'it') alojamentoObs = "Alloggio vicino al cantiere.";
      else if (activeLang === 'fr') alojamentoObs = "Hébergement proche du chantier.";

      // 2. Transporte Observation
      let transporteObs = "-"; 

      // 3. EPIs Observation
      let episLines: string[] = [];
      for (const item of items || []) {
        if (!item.includes_epi) continue;
        
        const q = item.quantity_requested || 0;
        const name = item.job_function?.name || item.job_function_name_snapshot || 'Função';
        const rawName = name.toUpperCase();
        
        if (rawName.includes('SOLDADOR') || rawName.includes('WELDER') || rawName.includes('SOUDURE')) {
          if (activeLang === 'es') {
            episLines.push(`Para ${q}x ${name}: ${q}x Uniforme de trabajo ignífugo, ${q}x Calzado de seguridad, ${q}x Guantes de cuero para soldador, ${q}x Delantal de cuero, ${q}x Máscara de soldar, ${q}x Casco de protección, ${q}x Gafas de protección, ${q}x Protectores auditivos`);
          } else if (activeLang === 'en') {
            episLines.push(`For ${q}x ${name}: ${q}x Fire retardant work uniform, ${q}x Safety shoes, ${q}x Leather welding gloves, ${q}x Leather apron, ${q}x Welding mask, ${q}x Safety helmet, ${q}x Safety glasses, ${q}x Hearing protectors`);
          } else {
            episLines.push(`Para ${q}x ${name}: ${q}x Uniforme de trabalho ignífugo, ${q}x Calçado de segurança, ${q}x Luvas de couro para soldador, ${q}x Avental de couro, ${q}x Máscara de soldar, ${q}x Capacete de proteção, ${q}x Óculos de proteção, ${q}x Protetores auditivos`);
          }
        } else {
          // Outros cargos
          if (activeLang === 'es') {
            episLines.push(`Para ${q}x ${name}: ${q}x Uniforme de trabajo estándar, ${q}x Calzado de seguridad, ${q}x Guantes de protección, ${q}x Casco de protección, ${q}x Gafas de protección, ${q}x Protectores auditivos`);
          } else if (activeLang === 'en') {
            episLines.push(`For ${q}x ${name}: ${q}x Standard work uniform, ${q}x Safety shoes, ${q}x Protective gloves, ${q}x Safety helmet, ${q}x Safety glasses, ${q}x Hearing protectors`);
          } else {
            episLines.push(`Para ${q}x ${name}: ${q}x Uniforme de trabalho padrão, ${q}x Calçado de segurança, ${q}x Luvas de proteção, ${q}x Capacete de proteção, ${q}x Óculos de proteção, ${q}x Protetores auditivos`);
          }
        }
      }
      let episObs = episLines.length > 0 ? episLines.join(' | ') : "-";

      const variables = {
        pedido_codigo: pedido.codigo,
        pedido_data: formatDate(pedido.created_at),
        cliente_nome: client?.legal_name || client?.trade_name || 'Cliente',
        cliente_empresa: client?.legal_name || client?.trade_name || 'Cliente',
        cliente_telefone: client?.phone || '',
        cliente_nif: client?.nif || client?.cif || '',
        cliente_morada: client?.address || '',
        morada_obra: client_site?.address_line || 'Não definido',
        obra_morada: client_site?.address_line || 'Não definido',
        data_inicio: formatDate(pedido.expected_start_date),
        data_fim: formatDate(pedido.expected_end_date),
        empresa_nome: empresa.trade_name || empresa.legal_name || 'MasterCorp',
        empresa_nif: empresa.nif || empresa.cnpj || '',
        empresa_morada: empresa.address || '',
        empresa_telefone: empresa.phone || '',
        empresa_email: empresa.email || '',
        alojamento_obs: alojamentoObs,
        transporte_obs: transporteObs,
        epis_obs: episObs,
        itens: mappedItens
      };

      console.log(`[send-order-notification] Mesclando variáveis no template docx...`);
      const finalDoc = await createReport({
        template: normalizedTemplate,
        data: variables,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
          console.warn(`[docx-templates] Error on tag ${command_code}:`, err);
          return "";
        }
      });

      const finalDocxBase64 = encode(finalDoc);

      // 7. Converter para PDF via OneDrive/Microsoft Graph
      const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
      const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
      const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');
      const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');

      if (tenantId && clientId && clientSecret && driveId) {
        try {
          console.log("[send-order-notification] Obtendo token do Graph para conversão em PDF...");
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

          if (tokenRes.ok) {
            const { access_token } = await tokenRes.json();
            const fileName = `pedido_operacional_${pedido.codigo}.docx`;
            
            console.log("[send-order-notification] Iniciando conversão de DOCX para PDF via OneDrive...");
            const conversionResult = await convertDocxToPdfViaGraph(
              access_token,
              driveId,
              finalDocxBase64,
              fileName
            );
            
            if (conversionResult && conversionResult.contentType === "application/pdf") {
              console.log("[send-order-notification] Conversão para PDF concluída com sucesso!");
              attachments.push({
                name: conversionResult.name,
                contentType: conversionResult.contentType,
                contentBytes: conversionResult.contentBytes
              });
            } else {
              console.warn("[send-order-notification] A conversão falhou ou não retornou PDF, anexando DOCX como fallback.");
              attachments.push({
                name: `pedido_operacional_${pedido.codigo}.docx`,
                contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                contentBytes: finalDocxBase64
              });
            }
          }
        } catch (convErr: any) {
          console.error("[send-order-notification] Erro na conversão para PDF:", convErr.message);
          attachments.push({
            name: `pedido_operacional_${pedido.codigo}.docx`,
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            contentBytes: finalDocxBase64
          });
        }
      } else {
        console.warn("[send-order-notification] Credenciais SharePoint/Microsoft Graph incompletas, anexando DOCX diretamente.");
        attachments.push({
          name: `pedido_operacional_${pedido.codigo}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: finalDocxBase64
        });
      }
    } else if (solicitud_id) {
      // 1. Buscar a solicitude operativa
      const { data: solicitud, error: solErr } = await supabase
        .schema("core_operacoes")
        .from("solicitudes_operativas")
        .select("*")
        .eq("id", solicitud_id)
        .single();

      if (solErr || !solicitud) {
        return new Response(
          JSON.stringify({ error: `Solicitude não encontrada: ${solErr?.message}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedEmpresaId = solicitud.empresa_id;

      // 2. Buscar os targets da solicitude
      const { data: targets, error: targetsErr } = await supabase
        .schema("core_operacoes")
        .from("solicitud_targets")
        .select("*")
        .eq("solicitud_id", solicitud_id);

      if (targetsErr) {
        console.error("[send-order-notification] Erro ao carregar targets:", targetsErr.message);
      }

      // 3. Buscar a empresa
      const { data: empresa, error: empErr } = await supabase
        .schema("core_common")
        .from("empresas")
        .select("*")
        .eq("id", resolvedEmpresaId)
        .single();

      if (empErr || !empresa) {
        return new Response(
          JSON.stringify({ error: `Empresa não encontrada: ${empErr?.message}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedEmpresa = empresa;
      senderEmail = empresa.proposal_sender_email || senderEmail;
      senderName = empresa.trade_name || senderName;

      const activeLang = (empresa.default_language || 'pt').toLowerCase();

      // 4. Carregar detalhes dos targets em memória (Workers, Clients, Sites)
      const workerIds = [...new Set([
        ...(targets || []).map((t: any) => t.source_worker_id),
        ...(targets || []).map((t: any) => t.target_worker_id)
      ].filter(Boolean))];

      const clientIds = [...new Set([
        ...(targets || []).map((t: any) => t.source_client_id),
        ...(targets || []).map((t: any) => t.target_client_id),
        solicitud.client_id
      ].filter(Boolean))];

      const siteIds = [...new Set([
        ...(targets || []).map((t: any) => t.source_client_site_id),
        ...(targets || []).map((t: any) => t.target_client_site_id),
        solicitud.client_site_id
      ].filter(Boolean))];

      const [workersRes, clientsRes, sitesRes] = await Promise.all([
        workerIds.length > 0
          ? supabase.schema('core_personal').from('workers').select('id, nome, cod_colab, funcion').in('id', workerIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line').in('id', siteIds)
          : Promise.resolve({ data: [] })
      ]);

      const workersMap = new Map((workersRes.data || []).map((w: any) => [w.id, w]));
      const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));

      const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(
          activeLang === 'pt' ? 'pt-PT' : activeLang === 'es' ? 'es-ES' : activeLang === 'en' ? 'en-US' : activeLang === 'it' ? 'it-IT' : 'fr-FR'
        );
      };

      const folderName = empresa.trade_name?.toLowerCase().replace(/\s+/g, '_') || 'default';
      const templateType = solicitud.tipo === 'replacement' ? 'reemplazo' : solicitud.tipo === 'offboarding' ? 'baja' : solicitud.tipo === 'relocation' ? 'reubicacion' : 'pedido';

      try {
        // 5. Determinar os fallbacks de template
        const templatePaths = [
          `${folderName}/${activeLang}/${templateType}.docx`,
          `${folderName}/${templateType}.docx`,
          `default_${templateType}_${activeLang}.docx`,
          `default_${templateType}.docx`
        ];

        let templateBlob: Blob | null = null;
        for (const path of templatePaths) {
          console.log(`[send-order-notification] Tentando baixar template: ${path}`);
          const { data, error } = await supabase.storage
            .from("proposal-templates")
            .download(path);
          
          if (!error && data) {
            templateBlob = data;
            console.log(`[send-order-notification] Template encontrado em: ${path}`);
            break;
          }
        }

        if (templateBlob) {
          // 6. Processar o Word
          const templateBytes = new Uint8Array(await templateBlob.arrayBuffer());
          const normalizedTemplate = await normalizeDocxTemplates(templateBytes);

          let variables: any = {};
          if (solicitud.tipo === 'relocation') {
            const mappedTrabalhadores = (targets || []).map((t: any) => {
              const worker = workersMap.get(t.source_worker_id);
              const sourceClient = clientsMap.get(t.source_client_id);
              const sourceSite = sitesMap.get(t.source_client_site_id);
              const targetClient = clientsMap.get(t.target_client_id);
              const targetSite = sitesMap.get(t.target_client_site_id);

              return {
                nome: worker?.nome || 'N/A',
                codigo: worker?.cod_colab || 'N/A',
                cargo: worker?.funcion || 'N/A',
                cliente_origem: sourceClient?.trade_name || sourceClient?.legal_name || 'N/A',
                obra_origem: sourceSite?.name || 'N/A',
                cliente_destino: targetClient?.trade_name || targetClient?.legal_name || 'N/A',
                obra_destino: targetSite?.name || 'N/A',
                data_inicio: formatDate(solicitud.due_date),
                requires_housing: t.requires_housing ? (activeLang === 'pt' ? 'Sim' : 'Sí') : (activeLang === 'pt' ? 'Não' : 'No'),
                housing_period: t.requires_housing 
                  ? `${formatDate(t.housing_start_date)} a ${formatDate(t.housing_end_date)}`
                  : '-'
              };
            });

            variables = {
              solicitud_codigo: solicitud.codigo,
              solicitud_data: formatDate(solicitud.created_at),
              empresa_nome: empresa.trade_name || empresa.legal_name || 'MasterCorp',
              empresa_nif: empresa.nif || empresa.cnpj || '',
              empresa_morada: empresa.address || '',
              motivo: solicitud.reason || targets?.[0]?.reason || '',
              observacoes: solicitud.description || targets?.[0]?.notes || '',
              trabalhadores: mappedTrabalhadores
            };
          } else {
            // replacement, offboarding, etc.
            const mappedTrabalhadores = (targets || []).map((t: any) => {
              const sourceWorker = workersMap.get(t.source_worker_id);
              const targetWorker = workersMap.get(t.target_worker_id);
              const sourceClient = clientsMap.get(t.source_client_id);
              const sourceSite = sitesMap.get(t.source_client_site_id);

              return {
                saindo_nome: sourceWorker?.nome || 'N/A',
                saindo_codigo: sourceWorker?.cod_colab || 'N/A',
                saindo_cargo: sourceWorker?.funcion || 'N/A',
                entrando_nome: targetWorker?.nome || (activeLang === 'pt' ? 'A definir' : 'A definir'),
                entrando_codigo: targetWorker?.cod_colab || (activeLang === 'pt' ? 'A definir' : 'A definir'),
                cliente_nome: sourceClient?.trade_name || sourceClient?.legal_name || 'N/A',
                obra_nome: sourceSite?.name || 'N/A',
                data_inicio: formatDate(solicitud.due_date)
              };
            });

            variables = {
              solicitud_codigo: solicitud.codigo,
              solicitud_data: formatDate(solicitud.created_at),
              empresa_nome: empresa.trade_name || empresa.legal_name || 'MasterCorp',
              empresa_nif: empresa.nif || empresa.cnpj || '',
              empresa_morada: empresa.address || '',
              motivo: solicitud.reason || targets?.[0]?.reason || '',
              observacoes: solicitud.description || targets?.[0]?.notes || '',
              trabalhadores: mappedTrabalhadores
            };
          }

          console.log(`[send-order-notification] Mesclando variáveis no template docx...`);
          const finalDoc = await createReport({
            template: normalizedTemplate,
            data: variables,
            cmdDelimiter: ["{{", "}}"],
            noSandbox: true,
            errorHandler: (err, command_code) => {
              console.warn(`[docx-templates] Error on tag ${command_code}:`, err);
              return "";
            }
          });

          if (finalDoc) {
            const finalDocxBase64 = encode(finalDoc);
            const fileName = `${templateType}_operacional_${solicitud.codigo}.docx`;

            // Converter para PDF via OneDrive/Microsoft Graph
            const tenantId = empresa?.microsoft_tenant_id || Deno.env.get('SHAREPOINT_TENANT_ID');
            const clientId = empresa?.microsoft_client_id || Deno.env.get('SHAREPOINT_CLIENT_ID');
            const clientSecret = empresa?.microsoft_client_secret || Deno.env.get('SHAREPOINT_CLIENT_SECRET');
            const driveId = empresa?.microsoft_sharepoint_drive_id || Deno.env.get('SHAREPOINT_DRIVE_ID');

            if (tenantId && clientId && clientSecret && driveId) {
              try {
                console.log("[send-order-notification] Obtendo token do Graph para conversão em PDF...");
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

                if (tokenRes.ok) {
                  const { access_token } = await tokenRes.json();
                  console.log("[send-order-notification] Iniciando conversão de DOCX para PDF via OneDrive...");
                  const conversionResult = await convertDocxToPdfViaGraph(
                    access_token,
                    driveId,
                    finalDocxBase64,
                    fileName
                  );
                  
                  if (conversionResult && conversionResult.contentType === "application/pdf") {
                    console.log("[send-order-notification] Conversão para PDF concluída com sucesso!");
                    attachments.push({
                      name: conversionResult.name,
                      contentType: conversionResult.contentType,
                      contentBytes: conversionResult.contentBytes
                    });
                  } else {
                    console.warn("[send-order-notification] A conversão falhou ou não retornou PDF, anexando DOCX como fallback.");
                    attachments.push({
                      name: `${templateType}_operacional_${solicitud.codigo}.docx`,
                      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      contentBytes: finalDocxBase64
                    });
                  }
                }
              } catch (convErr: any) {
                console.error("[send-order-notification] Erro na conversão para PDF:", convErr.message);
                attachments.push({
                  name: `${templateType}_operacional_${solicitud.codigo}.docx`,
                  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  contentBytes: finalDocxBase64
                });
              }
            } else {
              console.warn("[send-order-notification] Credenciais SharePoint/Microsoft Graph incompletas, anexando DOCX diretamente.");
              attachments.push({
                name: `${templateType}_operacional_${solicitud.codigo}.docx`,
                contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                contentBytes: finalDocxBase64
              });
            }
          }
        }
      } catch (docxErr: any) {
        console.warn("[send-order-notification] Erro ao processar anexo docx/pdf (seguindo com envio de e-mail):", docxErr?.message);
      }
    } else if (is_faturamento) {
      if (attachments.length === 0) {
        const generateValidPDF = (title: string, client: string, code: string) => {
          const content = [
            "BT",
            "/F1 12 Tf",
            "70 750 Td",
            `(${title}) Tj`,
            "0 -25 Td",
            `(Cliente: ${client}) Tj`,
            "0 -20 Td",
            `(Fatura Referencia: #${code}) Tj`,
            "0 -25 Td",
            "(Documento gerado para fins de validacao de faturamento.) Tj",
            "ET"
          ].join("\n");

          const streamBytes = new TextEncoder().encode(content);
          const streamLength = streamBytes.length;

          const header = "%PDF-1.4\n";
          const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
          const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
          const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n";
          const obj4Header = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
          const obj4Footer = "\nendstream\nendobj\n";

          const offset1 = header.length;
          const offset2 = offset1 + obj1.length;
          const offset3 = offset2 + obj2.length;
          const offset4 = offset3 + obj3.length;
          const obj4TotalLength = obj4Header.length + streamLength + obj4Footer.length;
          const startxref = offset4 + obj4TotalLength;

          const xref = `xref\n0 5\n0000000000 65535 f \n${String(offset1).padStart(10, '0')} 00000 n \n${String(offset2).padStart(10, '0')} 00000 n \n${String(offset3).padStart(10, '0')} 00000 n \n${String(offset4).padStart(10, '0')} 00000 n \n`;
          const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

          const encoder = new TextEncoder();
          const pdfParts = [
            encoder.encode(header),
            encoder.encode(obj1),
            encoder.encode(obj2),
            encoder.encode(obj3),
            encoder.encode(obj4Header),
            streamBytes,
            encoder.encode(obj4Footer),
            encoder.encode(xref),
            encoder.encode(trailer)
          ];

          const totalLength = pdfParts.reduce((sum, part) => sum + part.length, 0);
          const pdfBytes = new Uint8Array(totalLength);
          let pos = 0;
          for (const part of pdfParts) {
            pdfBytes.set(part, pos);
            pos += part.length;
          }

          return encode(pdfBytes);
        };

        attachments.push({
          name: "Relatorio_Datas_Trabalhadas.pdf",
          contentType: "application/pdf",
          contentBytes: generateValidPDF("MCS - Relatorio de Datas Trabalhadas", client_name || "Cliente", fatura_code || "FATURA")
        });
        attachments.push({
          name: "Informe_Facturacion.pdf",
          contentType: "application/pdf",
          contentBytes: generateValidPDF("MCS - Informe de Facturacion", client_name || "Cliente", fatura_code || "FATURA")
        });
        attachments.push({
          name: "Factura_Pro_forma.pdf",
          contentType: "application/pdf",
          contentBytes: generateValidPDF("MCS - Factura Pro-forma", client_name || "Cliente", fatura_code || "FATURA")
        });
      }

      if (resolvedEmpresaId) {
        const { data: empresa, error: empErr } = await supabase
          .schema("core_common")
          .from("empresas")
          .select("*")
          .eq("id", resolvedEmpresaId)
          .single();

        if (!empErr && empresa) {
          resolvedEmpresa = empresa;
          if (is_faturamento) {
            senderEmail = empresa.billing_email || empresa.email || empresa.proposal_sender_email || senderEmail;
          } else {
            senderEmail = empresa.proposal_sender_email || empresa.billing_email || senderEmail;
          }
          senderName = empresa.trade_name || empresa.nome || senderName;
        }
      }
    } else if (resolvedEmpresaId) {
      // 2. Se não houver pedido_id nem solicitude_id, buscar dados da empresa para obter remetente
      const { data: empresa, error: empErr } = await supabase
        .schema("core_common")
        .from("empresas")
        .select("*")
        .eq("id", resolvedEmpresaId)
        .single();

      if (!empErr && empresa) {
        resolvedEmpresa = empresa;
        if (is_faturamento) {
          senderEmail = empresa.billing_email || empresa.email || empresa.proposal_sender_email || senderEmail;
        } else {
          senderEmail = empresa.proposal_sender_email || empresa.billing_email || senderEmail;
        }
        senderName = empresa.trade_name || empresa.nome || senderName;
      }
    }
    if (resolvedEmpresa) {
      if (resolvedEmpresa.microsoft_tenant_id && resolvedEmpresa.microsoft_client_id && resolvedEmpresa.microsoft_client_secret) {
        msCredentials = {
          tenantId: resolvedEmpresa.microsoft_tenant_id,
          clientId: resolvedEmpresa.microsoft_client_id,
          clientSecret: resolvedEmpresa.microsoft_client_secret
        };
      }
    }

    if (sender_email) {
      senderEmail = sender_email;
    }

    if (!senderEmail) {
      senderEmail = "valter@gestaologinpro.com";
    }

    // 8. Enviar email via Microsoft Graph API
    const mailRes = await sendMailViaGraph(
      senderEmail,
      senderName,
      to_emails,
      email_subject || (pedido ? `Novo Pedido Gerado - ${pedido.codigo}` : `Nova Solicitação Operacional`),
      email_body,
      attachments,
      msCredentials,
      reply_to_email
    );

    if (!mailRes.success) {
      return new Response(
        JSON.stringify({ error: mailRes.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro na Edge Function send-order-notification:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
