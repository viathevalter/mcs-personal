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
      return await zip.generateAsync({ type: "uint8array" });
    }
  } catch (err: any) {
    console.error("[normalizeDocx] Error:", err.message);
  }
  return templateBuffer;
}

async function embedSignatureInDocx(
  supabase: any,
  documentUrl: string,
  signatureBytes: Uint8Array,
  auditInfo?: { workerName: string; workerEmail: string; ipAddress: string; otpCode: string; signedAtIso: string }
): Promise<void> {
  try {
    console.log(`[embedSignature] Downloading docx to insert signature: ${documentUrl}`);
    const { data: blob, error: dlErr } = await supabase.storage
      .from("worker-contracts")
      .download(documentUrl);

    if (dlErr || !blob) {
      console.warn(`[embedSignature] Failed to download file from storage: ${dlErr?.message}`);
      return;
    }

    let templateBuffer = new Uint8Array(await blob.arrayBuffer());
    templateBuffer = await normalizeDocxTemplates(templateBuffer);

    console.log(`[embedSignature] Processing docx with docx-templates...`);
    let finalDoc: Uint8Array;
    try {
      finalDoc = await createReport({
        template: templateBuffer,
        data: {
          ASSINATURA: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          assinatura: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          Assinatura: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          ASSINATURA_TRABALHADOR: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          assinatura_trabalhador: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          Assinatura_Trabalhador: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          FIRMA_TRABALHADOR: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          firma_trabalhador: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          Firma_Trabalhador: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          FIRMA: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          firma: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          Firma: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          SIGNATURE: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          signature: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
          Signature: { width: 4.5, height: 2.0, data: signatureBytes, extension: '.png' },
        },
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
          console.warn(`[embedSignature] Error on tag ${command_code}:`, err);
          return "";
        }
      });
    } catch (eReport) {
      console.warn("[embedSignature] createReport fallback:", eReport);
      finalDoc = templateBuffer;
    }

    // Direct JSZip XML insertion for signature image and eIDAS audit certificate
    const zip = new JSZip();
    await zip.loadAsync(finalDoc);

    const sigRelId = "rIdSig99";
    zip.file("word/media/signature_signed.png", signatureBytes);

    let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("text") || "";
    if (!relsXml.includes("signature_signed.png")) {
      relsXml = relsXml.replace(
        "</Relationships>",
        `<Relationship Id="${sigRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature_signed.png"/></Relationships>`
      );
      zip.file("word/_rels/document.xml.rels", relsXml);
    }

    let docXml = await zip.file("word/document.xml")?.async("text") || "";

    const inlineImgXml = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1600000" cy="700000"/><wp:docPr id="999" name="Assinatura"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="999" name="Assinatura"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${sigRelId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600000" cy="700000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

    const sigPattern = /\[ASSINATURA\]|\[assinatura\]|\[ASSINATURA_TRABALHADOR\]|\{\{assinatura\}\}|\{\{ASSINATURA\}\}|\{\{assinatura_trabalhador\}\}|\{\{ASSINATURA_TRABALHADOR\}\}/gi;
    if (sigPattern.test(docXml)) {
      docXml = docXml.replace(sigPattern, inlineImgXml);
    }

    // Append eIDAS Audit Certificate Page at end of document if auditInfo is present
    if (auditInfo) {
      const auditCertXml = `
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1E40AF"/></w:rPr><w:t>COMPROVANTE DE ASSINATURA ELETRÔNICA</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Validade Jurídica eIDAS / Regulamento UE 910/2014</w:t></w:r></w:p>
        <w:p/><w:p/>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Trabalhador / Signatário: </w:t></w:r><w:r><w:t>${auditInfo.workerName}</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>E-mail de Notificação: </w:t></w:r><w:r><w:t>${auditInfo.workerEmail}</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Código de Autenticação OTP: </w:t></w:r><w:r><w:t>${auditInfo.otpCode}</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Data e Hora da Assinatura: </w:t></w:r><w:r><w:t>${auditInfo.signedAtIso}</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Endereço IP Registrado: </w:t></w:r><w:r><w:t>${auditInfo.ipAddress}</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Status da Assinatura: </w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="16A34A"/></w:rPr><w:t>ASSINADO E AUDITADO</w:t></w:r></w:p>
        <w:p/><w:p/>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Assinatura Digitalizada:</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="left"/></w:pPr>${inlineImgXml}</w:p>
        <w:p/><w:p/>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="94A3B8"/></w:rPr><w:t>Este documento foi assinado eletronicamente com criptografia e trilha de auditoria inviolável de acordo com o Regulamento eIDAS da União Europeia.</w:t></w:r></w:p>
      `;
      if (docXml.includes("</w:body>")) {
        docXml = docXml.replace("</w:body>", auditCertXml + "</w:body>");
      }
    }

    zip.file("word/document.xml", docXml);
    const finalDocBuffer = await zip.generateAsync({ type: "uint8array" });

    console.log(`[embedSignature] Overwriting signed docx in storage: ${documentUrl}`);
    const { error: uploadErr } = await supabase.storage
      .from("worker-contracts")
      .upload(documentUrl, finalDocBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true
      });

    if (uploadErr) {
      console.error("[embedSignature] Upload error:", uploadErr.message);
    } else {
      console.log("[embedSignature] Document successfully updated in storage!");
    }
  } catch (err: any) {
    console.error("[embedSignature] Error:", err.message);
  }
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

    // 1. Buscar o contrato pelo token de assinatura
    const { data: contract, error: contractErr } = await supabase
      .schema("core_personal")
      .from("contracts")
      .select("*")
      .eq("signature_token", token)
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

    // 3. Buscar e-mail do trabalhador (corrigido: nome ao invés de name)
    const { data: worker, error: workerErr } = await supabase
      .schema("core_personal")
      .from("workers")
      .select("email, nome")
      .eq("id", contract.worker_id)
      .single();

    if (workerErr || !worker) {
      throw new Error(`Erro ao obter dados do trabalhador: ${workerErr?.message}`);
    }

    // 3.5. Se houver imagem de assinatura base64, processar e embutir no docx
    if (signature_image && contract.document_url) {
      console.log("[sign-contract] Imagem de assinatura recebida, iniciando embutimento...");
      const cleanBase64 = signature_image.replace(/^data:image\/[a-z]+;base64,/, "");
      const binaryString = atob(cleanBase64);
      const binaryData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
      }

      // 1. Embutir no DOCX no Storage
      await embedSignatureInDocx(supabase, contract.document_url, binaryData, {
        workerName: worker.nome || "Trabalhador",
        workerEmail: worker.email || "Sem e-mail",
        ipAddress: ip_address || "0.0.0.0",
        otpCode: otp_code,
        signedAtIso: new Date().toLocaleString("pt-PT", { timeZone: "UTC" }) + " (UTC)"
      });

      // 2. Tentar converter para PDF via Graph
      try {
        const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
        const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
        const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');
        const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');

        if (tenantId && clientId && clientSecret && driveId) {
          // Baixar o DOCX com assinatura embutida para enviar à conversão
          const { data: updatedDocxBlob, error: dlUpdatedErr } = await supabase.storage
            .from("worker-contracts")
            .download(contract.document_url);

          if (!dlUpdatedErr && updatedDocxBlob) {
            const updatedDocxBase64 = encode(new Uint8Array(await updatedDocxBlob.arrayBuffer()));
            
            // Obter token do Graph
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
              const tokenData = await tokenRes.json();
              const access_token = tokenData.access_token;
              
              console.log("[sign-contract] Convertendo contrato DOCX assinado para PDF...");
              const pdfAtt = await convertDocxToPdfViaGraph(access_token, driveId, updatedDocxBase64, `contrato_${contract.id}.docx`);
              
              if (pdfAtt && pdfAtt.contentType === "application/pdf") {
                const pdfBinaryString = atob(pdfAtt.contentBytes);
                const pdfBytes = new Uint8Array(pdfBinaryString.length);
                for (let i = 0; i < pdfBinaryString.length; i++) {
                  pdfBytes[i] = pdfBinaryString.charCodeAt(i);
                }

                const pdfPath = contract.document_url.replace(/\.docx$/i, '.pdf');
                console.log(`[sign-contract] Salvando PDF no bucket: ${pdfPath}`);
                const { error: uploadPdfErr } = await supabase.storage
                  .from("worker-contracts")
                  .upload(pdfPath, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                if (uploadPdfErr) {
                  console.error("[sign-contract] Erro ao salvar PDF no Storage:", uploadPdfErr.message);
                } else {
                  console.log("[sign-contract] PDF salvo com sucesso. Atualizando signed_document_url...");
                  await supabase
                    .schema("core_personal")
                    .from("contracts")
                    .update({ signed_document_url: pdfPath })
                    .eq("id", contract.id);
                }
              }
            } else {
              console.error("[sign-contract] Falha ao obter token para conversão de PDF:", await tokenRes.text());
            }
          }
        }
      } catch (errPdf) {
        console.error("[sign-contract] Erro na conversão para PDF:", errPdf);
      }
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
      .schema("core_personal")
      .from("contract_audit_logs")
      .insert(auditPayload);

    if (auditErr) {
      throw new Error(`Falha ao registrar log de auditoria: ${auditErr.message}`);
    }

    // 5. Atualizar o status do contrato para 'signed'
    const { error: updateErr } = await supabase
      .schema("core_personal")
      .from("contracts")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        otp_code: null, // Limpa o OTP usado
        otp_expires_at: null,
      })
      .eq("id", contract.id);

    if (updateErr) {
      throw new Error(`Falha ao atualizar status do contrato: ${updateErr.message}`);
    }

    // 6. Atualizar status do trabalhador e da alocação se necessário
    if (contract.assignment_id) {
      await supabase
        .schema("core_personal")
        .from("worker_assignments")
        .update({ status: "active", start_date: new Date().toISOString().split("T")[0] })
        .eq("id", contract.assignment_id);
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
