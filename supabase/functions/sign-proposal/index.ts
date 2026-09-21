import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
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

        // 3. Remove white color styling from paragraphs/runs containing signature tags
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('firma') || lowerContent.includes('signature')) {
          console.log(`[normalizeDocx] Stripping white color styling from signature paragraphs in ${path}`);
          content = content.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paraXml) => {
            const lowerPara = paraXml.toLowerCase();
            if (lowerPara.includes('firma') || lowerPara.includes('signature')) {
              if (lowerPara.includes('w:val="ffffff"') || lowerPara.includes('w:themecolor="background1"')) {
                console.log("[normalizeDocx] Found white color styling in signature paragraph. Removing color tags...");
                // Remove <w:color .../> tags
                return paraXml.replace(/<w:color\b[^>]*?\/>/g, '');
              }
            }
            return paraXml;
          });
        }

        // 4. Auto-inject {{IMAGE FIRMA_CLIENTE}} if missing in document.xml
        if (path === 'word/document.xml' && !content.includes('FIRMA_CLIENTE') && !content.includes('FIRMA_CONTRATANTE')) {
          const clientHeaderMatch = content.match(/(Por\s+EL\s+CLIENTE|POR\s+EL\s+CLIENTE|Por\s+el\s+Cliente|LA\s+CONTRATANTE|Por\s+LA\s+CONTRATANTE|POR\s+LA\s+CONTRATANTE)/i);
          if (clientHeaderMatch && clientHeaderMatch.index !== undefined) {
            console.log(`[normalizeDocx] Auto-injecting {{IMAGE FIRMA_CLIENTE}} after header: "${clientHeaderMatch[0]}"`);
            const pCloseIdx = content.indexOf('</w:p>', clientHeaderMatch.index);
            if (pCloseIdx !== -1) {
              const signatureTagPara = '<w:p><w:pPr><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>{{IMAGE FIRMA_CLIENTE}}</w:t></w:r></w:p>';
              content = content.substring(0, pCloseIdx + 6) + signatureTagPara + content.substring(pCloseIdx + 6);
            }
          }
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

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

async function convertDocxToPdfViaGraph(
  accessToken: string,
  driveId: string,
  docxBase64: string,
  fileName: string
): Promise<{ name: string; contentType: string; contentBytes: string; error?: string }> {
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
      error: err.message,
    };
  }
}

