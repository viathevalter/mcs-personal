import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { createReport } from "npm:docx-templates@4.13.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { PDFDocument, StandardFonts, rgb, degrees } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeDataUrlToBytes(dataUrl: string): Uint8Array {
  const cleanBase64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function embedSignaturesInPdf(
  supabase: any,
  contract: any,
  metadata: Record<string, any>,
  workerSigBytes: Uint8Array | null,
  companySigBytes: Uint8Array | null
): Promise<void> {
  const baseDocUrl = metadata.base_document_url || contract.document_url;
  console.log(`[embedSignaturesInPdf] Baixando PDF base: ${baseDocUrl}`);

  const { data: pdfBlob, error: dlErr } = await supabase.storage
    .from("worker-contracts")
    .download(baseDocUrl);

  if (dlErr || !pdfBlob) {
    throw new Error(`Falha ao baixar PDF base (${baseDocUrl}): ${dlErr?.message}`);
  }

  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let workerPngImage: any = null;
  let companyPngImage: any = null;

  if (workerSigBytes && workerSigBytes.byteLength > 0) {
    try {
      workerPngImage = await pdfDoc.embedPng(workerSigBytes);
    } catch (e) {
      console.warn("[embedSignaturesInPdf] Tentando embedJpg para assinatura do trabalhador:", e);
      workerPngImage = await pdfDoc.embedJpg(workerSigBytes);
    }
  }

  if (companySigBytes && companySigBytes.byteLength > 0) {
    try {
      companyPngImage = await pdfDoc.embedPng(companySigBytes);
    } catch (e) {
      console.warn("[embedSignaturesInPdf] Tentando embedJpg para assinatura da empresa:", e);
      companyPngImage = await pdfDoc.embedJpg(companySigBytes);
    }
  }

  const pages = pdfDoc.getPages();
  // Se o PDF já tinha uma página 8 de certificado anexada anteriormente (caso não tivesse base_document_url), removemos a página 8 antes de recriar
  if (!metadata.base_document_url && pages.length > 7) {
    pdfDoc.removePage(7);
  }

  const contentPages = pdfDoc.getPages();
  const numContentPages = contentPages.length;

  // 1. Carimbar margem esquerda em TODAS as páginas do contrato (exigência SEPE: "Deberán firmarse todas las páginas en el margen izquierdo")
  for (let i = 0; i < numContentPages; i++) {
    const page = contentPages[i];
    if (workerPngImage) {
      page.drawImage(workerPngImage, {
        x: 24,
        y: 190,
        width: 110,
        height: 18,
        rotate: degrees(90),
      });
      page.drawText(`Trabajador/a: ${(metadata.worker_name || "").slice(0, 28)}`, {
        x: 27,
        y: 190,
        size: 5.5,
        font: helvetica,
        color: rgb(0.2, 0.25, 0.35),
        rotate: degrees(90),
      });
    }

    if (companyPngImage) {
      page.drawImage(companyPngImage, {
        x: 24,
        y: 390,
        width: 110,
        height: 18,
        rotate: degrees(90),
      });
      page.drawText(`Empresa: ${(metadata.company_signer_name || "HEXAGON").slice(0, 28)}`, {
        x: 27,
        y: 390,
        size: 5.5,
        font: helvetica,
        color: rgb(0.1, 0.25, 0.45),
        rotate: degrees(90),
      });
    }
  }

  // 2. Carimbar caixas de assinatura na última página do contrato SEPE (Página 7 / Página 20 original)
  const lastContractPage = contentPages[numContentPages - 1];
  if (lastContractPage) {
    // Caixa 1: El/la trabajador/a (x: 65..200, y: 205..265)
    if (workerPngImage) {
      lastContractPage.drawImage(workerPngImage, {
        x: 65,
        y: 208,
        width: 130,
        height: 52,
      });
      lastContractPage.drawText(
        `Firmado OTP: ${metadata.worker_otp || ""} | ${(metadata.worker_signed_at || "").slice(0, 16).replace("T", " ")} UTC`,
        {
          x: 62,
          y: 199,
          size: 5.5,
          font: helvetica,
          color: rgb(0.15, 0.3, 0.15),
        }
      );
    }

    // Caixa 2: El/la representante de la empresa (x: 230..365, y: 205..265)
    if (companyPngImage) {
      lastContractPage.drawImage(companyPngImage, {
        x: 230,
        y: 208,
        width: 130,
        height: 52,
      });
      lastContractPage.drawText(
        `Firmado OTP: ${metadata.company_otp || ""} | ${(metadata.company_signed_at || "").slice(0, 16).replace("T", " ")} UTC`,
        {
          x: 225,
          y: 199,
          size: 5.5,
          font: helvetica,
          color: rgb(0.1, 0.25, 0.45),
        }
      );
    }
  }

  // 3. Anexar Página 8: Certificado de Firma Electrónica Bilateral (eIDAS / UE 910/2014)
  const certPage = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = certPage.getSize();

  // Cabeçalho
  certPage.drawRectangle({
    x: 40,
    y: height - 105,
    width: width - 80,
    height: 65,
    color: rgb(0.06, 0.09, 0.16),
  });
  certPage.drawText("CERTIFICADO DE FIRMA ELECTRÓNICA BILATERAL", {
    x: 60,
    y: height - 68,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  certPage.drawText("Validez Jurídica eIDAS / Reglamento (UE) Nº 910/2014 - Auditoría Criptográfica OTP", {
    x: 60,
    y: height - 88,
    size: 9,
    font: helvetica,
    color: rgb(0.75, 0.82, 0.92),
  });

  // Resumo do Contrato
  certPage.drawRectangle({
    x: 40,
    y: height - 175,
    width: width - 80,
    height: 58,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.82, 0.86, 0.92),
    borderWidth: 1,
  });
  certPage.drawText(`ID del Contrato: ${contract.id}`, {
    x: 55,
    y: height - 135,
    size: 9,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  certPage.drawText(`Empresa Contratante: ${contract.contratante || "HEXAGON MONTAJES INDUSTRIALES, S.L."}`, {
    x: 55,
    y: height - 150,
    size: 9,
    font: helvetica,
    color: rgb(0.2, 0.25, 0.35),
  });
  certPage.drawText(
    `Modalidad / Puesto: Código SEPE ${metadata.sepe_codigo || "300"} (Fijo-Discontinuo) - ${metadata.puesto || "Operario"}`,
    {
      x: 55,
      y: height - 165,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.25, 0.35),
    }
  );

  // Bloco 1: Persona Trabajadora
  const b1Top = height - 195;
  const bHeight = 250;
  certPage.drawRectangle({
    x: 40,
    y: b1Top - bHeight,
    width: width - 80,
    height: bHeight,
    color: rgb(1, 1, 1),
    borderColor: metadata.worker_signed ? rgb(0.13, 0.65, 0.35) : rgb(0.8, 0.82, 0.86),
    borderWidth: 1.2,
  });

  certPage.drawRectangle({
    x: 40,
    y: b1Top - 28,
    width: width - 80,
    height: 28,
    color: metadata.worker_signed ? rgb(0.92, 0.98, 0.94) : rgb(0.95, 0.96, 0.97),
  });

  certPage.drawText("PARTE 1: PERSONA TRABAJADORA (EL/LA TRABAJADOR/A)", {
    x: 55,
    y: b1Top - 18,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  certPage.drawText(metadata.worker_signed ? "FIRMADO Y AUDITADO" : "PENDIENTE DE FIRMA", {
    x: width - 180,
    y: b1Top - 18,
    size: 9,
    font: helveticaBold,
    color: metadata.worker_signed ? rgb(0.08, 0.55, 0.25) : rgb(0.75, 0.45, 0.05),
  });

  const wRows = [
    ["Nombre Completo:", metadata.worker_name || "-"],
    ["Documento (NIE/DNI/Pasaporte):", metadata.worker_document || "-"],
    ["Correo Electrónico / Contacto:", metadata.worker_email || "-"],
    ["Código OTP Validado:", metadata.worker_signed ? String(metadata.worker_otp || "-") : "Pendiente"],
    ["Fecha y Hora (UTC):", metadata.worker_signed ? String(metadata.worker_signed_at || "-") : "Pendiente"],
    ["Dirección IP Registrada:", metadata.worker_signed ? String(metadata.worker_ip || "-") : "-"],
  ];

  let wy = b1Top - 48;
  for (const [label, val] of wRows) {
    certPage.drawText(label, { x: 55, y: wy, size: 8.5, font: helveticaBold, color: rgb(0.25, 0.3, 0.4) });
    certPage.drawText(String(val), { x: 210, y: wy, size: 8.5, font: helvetica, color: rgb(0.1, 0.15, 0.2) });
    wy -= 16;
  }

  certPage.drawText("Firma Digitalizada del Trabajador/a:", {
    x: 55,
    y: b1Top - 160,
    size: 8.5,
    font: helveticaBold,
    color: rgb(0.25, 0.3, 0.4),
  });

  if (workerPngImage) {
    certPage.drawImage(workerPngImage, {
      x: 55,
      y: b1Top - 235,
      width: 170,
      height: 65,
    });
  } else {
    certPage.drawText("[ Aguardando firma electrónica del trabajador ]", {
      x: 55,
      y: b1Top - 200,
      size: 8.5,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.65),
    });
  }

  // Bloco 2: Representante Legal de la Empresa
  const b2Top = b1Top - bHeight - 20;
  certPage.drawRectangle({
    x: 40,
    y: b2Top - bHeight,
    width: width - 80,
    height: bHeight,
    color: rgb(1, 1, 1),
    borderColor: metadata.company_signed ? rgb(0.12, 0.4, 0.78) : rgb(0.8, 0.82, 0.86),
    borderWidth: 1.2,
  });

  certPage.drawRectangle({
    x: 40,
    y: b2Top - 28,
    width: width - 80,
    height: 28,
    color: metadata.company_signed ? rgb(0.92, 0.95, 1) : rgb(0.95, 0.96, 0.97),
  });

  certPage.drawText("PARTE 2: REPRESENTANTE LEGAL DE LA EMPRESA (HEXAGON)", {
    x: 55,
    y: b2Top - 18,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  certPage.drawText(metadata.company_signed ? "FIRMADO Y AUDITADO" : "PENDIENTE DE FIRMA", {
    x: width - 180,
    y: b2Top - 18,
    size: 9,
    font: helveticaBold,
    color: metadata.company_signed ? rgb(0.12, 0.38, 0.78) : rgb(0.75, 0.45, 0.05),
  });

  const cRows = [
    ["Representante Legal:", metadata.company_signer_name || metadata.representante_nombre || "-"],
    ["NIF / NIE Representante:", metadata.company_signer_nif || metadata.representante_nif || "-"],
    ["En Concepto / Cargo:", metadata.company_signer_cargo || metadata.representante_cargo || "ADMINISTRADOR ÚNICO"],
    ["Código OTP Corporativo:", metadata.company_signed ? String(metadata.company_otp || "-") : "Pendiente"],
    ["Fecha y Hora (UTC):", metadata.company_signed ? String(metadata.company_signed_at || "-") : "Pendiente"],
    ["Dirección IP Registrada:", metadata.company_signed ? String(metadata.company_ip || "-") : "-"],
  ];

  let cy = b2Top - 48;
  for (const [label, val] of cRows) {
    certPage.drawText(label, { x: 55, y: cy, size: 8.5, font: helveticaBold, color: rgb(0.25, 0.3, 0.4) });
    certPage.drawText(String(val), { x: 210, y: cy, size: 8.5, font: helvetica, color: rgb(0.1, 0.15, 0.2) });
    cy -= 16;
  }

  certPage.drawText("Firma Digitalizada del Representante de la Empresa:", {
    x: 55,
    y: b2Top - 160,
    size: 8.5,
    font: helveticaBold,
    color: rgb(0.25, 0.3, 0.4),
  });

  if (companyPngImage) {
    certPage.drawImage(companyPngImage, {
      x: 55,
      y: b2Top - 235,
      width: 170,
      height: 65,
    });
  } else {
    certPage.drawText("[ Aguardando firma electrónica del representante de la empresa ]", {
      x: 55,
      y: b2Top - 200,
      size: 8.5,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.65),
    });
  }

  // Rodapé legal
  certPage.drawText(
    "Este documento ha sido firmado electrónicamente con validación OTP y sello de tiempo de conformidad con el Reglamento (UE) Nº 910/2014 (eIDAS) y el Art. 8 del Estatuto de los Trabajadores.",
    {
      x: 40,
      y: 35,
      size: 6.8,
      font: helvetica,
      color: rgb(0.45, 0.5, 0.58),
    }
  );

  const finalPdfBytes = await pdfDoc.save();
  console.log(`[embedSignaturesInPdf] Fazendo upload do PDF assinado (${finalPdfBytes.byteLength} bytes) para: ${contract.document_url}`);

  const { error: uploadErr } = await supabase.storage
    .from("worker-contracts")
    .upload(contract.document_url, finalPdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Erro ao atualizar PDF assinado no storage: ${uploadErr.message}`);
  }
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

        if (content.includes('{{')) {
          content = content.replace(/\{\{([\s\S]*?)\}\}/g, (match, p1) => {
            const cleaned = p1.replace(/<[^>]+>/g, '');
            return `{{${cleaned}}}`;
          });
        }

        if (/\{\{\s*IMAGE\s*:\s*[a-zA-Z0-9_]+\s*\}\}/i.test(content) || content.includes('IMAGE:')) {
          content = content.replace(/\{\{\s*IMAGE\s*:\s*([a-zA-Z0-9_]+)\s*\}\}/gi, '{{IMAGE $1}}');
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

    const { error: uploadErr } = await supabase.storage
      .from("worker-contracts")
      .upload(documentUrl, finalDocBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true
      });

    if (uploadErr) {
      console.error("[embedSignature] Upload error:", uploadErr.message);
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
    const binaryString = atob(docxBase64);
    const docxBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      docxBytes[i] = binaryString.charCodeAt(i);
    }

    const tempPath = `/temp_conversions/temp_${Date.now()}_${fileName}`;
    const encodedPath = tempPath.split('/').map(c => encodeURIComponent(c)).join('/');
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;

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
      throw new Error(`Upload temp docx failed: ${errText}`);
    }

    const item = await uploadRes.json();
    const itemId = item.id;

    let pdfBytes: Uint8Array;
    try {
      const convertUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content?format=pdf`;
      const convertRes = await fetch(convertUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!convertRes.ok) {
        const errText = await convertRes.text();
        throw new Error(`Conversion endpoint failed: ${errText}`);
      }

      pdfBytes = new Uint8Array(await convertRes.arrayBuffer());
    } finally {
      fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }).catch(err => console.error("[PDF Convert] Failed to delete temp DOCX:", err));
    }

    const pdfBase64 = encode(pdfBytes);
    const pdfName = fileName.replace(/\.docx$/i, '.pdf');

    return {
      name: pdfName,
      contentType: "application/pdf",
      contentBytes: pdfBase64,
    };
  } catch (err: any) {
    console.error(`[PDF Convert] Error during conversion of ${fileName}:`, err);
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      action,
      contract_id,
      token,
      otp_code,
      signature_image,
      ip_address,
      user_agent,
      signer_role = "worker",
      signer_name,
      signer_nif,
      signer_cargo,
      signer_email,
    } = body;

    // =========================================================================
    // AÇÃO AUXILIAR: GERAR / REENVIAR OTP PARA O REPRESENTANTE DA EMPRESA
    // =========================================================================
    if (action === "request_company_otp") {
      if (!contract_id) {
        return new Response(
          JSON.stringify({ error: "Parâmetro contract_id é obrigatório para solicitar OTP da empresa." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: contract, error: cErr } = await supabase
        .schema("core_personal")
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (cErr || !contract) {
        return new Response(
          JSON.stringify({ error: "Contrato não encontrado." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const freshOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAtIso = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const currentMeta = (contract.metadata && typeof contract.metadata === "object") ? contract.metadata : {};
      const updatedMeta = {
        ...currentMeta,
        company_otp_code: freshOtp,
        company_otp_expires_at: expiresAtIso,
      };

      await supabase
        .schema("core_personal")
        .from("contracts")
        .update({ metadata: updatedMeta })
        .eq("id", contract.id);

      const targetEmail = signer_email || currentMeta.representante_email || "";
      let emailSent = false;
      if (resendApiKey && targetEmail) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Mastercorp Contratos <contratos@mastercorp.pt>",
              to: targetEmail,
              subject: `[OTP Empresa] Firma de Contrato - ${contract.contratante}`,
              html: `
                <h2>Código OTP para Firma del Representante (${contract.contratante})</h2>
                <p>Su código de verificación OTP para firmar electrónicamente el contrato es:</p>
                <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#0f172a;">${freshOtp}</p>
                <p>Válido por 72 horas.</p>
              `,
            }),
          });
          emailSent = res.ok;
        } catch (e) {
          console.warn("Aviso ao enviar OTP corporativo:", e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          company_otp_code: freshOtp,
          email_sent: emailSent,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // FLUXO DE ASSINATURA (TRABALHADOR OU REPRESENTANTE DA EMPRESA)
    // =========================================================================
    const isCompanySigner = signer_role === "company";

    if ((!token && !contract_id) || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Parâmetros de identificação do contrato e otp_code são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar o contrato
    let contractQuery = supabase.schema("core_personal").from("contracts").select("*");
    if (isCompanySigner && contract_id) {
      contractQuery = contractQuery.eq("id", contract_id);
    } else if (token) {
      contractQuery = contractQuery.eq("signature_token", token);
    } else {
      contractQuery = contractQuery.eq("id", contract_id);
    }

    const { data: contract, error: contractErr } = await contractQuery.single();

    if (contractErr || !contract) {
      return new Response(
        JSON.stringify({ error: "Contrato não encontrado ou token inválido." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata: Record<string, any> =
      contract.metadata && typeof contract.metadata === "object" ? { ...contract.metadata } : {};

    // 2. Validar status e OTP conforme o papel do signatário
    if (isCompanySigner) {
      if (metadata.company_signed) {
        return new Response(
          JSON.stringify({ error: "Este contrato já foi assinado pelo representante da empresa." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const expectedCompanyOtp = metadata.company_otp_code || contract.otp_code;
      if (!expectedCompanyOtp || String(expectedCompanyOtp).trim() !== String(otp_code).trim()) {
        return new Response(
          JSON.stringify({ error: "Código OTP corporativo inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (contract.status === "signed" || metadata.worker_signed) {
        return new Response(
          JSON.stringify({ error: "Este contrato já foi assinado pelo trabalhador." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (contract.status !== "pending_signature") {
        return new Response(
          JSON.stringify({ error: `Este contrato está no status: ${contract.status}.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (String(contract.otp_code || "").trim() !== String(otp_code).trim()) {
        return new Response(
          JSON.stringify({ error: "Código de verificação OTP inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (contract.otp_expires_at && new Date(contract.otp_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "O código OTP expirou. Por favor, solicite a reemissão do contrato." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Buscar dados completos do trabalhador
    const { data: worker, error: workerErr } = await supabase
      .schema("core_personal")
      .from("workers")
      .select("email, nome, nie, dni, pasaporte, nif")
      .eq("id", contract.worker_id)
      .single();

    if (workerErr || !worker) {
      throw new Error(`Erro ao obter dados do trabalhador: ${workerErr?.message}`);
    }

    const nowIso = new Date().toISOString();
    const isPdfContract = Boolean(contract.document_url && contract.document_url.toLowerCase().endsWith(".pdf"));

    // Converter imagem de assinatura enviada
    let currentSigBytes: Uint8Array | null = null;
    if (signature_image) {
      currentSigBytes = decodeDataUrlToBytes(signature_image);
    }

    // Atualizar metadados da assinatura correspondente
    if (isCompanySigner) {
      const sigPath = `signatures/${contract.id}_company.png`;
      if (currentSigBytes) {
        await supabase.storage.from("worker-contracts").upload(sigPath, currentSigBytes, {
          contentType: "image/png",
          upsert: true,
        });
      }
      metadata.company_signed = true;
      metadata.company_signed_at = nowIso;
      metadata.company_ip = ip_address || "0.0.0.0";
      metadata.company_otp = otp_code;
      metadata.company_signer_name = signer_name || metadata.representante_nombre || "Representante Legal";
      metadata.company_signer_nif = signer_nif || metadata.representante_nif || "";
      metadata.company_signer_cargo = signer_cargo || metadata.representante_cargo || "ADMINISTRADOR ÚNICO";
      metadata.company_signer_email = signer_email || metadata.representante_email || "";
      metadata.company_sig_path = sigPath;
      metadata.company_otp_code = null;
    } else {
      const sigPath = `signatures/${contract.id}_worker.png`;
      if (currentSigBytes) {
        await supabase.storage.from("worker-contracts").upload(sigPath, currentSigBytes, {
          contentType: "image/png",
          upsert: true,
        });
      }
      metadata.worker_signed = true;
      metadata.worker_signed_at = nowIso;
      metadata.worker_ip = ip_address || "0.0.0.0";
      metadata.worker_otp = otp_code;
      metadata.worker_name = worker.nome || "Trabalhador";
      metadata.worker_document = worker.nie || worker.dni || worker.pasaporte || worker.nif || "";
      metadata.worker_email = worker.email || "";
      metadata.worker_sig_path = sigPath;
    }

    // Garantir que metadados básicos do trabalhador estejam preenchidos para o certificado PDF mesmo quando a empresa assinar primeiro
    if (!metadata.worker_name) metadata.worker_name = worker.nome || "";
    if (!metadata.worker_document) metadata.worker_document = worker.nie || worker.dni || worker.pasaporte || worker.nif || "";
    if (!metadata.worker_email) metadata.worker_email = worker.email || "";

    // 3.5. Embutir assinatura(s) no documento (PDF SEPE ou DOCX)
    if (isPdfContract && contract.document_url) {
      let workerSigBytes: Uint8Array | null = !isCompanySigner ? currentSigBytes : null;
      let companySigBytes: Uint8Array | null = isCompanySigner ? currentSigBytes : null;

      if (!workerSigBytes && metadata.worker_signed && metadata.worker_sig_path) {
        const { data: wSigBlob } = await supabase.storage
          .from("worker-contracts")
          .download(metadata.worker_sig_path);
        if (wSigBlob) workerSigBytes = new Uint8Array(await wSigBlob.arrayBuffer());
      }

      if (!companySigBytes && metadata.company_signed && metadata.company_sig_path) {
        const { data: cSigBlob } = await supabase.storage
          .from("worker-contracts")
          .download(metadata.company_sig_path);
        if (cSigBlob) companySigBytes = new Uint8Array(await cSigBlob.arrayBuffer());
      }

      await embedSignaturesInPdf(supabase, contract, metadata, workerSigBytes, companySigBytes);

      await supabase
        .schema("core_personal")
        .from("contracts")
        .update({ signed_document_url: contract.document_url })
        .eq("id", contract.id);
    } else if (currentSigBytes && contract.document_url) {
      console.log("[sign-contract] Imagem de assinatura recebida para DOCX, iniciando embutimento...");
      await embedSignatureInDocx(supabase, contract.document_url, currentSigBytes, {
        workerName: isCompanySigner ? (metadata.company_signer_name || "Representante") : (worker.nome || "Trabalhador"),
        workerEmail: isCompanySigner ? (metadata.company_signer_email || "empresa@mastercorp.pt") : (worker.email || "Sem e-mail"),
        ipAddress: ip_address || "0.0.0.0",
        otpCode: otp_code,
        signedAtIso: new Date().toLocaleString("pt-PT", { timeZone: "UTC" }) + " (UTC)"
      });

      // Tentar converter DOCX para PDF via Graph
      try {
        const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
        const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
        const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');
        const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');

        if (tenantId && clientId && clientSecret && driveId) {
          const { data: updatedDocxBlob, error: dlUpdatedErr } = await supabase.storage
            .from("worker-contracts")
            .download(contract.document_url);

          if (!dlUpdatedErr && updatedDocxBlob) {
            const updatedDocxBase64 = encode(new Uint8Array(await updatedDocxBlob.arrayBuffer()));
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
              const pdfAtt = await convertDocxToPdfViaGraph(access_token, driveId, updatedDocxBase64, `contrato_${contract.id}.docx`);
              if (pdfAtt && pdfAtt.contentType === "application/pdf") {
                const pdfBinaryString = atob(pdfAtt.contentBytes);
                const pdfBytes = new Uint8Array(pdfBinaryString.length);
                for (let i = 0; i < pdfBinaryString.length; i++) {
                  pdfBytes[i] = pdfBinaryString.charCodeAt(i);
                }

                const pdfPath = contract.document_url.replace(/\.docx$/i, '.pdf');
                const { error: uploadPdfErr } = await supabase.storage
                  .from("worker-contracts")
                  .upload(pdfPath, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                if (!uploadPdfErr) {
                  await supabase
                    .schema("core_personal")
                    .from("contracts")
                    .update({ signed_document_url: pdfPath })
                    .eq("id", contract.id);
                }
              }
            }
          }
        }
      } catch (errPdf) {
        console.error("[sign-contract] Erro na conversão para PDF:", errPdf);
      }
    }

    // 4. Inserir log de auditoria
    const auditPayload: Record<string, any> = {
      contract_id: contract.id,
      ip_address: ip_address || "0.0.0.0",
      user_agent: user_agent || "Desconhecido",
      verification_code: otp_code,
      email_or_phone_used: isCompanySigner
        ? (metadata.company_signer_email || metadata.company_signer_name || "representante@hexagon.es")
        : (worker.email || "e-mail-nao-cadastrado@mastercorp.pt"),
      signer_role: isCompanySigner ? "company" : "worker",
      signer_name: isCompanySigner ? (metadata.company_signer_name || "Representante Legal") : (worker.nome || "Trabalhador"),
    };

    const { error: auditErr } = await supabase
      .schema("core_personal")
      .from("contract_audit_logs")
      .insert(auditPayload);

    if (auditErr) {
      console.warn("Aviso ao registrar log de auditoria:", auditErr.message);
    }

    // 5. Atualizar registro do contrato
    // Importante: Se a empresa assinar primeiro, mantemos status = 'pending_signature' e o otp_code do trabalhador intacto
    // para que o trabalhador ainda possa abrir seu link /assinar/:token e assinar!
    const contractUpdatePayload: Record<string, any> = {
      metadata,
    };

    if (!isCompanySigner) {
      contractUpdatePayload.status = "signed";
      contractUpdatePayload.signed_at = nowIso;
      contractUpdatePayload.otp_code = null;
      contractUpdatePayload.otp_expires_at = null;
    } else if (metadata.worker_signed || contract.status === "signed") {
      contractUpdatePayload.status = "signed";
      if (!contract.signed_at) contractUpdatePayload.signed_at = nowIso;
    }

    const { error: updateErr } = await supabase
      .schema("core_personal")
      .from("contracts")
      .update(contractUpdatePayload)
      .eq("id", contract.id);

    if (updateErr) {
      throw new Error(`Falha ao atualizar status do contrato: ${updateErr.message}`);
    }

    // 6. Atualizar status da alocação quando o trabalhador assinar
    if (!isCompanySigner && contract.assignment_id) {
      try {
        const { data: currentAssignment } = await supabase
          .schema("core_personal")
          .from("worker_assignments")
          .select("id, planned_start_date, start_date, status, worker_id")
          .eq("id", contract.assignment_id)
          .maybeSingle();

        if (currentAssignment) {
          const today = new Date().toISOString().split("T")[0];
          const plannedStart = currentAssignment.planned_start_date;
          const isFuture = plannedStart && plannedStart > today;

          if (isFuture) {
            await supabase
              .schema("core_personal")
              .from("worker_assignments")
              .update({
                status: "planned",
                start_date: null
              })
              .eq("id", contract.assignment_id);
          } else {
            await supabase
              .schema("core_personal")
              .from("worker_assignments")
              .update({
                status: "active",
                start_date: currentAssignment.start_date || plannedStart || today
              })
              .eq("id", contract.assignment_id);
          }
        }
      } catch (errAssignment) {
        console.error("Erro ao sincronizar alocação após assinatura do contrato:", errAssignment);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signer_role: isCompanySigner ? "company" : "worker",
        worker_signed: Boolean(metadata.worker_signed),
        company_signed: Boolean(metadata.company_signed),
        message: isCompanySigner
          ? "Contrato assinado eletronicamente pelo Representante da Empresa com sucesso!"
          : "Contrato assinado eletronicamente pelo Trabalhador com sucesso!",
        signed_at: nowIso,
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