async function sendMailViaGraph(
  senderEmail: string,
  senderName: string,
  targetEmail: string,
  ccEmails: string[],
  subject: string,
  htmlContent: string,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
    const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
    const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      console.warn("Microsoft Graph configurations are missing in Supabase secrets.");
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

    // Convert docx attachments to pdf using Graph conversion
    const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');
    const processedAttachments: EmailAttachment[] = [];

    for (const att of attachments) {
      if (driveId && att.name.endsWith('.docx')) {
        console.log(`[sendMailViaGraph] Requesting conversion to PDF: ${att.name}`);
        const pdfAtt = await convertDocxToPdfViaGraph(access_token, driveId, att.contentBytes, att.name);
        processedAttachments.push(pdfAtt);
      } else {
        processedAttachments.push(att);
      }
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
        ccRecipients: ccEmails.map(email => ({
          emailAddress: {
            address: email,
          },
        })),
        attachments: processedAttachments.map(att => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        })),
      },
      saveToSentItems: "true",
    };

    console.log(`Disparando e-mail de conclusão via Microsoft Graph para ${targetEmail}`);
    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (graphRes.ok) {
      console.log("E-mail de conclusão enviado com sucesso.");
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

async function embedSignatureInDocx(
  supabase: any,
  documentUrl: string,
  signatureBytes: Uint8Array,
  auditInfo?: {
    clientOrLeadName: string;
    emailUsed: string;
    otpCode: string;
    signedAtIso: string;
    ipAddress: string;
  },
  companyLogoBytes?: Uint8Array | null
): Promise<Uint8Array | null> {
  try {
    console.log(`[embedSignature] Downloading docx to insert signature: ${documentUrl}`);
    const { data: blob, error: dlErr } = await supabase.storage
      .from("proposal-signatures")
      .download(documentUrl);

    if (dlErr || !blob) {
      console.warn(`[embedSignature] Failed to download file from storage: ${dlErr?.message}`);
      return null;
    }

    let templateBuffer = new Uint8Array(await blob.arrayBuffer());
    
    // Direct JSZip XML insertion for signature image and eIDAS audit certificate
    const zip = new JSZip();
    await zip.loadAsync(templateBuffer);

    const sigRelId = "rIdSig99";
    zip.file("word/media/signature_signed.png", signatureBytes);

    let signatureInserted = false;

    // 0. Handle company logo: preserve or restore true company logo bytes and ensure .png extension
    const logoFile = Object.keys(zip.files).find(p => p.includes('1fb869ea57eb1285c7e04f58f151ca198002e19c') || p.includes('.undefined'));
    if (logoFile) {
      const pngLogoPath = logoFile.replace(/\.undefined/g, '.png');
      if (companyLogoBytes) {
        console.log(`[embedSignature] Restoring true company logo in ${pngLogoPath}`);
        zip.file(pngLogoPath, companyLogoBytes);
      } else if (logoFile.endsWith('.undefined')) {
        const originalLogoBytes = await zip.file(logoFile)?.async("uint8array");
        if (originalLogoBytes) {
          zip.file(pngLogoPath, originalLogoBytes);
        }
      }
      if (logoFile !== pngLogoPath) {
        zip.remove(logoFile);
      }
    }

    // 0.5 If template has an embedded signature placeholder image (e.g. template_document.xml_img*.png in proposal or contract), replace it with the client signature!
    const placeholderSigFiles = Object.keys(zip.files).filter(p => p.startsWith("word/media/template_document.xml_img"));
    for (const phPath of placeholderSigFiles) {
      console.log(`[embedSignature] Replacing signature placeholder ${phPath} with client signatureBytes`);
      zip.file(phPath, signatureBytes);
      signatureInserted = true;
    }

    let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("text") || "";
    if (relsXml.includes(".undefined")) {
      console.log(`[embedSignature] Normalizing .undefined in document.xml.rels`);
      relsXml = relsXml.replace(/\.undefined/g, '.png');
    }
    if (!relsXml.includes("signature_signed.png")) {
      relsXml = relsXml.replace(
        "</Relationships>",
        `<Relationship Id="${sigRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature_signed.png"/></Relationships>`
      );
    }
    zip.file("word/_rels/document.xml.rels", relsXml);

    let contentTypesXml = await zip.file("[Content_Types].xml")?.async("text") || "";
    if (!contentTypesXml.includes('Extension="png"')) {
      contentTypesXml = contentTypesXml.replace(
        "</Types>",
        '<Default Extension="png" ContentType="image/png"/></Types>'
      );
    }
    if (!contentTypesXml.includes('Extension="undefined"')) {
      contentTypesXml = contentTypesXml.replace(
        "</Types>",
        '<Default Extension="undefined" ContentType="image/png"/></Types>'
      );
    }
    zip.file("[Content_Types].xml", contentTypesXml);

    let docXml = await zip.file("word/document.xml")?.async("text") || "";

    // Clean any previous duplicate injected signature paragraphs from headers
    docXml = docXml.replace(/<w:p><w:pPr><w:spacing w:before="60" w:after="60"\/><\/w:pPr><w:r><w:drawing>[\s\S]*?<\/w:drawing><\/w:r><\/w:p>/g, '');

    const createInlineImgXml = (docPrId: number) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="1600000" cy="700000"/><wp:docPr id="${docPrId}" name="Assinatura"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Assinatura"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${sigRelId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600000" cy="700000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

    const inlineImgXml = createInlineImgXml(999);

    // 0. Clean any invalid <w:t><w:r> nesting from previous attempts
    docXml = docXml.replace(/<w:t\b[^>]*>\s*(<w:r\b[\s\S]*?<\/w:r>)\s*<\/w:t>/gi, '$1');

    // 1. Replace run containing placeholder tags if present
    const runTagPattern = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?(?:\{\{\s*(?:IMAGE\s+)?(?:FIRMA_CLIENTE|FIRMA_CONTRATANTE|FIRMA|SIGNATURE)\s*\}\}|\[ASSINATURA\]|\[assinatura\])(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/gi;
    if (runTagPattern.test(docXml)) {
      console.log("[embedSignature] Replacing run containing placeholder tag with inlineImgXml in docXml");
      docXml = docXml.replace(runTagPattern, inlineImgXml);
      signatureInserted = true;
    } else {
      const paraTagPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?(?:\{\{\s*(?:IMAGE\s+)?(?:FIRMA_CLIENTE|FIRMA_CONTRATANTE|FIRMA|SIGNATURE)\s*\}\}|\[ASSINATURA\]|\[assinatura\])(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi;
      if (paraTagPattern.test(docXml)) {
        console.log("[embedSignature] Replacing paragraph containing placeholder tag with inlineImgXml in docXml");
        docXml = docXml.replace(paraTagPattern, `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${inlineImgXml}</w:p>`);
        signatureInserted = true;
      }
    }
    
    // 2. If tag was not in document or not replaced, inject after signature headers
    if (!signatureInserted && !docXml.includes(`r:embed="${sigRelId}"`)) {
      // In contract: look for "Firma LA CONTRATANTE" (case insensitive)
      // In proposal: look for "POR EL CLIENTE:" (case insensitive)
      const contratanteMatch = docXml.match(/(Firma\s+LA\s+CONTRATANTE|FIRMA\s+LA\s+CONTRATANTE|POR\s+LA\s+CONTRATANTE|POR\s+EL\s+CLIENTE:|POR\s+EL\s+CLIENTE|Por\s+el\s+Cliente)/i);
      if (contratanteMatch && contratanteMatch.index !== undefined) {
        console.log(`[embedSignature] Injected signature inlineImgXml after header "${contratanteMatch[0]}"`);
        const pCloseIdx = docXml.indexOf('</w:p>', contratanteMatch.index);
        if (pCloseIdx !== -1) {
          const sigPara = `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${inlineImgXml}</w:p>`;
          docXml = docXml.substring(0, pCloseIdx + 6) + sigPara + docXml.substring(pCloseIdx + 6);
          signatureInserted = true;
        }
      }
    }

    // 3. Append eIDAS Audit Certificate Page at end of document if auditInfo is present
    if (auditInfo && !docXml.includes("COMPROBANTE DE FIRMA ELECTRÓNICA") && !docXml.includes("COMPROVANTE DE ASSINATURA ELETRÔNICA")) {
      console.log(`[embedSignature] Appending eIDAS Audit Certificate page to document`);
      const certInlineImgXml = createInlineImgXml(1001);
      const auditCertXml = `
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1E40AF"/></w:rPr><w:t>COMPROBANTE DE FIRMA ELECTRÓNICA</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Validez Jurídica eIDAS / Reglamento (UE) Nº 910/2014</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Cliente / Signatario: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${auditInfo.clientOrLeadName}</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>E-mail de Notificación: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${auditInfo.emailUsed}</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Código de Autenticación OTP: </w:t></w:r><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E40AF"/></w:rPr><w:t>${auditInfo.otpCode}</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Fecha y Hora de Firma: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${auditInfo.signedAtIso}</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Dirección IP Registrada: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${auditInfo.ipAddress}</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="60" w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Estado de la Firma: </w:t></w:r><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="16A34A"/></w:rPr><w:t>FIRMADO Y AUDITADO</w:t></w:r></w:p>
        <w:p><w:pPr><w:spacing w:before="120" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>Firma Digitalizada:</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="240"/></w:pPr>${certInlineImgXml}</w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="120"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="94A3B8"/></w:rPr><w:t>Este documento ha sido firmado electrónicamente con criptografía y pista de auditoría inmutable conforme al Reglamento (UE) Nº 910/2014 (eIDAS). La integridad y autenticidad del mismo quedan plenamente acreditadas en el sistema.</w:t></w:r></w:p>
      `;
      if (docXml.includes("</w:body>")) {
        docXml = docXml.replace("</w:body>", auditCertXml + "</w:body>");
      }
    }

    zip.file("word/document.xml", docXml);
    const finalDoc = await zip.generateAsync({ type: "uint8array" });

    console.log(`[embedSignature] Uploading signed docx back to storage: ${documentUrl}`);
    const { error: uploadErr } = await supabase.storage
      .from("proposal-signatures")
      .upload(documentUrl, finalDoc, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[embedSignature] Failed to upload signed docx: ${uploadErr.message}`);
    } else {
      console.log(`[embedSignature] Signed docx successfully uploaded.`);
    }

    return finalDoc;
  } catch (err: any) {
    console.error(`[embedSignature] Error embedding signature in docx:`, err);
    return null;
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
    const body = await req.json();
    const { token, otp_code, signature_image, ip_address, user_agent, action } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Parâmetro token é obrigatório." }),
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

    const isReprocess = action === "reprocess" || action === "generate-pdf";

    if (!isReprocess) {
      if (!otp_code) {
        return new Response(
          JSON.stringify({ error: "Parâmetros token e otp_code são obrigatórios." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // 4. Buscar nome e email do destinatário (Cliente ou Lead)
    let clientOrLeadName = "Cliente";
    let emailUsed = "desconhecido@stoco.es";
    if (est.client_id) {
      const { data: client, error: clientErr } = await supabase
        .schema("core_common")
        .from("clients")
        .select("trade_name, legal_name, email")
        .eq("id", est.client_id)
        .single();
      if (!clientErr && client) {
        clientOrLeadName = client.trade_name || client.legal_name || "Cliente";
        if (client.email) emailUsed = client.email;
      }
    } else if (est.lead_id) {
      const { data: lead, error: leadErr } = await supabase
        .schema("core_comercial")
        .from("leads")
        .select("name, company_name, email")
        .eq("id", est.lead_id)
        .single();
      if (!leadErr && lead) {
        clientOrLeadName = lead.name || lead.company_name || "Cliente";
        if (lead.email) emailUsed = lead.email;
      }
    }

    // 4.5. Buscar dados da empresa e logotipo oficial
    const { data: empresa } = await supabase
      .schema("core_common")
      .from("empresas")
      .select("*")
      .eq("id", ps.empresa_id)
      .single();

    let companyLogoBytes: Uint8Array | null = null;
    if (empresa?.invoice_logo_url) {
      try {
        console.log(`[sign-proposal] Fetching company logo from: ${empresa.invoice_logo_url}`);
        const logoRes = await fetch(empresa.invoice_logo_url);
        if (logoRes.ok) {
          companyLogoBytes = new Uint8Array(await logoRes.arrayBuffer());
          console.log(`[sign-proposal] Company logo fetched successfully (${companyLogoBytes.length} bytes)`);
        }
      } catch (e) {
        console.warn("[sign-proposal] Error fetching company logo:", e);
      }
    }

    // 5. Salvar a assinatura desenhada (canvas) no storage ou recuperar existente
    let signatureImageUrl = "";
    let signedProposalBytes: Uint8Array | null = null;
    let signedContractBytes: Uint8Array | null = null;

    if (isReprocess) {
      console.log(`[sign-proposal] Executing REPROCESS mode for proposal signature ${ps.id}`);
      // Recuperar log de auditoria existente
      const { data: existingAudit } = await supabase
        .schema("core_comercial")
        .from("proposal_audit_logs")
        .select("*")
        .eq("proposal_signature_id", ps.id)
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      signatureImageUrl = existingAudit?.signature_image || signature_image || "";
      let sigBinaryData: Uint8Array | null = null;

      if (signatureImageUrl && !signatureImageUrl.startsWith("data:")) {
        console.log(`[sign-proposal-reprocess] Downloading signature image from: ${signatureImageUrl}`);
        const { data: sigBlob, error: sigErr } = await supabase.storage
          .from("proposal-signatures")
          .download(signatureImageUrl);
        if (!sigErr && sigBlob) {
          sigBinaryData = new Uint8Array(await sigBlob.arrayBuffer());
        } else {
          console.error("[sign-proposal-reprocess] Erro ao baixar imagem de assinatura:", sigErr);
        }
      } else if (signatureImageUrl.startsWith("data:")) {
        const base64Data = signatureImageUrl.replace(/^data:image\/\w+;base64,/, "");
        sigBinaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      }

      const auditInfo = {
        clientOrLeadName,
        emailUsed: existingAudit?.email_or_phone_used || emailUsed,
        otpCode: existingAudit?.verification_code || "VERIFICADO",
        signedAtIso: ps.signed_at 
          ? new Date(ps.signed_at).toLocaleString('pt-PT', { timeZone: 'Europe/Madrid' }) + ' (Europe/Madrid)'
          : new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Madrid' }) + ' (Europe/Madrid)',
        ipAddress: existingAudit?.ip_address || ip_address || "0.0.0.0",
      };

      if (sigBinaryData) {
        if (ps.document_url) {
          console.log(`[sign-proposal-reprocess] Embedding signature in proposal docx: ${ps.document_url}`);
          signedProposalBytes = await embedSignatureInDocx(supabase, ps.document_url, sigBinaryData, auditInfo, companyLogoBytes);
        }
        if (ps.contract_document_url) {
          console.log(`[sign-proposal-reprocess] Embedding signature in contract docx: ${ps.contract_document_url}`);
          signedContractBytes = await embedSignatureInDocx(supabase, ps.contract_document_url, sigBinaryData, auditInfo, companyLogoBytes);
        }
      }
    } else {
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

          const auditInfo = {
            clientOrLeadName,
            emailUsed,
            otpCode: otp_code,
            signedAtIso: new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Madrid' }) + ' (Europe/Madrid)',
            ipAddress: ip_address || "0.0.0.0",
          };

          // Incorporar a imagem da assinatura nos arquivos DOCX da proposta e do contrato
          if (ps.document_url) {
            console.log(`[sign-proposal] Embedding signature in proposal docx: ${ps.document_url}`);
            signedProposalBytes = await embedSignatureInDocx(supabase, ps.document_url, binaryData, auditInfo, companyLogoBytes);
          }
          if (ps.contract_document_url) {
            console.log(`[sign-proposal] Embedding signature in contract docx: ${ps.contract_document_url}`);
            signedContractBytes = await embedSignatureInDocx(supabase, ps.contract_document_url, binaryData, auditInfo, companyLogoBytes);
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
    }

    // 8.5. Obter proposta assinada em base64 (direto da memória se gerado ou do storage)

    // Obter proposta assinada em base64 (direto da memória se gerado ou do storage)
    let proposalBase64 = "";
    if (signedProposalBytes) {
      proposalBase64 = encode(signedProposalBytes);
    } else if (ps.document_url) {
      console.log(`Baixando proposta para anexo: ${ps.document_url}`);
      const { data: blob, error: dlErr } = await supabase.storage
        .from("proposal-signatures")
        .download(ps.document_url);
      if (!dlErr && blob) {
        proposalBase64 = encode(new Uint8Array(await blob.arrayBuffer()));
      } else {
        console.error("Erro ao baixar proposta para anexo:", dlErr);
      }
    }

    // Obter contrato assinado em base64
    let contractBase64 = "";
    if (signedContractBytes) {
      contractBase64 = encode(signedContractBytes);
    } else if (ps.contract_document_url) {
      console.log(`Baixando contrato para anexo: ${ps.contract_document_url}`);
      const { data: blob, error: dlErr } = await supabase.storage
        .from("proposal-signatures")
        .download(ps.contract_document_url);
      if (!dlErr && blob) {
        contractBase64 = encode(new Uint8Array(await blob.arrayBuffer()));
      } else {
        console.error("Erro ao baixar contrato para anexo:", dlErr);
      }
    }

    // Conversão de PDF e salvamento no bucket proposal-signatures
    let proposalPdfBase64 = "";
    let contractPdfBase64 = "";
    let savedProposalPdfPath: string | null = null;
    let savedContractPdfPath: string | null = null;
    const conversionLogs: any[] = [];

    try {
      const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
      const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
      const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');
      const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');

      if (tenantId && clientId && clientSecret && driveId) {
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
          console.log("[sign-proposal] Token do Microsoft Graph obtido com sucesso para conversão");

          // Proposta
          if (proposalBase64 && ps.document_url) {
            console.log(`[sign-proposal] Convertendo proposta DOCX para PDF...`);
            const pdfAtt = await convertDocxToPdfViaGraph(access_token, driveId, proposalBase64, `proposta_${est.codigo}.docx`);
            if (pdfAtt && pdfAtt.contentType === "application/pdf") {
              proposalPdfBase64 = pdfAtt.contentBytes;
              
              // Upload PDF para o Storage
              const binaryString = atob(pdfAtt.contentBytes);
              const pdfBytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                pdfBytes[i] = binaryString.charCodeAt(i);
              }
              const pdfPath = ps.document_url.replace(/\.docx$/i, '.pdf');
              console.log(`[sign-proposal] Salvando proposta PDF no bucket: ${pdfPath}`);
              const { error: uploadPdfErr } = await supabase.storage
                .from("proposal-signatures")
                .upload(pdfPath, pdfBytes, {
                  contentType: "application/pdf",
                  upsert: true,
                });
              if (uploadPdfErr) {
                console.error("[sign-proposal] Erro ao fazer upload do PDF da proposta:", uploadPdfErr.message);
                conversionLogs.push({ doc: 'proposta', uploadError: uploadPdfErr.message });
              } else {
                console.log("[sign-proposal] PDF da proposta salvo com sucesso no bucket.");
                savedProposalPdfPath = pdfPath;
                conversionLogs.push({ doc: 'proposta', success: true, path: pdfPath });
              }
            } else {
              const debugDocXml = signedProposalBytes ? new TextDecoder().decode(signedProposalBytes) : "";
              conversionLogs.push({ 
                doc: 'proposta', 
                convertError: pdfAtt?.error || "Content-type is not pdf",
                sigIndex: debugDocXml.indexOf("rIdSig99")
              });
            }
          }

          // Contrato
          if (contractBase64 && ps.contract_document_url) {
            console.log(`[sign-proposal] Convertendo contrato DOCX para PDF...`);
            const pdfAtt = await convertDocxToPdfViaGraph(access_token, driveId, contractBase64, `contrato_${est.codigo}.docx`);
            if (pdfAtt && pdfAtt.contentType === "application/pdf") {
              contractPdfBase64 = pdfAtt.contentBytes;
              
              // Upload PDF para o Storage
              const binaryString = atob(pdfAtt.contentBytes);
              const pdfBytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                pdfBytes[i] = binaryString.charCodeAt(i);
              }
              const pdfPath = ps.contract_document_url.replace(/\.docx$/i, '.pdf');
              console.log(`[sign-proposal] Salvando contrato PDF no bucket: ${pdfPath}`);
              const { error: uploadPdfErr } = await supabase.storage
                .from("proposal-signatures")
                .upload(pdfPath, pdfBytes, {
                  contentType: "application/pdf",
                  upsert: true,
                });
              if (uploadPdfErr) {
                console.error("[sign-proposal] Erro ao fazer upload do PDF do contrato:", uploadPdfErr.message);
                conversionLogs.push({ doc: 'contrato', uploadError: uploadPdfErr.message });
              } else {
                console.log("[sign-proposal] PDF do contrato salvo com sucesso no bucket.");
                savedContractPdfPath = pdfPath;
                conversionLogs.push({ doc: 'contrato', success: true, path: pdfPath });
              }
            } else {
              conversionLogs.push({ doc: 'contrato', convertError: pdfAtt?.error || "Content-type is not pdf" });
            }
          }

          // Atualizar URLs de PDF no banco de dados se algum upload deu certo
          if (savedProposalPdfPath || savedContractPdfPath) {
            console.log(`[sign-proposal] Atualizando URLs dos PDFs na tabela proposal_signatures...`);
            const updatePayload: any = {};
            if (savedProposalPdfPath) updatePayload.signed_document_url = savedProposalPdfPath;
            if (savedContractPdfPath) updatePayload.contract_signed_document_url = savedContractPdfPath;

            const { error: dbUpdateErr } = await supabase
              .schema("core_comercial")
              .from("proposal_signatures")
              .update(updatePayload)
              .eq("id", ps.id);

            if (dbUpdateErr) {
              console.error("[sign-proposal] Erro ao salvar URLs de PDF no banco:", dbUpdateErr.message);
              conversionLogs.push({ dbError: dbUpdateErr.message });
            } else {
              console.log("[sign-proposal] URLs de PDF salvas com sucesso no banco de dados.");
            }
          }
        } else {
          console.error("[sign-proposal] Falha ao obter token do Graph para conversão:", await tokenRes.text());
        }
      } else {
        console.warn("[sign-proposal] Configurações do SharePoint ausentes, ignorando conversão no backend");
      }
    } catch (errPdf) {
      console.error("[sign-proposal] Erro durante conversão e salvamento de PDF:", errPdf);
    }


    // Enviar email de confirmação com anexos (somente no fluxo original de assinatura)
    if (empresa && !isReprocess) {
      const origin = req.headers.get("origin") || "https://mcs-personal.vercel.app";
      const publicLink = `${origin}/assinar-proposta/${token}`;
      const senderEmail = empresa.proposal_sender_email || "vendas@stoco.es";
      const senderName = empresa.trade_name || "Comercial";
      const lang = est.document_language || "pt";
      let subject = "";
      let htmlContent = "";

      const timeZone = lang === "pt" ? "Europe/Lisbon" : lang === "fr" ? "Europe/Paris" : lang === "it" ? "Europe/Rome" : lang === "en" ? "Europe/London" : "Europe/Madrid";
      const formattedDate = new Date().toLocaleString(
        lang === "es" ? "es-ES" : lang === "pt" ? "pt-PT" : lang === "en" ? "en-US" : lang === "it" ? "it-IT" : "fr-FR",
        { timeZone, hour12: false }
      );

      if (lang === "es") {
        subject = `[FIRMADO] Propuesta y Contrato Comercial ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>¡Proceso de Firma Completado!</h2>
          <p>Hola,</p>
          <p>Nos complace informarle que el proceso de firma electrónica de la proposta comercial <strong>${est.codigo}</strong> y del contrato correspondiente se ha completado con éxito.</p>
          <p><strong>Detalles del proceso:</strong></p>
          <ul>
            <li><strong>Cliente/Empresa:</strong> ${clientOrLeadName}</li>
            <li><strong>Firmante:</strong> ${emailUsed}</li>
            <li><strong>IP de Firma:</strong> ${ip_address || "0.0.0.0"}</li>
            <li><strong>Fecha/Hora:</strong> ${formattedDate}</li>
          </ul>
          <p>Los documentos originales firmados se adjuntan a este correo electrónico en formato PDF.</p>
          <p>Si prefiere ver y descargar las versiones en formato PDF (con sello y certificado digital eIDAS), acceda al siguiente enlace público:</p>
          <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar y Descargar PDF</a></p>
          <br/>
          <p>Atentamente,</p>
          <p><strong>Equipo ${empresa.trade_name}</strong></p>
        `;
      } else if (lang === "en") {
        subject = `[SIGNED] Commercial Proposal and Contract ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Signature Process Completed!</h2>
          <p>Hello,</p>
          <p>We are pleased to inform you that the electronic signature process for commercial proposal <strong>${est.codigo}</strong> and the respective contract has been successfully completed.</p>
          <p><strong>Process details:</strong></p>
          <ul>
            <li><strong>Client/Company:</strong> ${clientOrLeadName}</li>
            <li><strong>Signer:</strong> ${emailUsed}</li>
            <li><strong>Signature IP:</strong> ${ip_address || "0.0.0.0"}</li>
            <li><strong>Date/Time:</strong> ${formattedDate}</li>
          </ul>
          <p>The original signed documents are attached to this email in PDF format.</p>
          <p>If you prefer to view and download the PDF versions (with digital stamp and eIDAS digital certificate), please access the following public link:</p>
          <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">View and Download PDF</a></p>
          <br/>
          <p>Sincerely,</p>
          <p><strong>${empresa.trade_name} Team</strong></p>
        `;
      } else if (lang === "it") {
        subject = `[FIRMATO] Proposta Commerciale e Contratto ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Processo di Firma Completato!</h2>
          <p>Ciao,</p>
          <p>Siamo lieti di informarti che il processo di firma elettronica della proposta commerciale <strong>${est.codigo}</strong> e del relativo contratto è stato completato con successo.</p>
          <p><strong>Dettagli del processo:</strong></p>
          <ul>
            <li><strong>Cliente/Società:</strong> ${clientOrLeadName}</li>
            <li><strong>Firmatario:</strong> ${emailUsed}</li>
            <li><strong>IP di Firma:</strong> ${ip_address || "0.0.0.0"}</li>
            <li><strong>Data/Ora:</strong> ${formattedDate}</li>
          </ul>
          <p>I documenti originali firmati sono allegati a questa email in formato PDF.</p>
          <p>Se preferisci visualizzare e scaricare le versioni in formato PDF (con timbro e certificato digitale eIDAS), accedi al seguente link pubblico:</p>
          <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizza e Scarica PDF</a></p>
          <br/>
          <p>Cordiali saluti,</p>
          <p><strong>Team ${empresa.trade_name}</strong></p>
        `;
      } else if (lang === "fr") {
        subject = `[SIGNÉ] Proposition Commerciale et Contrat ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Processus de Signature Terminé !</h2>
          <p>Bonjour,</p>
          <p>Nous avons le plaisir de vous informer que le processus de signature électronique de la proposition commerciale <strong>${est.codigo}</strong> et du contrat respectif a été complété avec succès.</p>
          <p><strong>Détails du processus :</strong></p>
          <ul>
            <li><strong>Client/Entreprise :</strong> ${clientOrLeadName}</li>
            <li><strong>Signataire :</strong> ${emailUsed}</li>
            <li><strong>IP de Signature :</strong> ${ip_address || "0.0.0.0"}</li>
            <li><strong>Date/Heure :</strong> ${formattedDate}</li>
          </ul>
          <p>Les documents originaux signés sont joints à cet e-mail au format PDF.</p>
          <p>Si vous préférez visualiser et télécharger les versions au format PDF (avec cachet et certificat numérique eIDAS), veuillez accéder au lien public suivant :</p>
          <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualiser et Télécharger le PDF</a></p>
          <br/>
          <p>Cordialement,</p>
          <p><strong>L'équipe ${empresa.trade_name}</strong></p>
        `;
      } else {
        // Default: pt
        subject = `[ASSINADO] Proposta e Contrato Comercial ${est.codigo} - ${empresa.trade_name}`;
        htmlContent = `
          <h2>Processo de Assinatura Concluído!</h2>
          <p>Olá,</p>
          <p>Temos o prazer de informar que o processo de assinatura eletrónica da proposta comercial <strong>${est.codigo}</strong> e do respetivo contrato foi concluído com sucesso.</p>
          <p><strong>Detalhes do processo:</strong></p>
          <ul>
            <li><strong>Cliente/Empresa:</strong> ${clientOrLeadName}</li>
            <li><strong>Assinante:</strong> ${emailUsed}</li>
            <li><strong>IP de Assinatura:</strong> ${ip_address || "0.0.0.0"}</li>
            <li><strong>Data/Hora:</strong> ${formattedDate}</li>
          </ul>
          <p>Os documentos originais assinados estão anexados a este e-mail em formato PDF.</p>
          <p>Se preferir visualizar e descarregar as versões em formato PDF (com carimbo e certificado digital eIDAS), aceda ao seguinte link público:</p>
          <p><a href="${publicLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar e Baixar PDF</a></p>
          <p>Atenciosamente,</p>
          <p><strong>Equipa ${empresa.trade_name}</strong></p>
        `;
      }

      const attachments: EmailAttachment[] = [];
      if (proposalPdfBase64) {
        attachments.push({
          name: `proposta_${est.codigo}.pdf`,
          contentType: "application/pdf",
          contentBytes: proposalPdfBase64,
        });
      } else if (proposalBase64) {
        attachments.push({
          name: `proposta_${est.codigo}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: proposalBase64,
        });
      }
      if (contractPdfBase64) {
        attachments.push({
          name: `contrato_${est.codigo}.pdf`,
          contentType: "application/pdf",
          contentBytes: contractPdfBase64,
        });
      } else if (contractBase64) {
        attachments.push({
          name: `contrato_${est.codigo}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: contractBase64,
        });
      }

      // Envia para o cliente com cópia oculta/CC para a empresa
      const mailRes = await sendMailViaGraph(senderEmail, senderName, emailUsed, [senderEmail], subject, htmlContent, attachments);
      if (!mailRes.success) {
        console.error("Erro no envio do e-mail de conclusão:", mailRes.error);
      }
    }

    let isConvertedToOrder = false;
    let conversionDetails = null;

    return new Response(
      JSON.stringify({
        success: true,
        message: isReprocess ? "Reprocessamento concluído com sucesso!" : "Proposta assinada com sucesso!",
        signed_at: ps.signed_at || new Date().toISOString(),
        is_converted_to_order: isConvertedToOrder,
        conversion_details: conversionDetails,
        signed_document_url: savedProposalPdfPath || ps.signed_document_url,
        contract_signed_document_url: savedContractPdfPath || ps.contract_signed_document_url,
        conversion_logs: conversionLogs,
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
