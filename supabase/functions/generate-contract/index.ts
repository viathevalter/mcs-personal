import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createReport } from "npm:docx-templates@4.13.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { PDFDocument, StandardFonts } from "npm:pdf-lib@1.17.1";

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
    let {
      worker_id,
      assignment_id,
      contratante,
      contract_type,
      empresa_id,
      request_date,
      notice_start_date,
      notice_end_date,
      effective_date,
      worker_updates,
      sepe_overrides,
      template_base64,
    } = await req.json();

    if (!worker_id || !contratante || !contract_type) {
      return new Response(
        JSON.stringify({ error: "Parâmetros worker_id, contratante e contract_type são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve empresa_id (se não informado ou se for o ID da Holding, mapeia pela contratante)
    if (!empresa_id || empresa_id === "bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d") {
      if (assignment_id) {
        const { data: wa } = await supabase
          .schema("core_personal")
          .from("worker_assignments")
          .select("empresa_id")
          .eq("id", assignment_id)
          .maybeSingle();
        if (wa?.empresa_id && wa.empresa_id !== "bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d") {
          empresa_id = wa.empresa_id;
        }
      }
      
      if (!empresa_id || empresa_id === "bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d") {
        // Fallback mapping based on contratante name
        const upperContr = contratante.toUpperCase();
        if (upperContr.includes("STOCCO")) {
          empresa_id = "441f1f5d-aed3-40e3-8c77-7b1217757251";
        } else if (upperContr.includes("WISEOWE")) {
          empresa_id = "dae64d51-2181-4510-b14f-e63d2f111a8e";
        } else if (upperContr.includes("LUMINOUS")) {
          empresa_id = "847796c4-b253-4e53-9e6b-34a127ec7d85";
        } else if (upperContr.includes("TRIANGULO") || upperContr.includes("TRI - TRIANGULO")) {
          empresa_id = "a798620a-358a-4c6c-9db2-3a507c583cac";
        } else if (upperContr.includes("HEXAGON") || upperContr === "HEX") {
          empresa_id = "2c944db5-f1d0-4789-a562-8cfa1c0155b7";
        } else {
          empresa_id = "dae64d51-2181-4510-b14f-e63d2f111a8e";
        }
      }
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

    // Atualizar documentos e campos espanhóis do trabalhador se informados manualmente no modal
    if (worker_updates && typeof worker_updates === "object") {
      const allowedFields = [
        "pasaporte",
        "nif",
        "niss",
        "dni",
        "nie",
        "nuss",
        "codigo_postal",
        "municipio_domicilio",
        "nivel_formativo",
      ];
      const validUpdates: Record<string, string> = {};
      for (const field of allowedFields) {
        if (typeof worker_updates[field] === "string" && worker_updates[field].trim() !== "") {
          validUpdates[field] = worker_updates[field].trim();
        }
      }
      if (Object.keys(validUpdates).length > 0) {
        await supabase
          .schema("core_personal")
          .from("workers")
          .update(validUpdates)
          .eq("id", worker_id);
        Object.assign(worker, validUpdates);

        if (worker.cod_colab) {
          try {
            const colabAllowed = ["pasaporte", "nif", "niss", "dni", "nie"];
            const colabUpdates: Record<string, string> = {};
            for (const cf of colabAllowed) {
              if (validUpdates[cf]) colabUpdates[cf] = validUpdates[cf];
            }
            if (Object.keys(colabUpdates).length > 0) {
              await supabase
                .schema("public")
                .from("colaboradores")
                .update(colabUpdates)
                .eq("cod_colab", worker.cod_colab);
            }
          } catch (colabErr) {
            console.warn("Aviso ao sincronizar public.colaboradores:", colabErr);
          }
        }
      }
    }

    // Validar se o trabalhador possui ao menos um documento de identificação cadastrado para emissão do contrato
    let hasDocument = [worker.pasaporte, worker.dni, worker.nie, worker.nif].some(doc => doc && doc.trim() !== "");
    if (!hasDocument) {
      // Tentar auto-sincronizar a partir de solicitações de documentos existentes
      const { data: docReq } = await supabase
        .schema("core_personal")
        .from("document_requests")
        .select("extracted_data, selfie_url")
        .eq("worker_id", worker_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docReq?.extracted_data) {
        const ed = docReq.extracted_data;
        const updates: any = {};
        if (ed.pasaporte && !worker.pasaporte) updates.pasaporte = ed.pasaporte;
        if (ed.dni && !worker.dni) updates.dni = ed.dni;
        if (ed.nie && !worker.nie) updates.nie = ed.nie;
        if (ed.nif && !worker.nif) updates.nif = ed.nif;
        if (ed.niss && !worker.niss) updates.niss = ed.niss;
        if (ed.nuss && !worker.nuss) updates.nuss = ed.nuss;
        if (ed.codigo_postal && !worker.codigo_postal) updates.codigo_postal = ed.codigo_postal;
        if (ed.municipio_domicilio && !worker.municipio_domicilio) updates.municipio_domicilio = ed.municipio_domicilio;
        if (ed.email && !worker.email) updates.email = ed.email;
        if ((ed.movil || ed.telefono) && !worker.movil) updates.movil = ed.movil || ed.telefono;
        if (ed.nacionalidade && !worker.nacionalidade) updates.nacionalidade = ed.nacionalidade;
        if (ed.fecha_nacimiento && !worker.fecha_nacimiento) updates.fecha_nacimiento = ed.fecha_nacimiento;
        if (ed.direccion_actual && !worker.address_line) updates.address_line = ed.direccion_actual;
        if (ed.ubicacion_actual && !worker.location) updates.location = ed.ubicacion_actual;
        if (ed.morada_contrato && !worker.morada_contrato) updates.morada_contrato = ed.morada_contrato;
        if (docReq.selfie_url && !worker.foto) updates.foto = docReq.selfie_url;

        if (Object.keys(updates).length > 0) {
          await supabase
            .schema("core_personal")
            .from("workers")
            .update(updates)
            .eq("id", worker_id);

          Object.assign(worker, updates);
          hasDocument = [worker.pasaporte, worker.dni, worker.nie, worker.nif].some(doc => doc && doc.trim() !== "");
        }
      }
    }

    if (!hasDocument) {
      return new Response(
        JSON.stringify({ error: "O trabalhador deve ter pelo menos um documento de identificação (Passaporte, DNI, NIE ou NIF) cadastrado para gerar o contrato." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se o trabalhador possuir um código temporário, converter para o definitivo sequencial
    let workerCode = worker.cod_colab;
    if (workerCode && workerCode.startsWith("TEMP-")) {
      console.log(`Convertendo código temporário ${workerCode} para definitivo...`);
      
      const supabasePersonal = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: 'core_personal' }
      });

      const { data: nextCode, error: nextCodeErr } = await supabasePersonal
        .rpc("fn_generate_next_cod_colab");
        
      if (nextCodeErr || !nextCode) {
        throw new Error(`Falha ao gerar o próximo código de colaborador: ${nextCodeErr?.message || "Código nulo"}`);
      }

      console.log(`Próximo código de colaborador gerado: ${nextCode}`);

      const { error: updateErr } = await supabase
        .schema("core_personal")
        .from("workers")
        .update({ cod_colab: nextCode })
        .eq("id", worker_id);

      if (updateErr) {
        throw new Error(`Falha ao atualizar o código definitivo no banco: ${updateErr.message}`);
      }

      workerCode = nextCode;
      worker.cod_colab = nextCode;
    }

    // 2. Buscar informações da alocação se informada, caso contrário buscar a mais recente do trabalhador
    let assignment = null;
    if (assignment_id) {
      const { data: assoc, error: assocErr } = await supabase
        .schema("core_personal")
        .from("vw_worker_allocations")
        .select("*")
        .eq("id", assignment_id)
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

    // 3.5. Complementar informações de cliente e morada de obra se disponíveis
    let clientAddress = "";
    let siteAddress = "";
    let siteCity = "";
    let sitePostalCode = "";
    let siteName = "";
    let jobFunction = assignment?.funcion || worker.funcion || "Colaborador";
    let clientName = assignment?.cliente_nombre || "Trabalho Temporário";
    let startDate = assignment?.fechainiciopedido || new Date().toISOString().split("T")[0];

    if (assignment && assignment.id) {
      try {
        const { data: wa } = await supabase
          .schema("core_personal")
          .from("worker_assignments")
          .select("client_id, client_site_id, job_function_name_snapshot, start_date, planned_start_date")
          .eq("id", assignment.id)
          .maybeSingle();

        if (wa) {
          if (wa.job_function_name_snapshot) jobFunction = wa.job_function_name_snapshot;
          if (wa.start_date || wa.planned_start_date) {
            startDate = wa.start_date || wa.planned_start_date;
          }

          if (wa.client_id) {
            const { data: cli } = await supabase
              .schema("core_common")
              .from("clients")
              .select("legal_name, trade_name, address_line, city")
              .eq("id", wa.client_id)
              .maybeSingle();
            if (cli) {
              clientName = cli.trade_name || cli.legal_name || clientName;
              clientAddress = [cli.address_line, cli.city].filter(Boolean).join(", ");
            }
          }

          if (wa.client_site_id) {
            const { data: site } = await supabase
              .schema("core_common")
              .from("client_sites")
              .select("name, address_line, city, postal_code")
              .eq("id", wa.client_site_id)
              .maybeSingle();
            if (site) {
              siteName = site.name || "";
              siteCity = site.city || "";
              sitePostalCode = site.postal_code || "";
              siteAddress = [site.address_line, site.postal_code, site.city].filter(Boolean).join(", ");
            }
          }
        }
      } catch (errAssoc) {
        console.error("Erro ao complementar dados da alocação:", errAssoc);
      }
    }

    // Tentar buscar preferências salvas na solicitação de documentos do trabalhador (data_inicio, cliente e campos espanhóis)
    try {
      const { data: latestDocReq } = await supabase
        .schema("core_personal")
        .from("document_requests")
        .select("extracted_data")
        .eq("worker_id", worker.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDocReq?.extracted_data) {
        const ed = latestDocReq.extracted_data;
        if (ed.start_date) {
          startDate = ed.start_date;
        }
        if (ed.nuss && !worker.nuss) worker.nuss = ed.nuss;
        if (ed.codigo_postal && !worker.codigo_postal) worker.codigo_postal = ed.codigo_postal;
        if (ed.municipio_domicilio && !worker.municipio_domicilio) worker.municipio_domicilio = ed.municipio_domicilio;
        if (ed.client_id) {
          const { data: cli } = await supabase
            .schema("core_common")
            .from("clients")
            .select("legal_name, trade_name, address_line, city")
            .eq("id", ed.client_id)
            .maybeSingle();
          if (cli) {
            clientName = cli.trade_name || cli.legal_name || clientName;
            clientAddress = [cli.address_line, cli.city].filter(Boolean).join(", ");
          }
        }
      }
    } catch (errDocReq) {
      console.error("Erro ao carregar dados da solicitação de documentos:", errDocReq);
    }

    // Formatar datas auxiliares
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return "";
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
      }
      return dateStr;
    };

    const addDaysIso = (isoStr: string, days: number) => {
      const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return isoStr;
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().split("T")[0];
    };

    const formatSpanishDateLong = (isoStr?: string | null) => {
      const monthsES = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      if (isoStr) {
        const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          const day = parseInt(m[3], 10);
          const monthIdx = parseInt(m[2], 10) - 1;
          const year = m[1];
          return `${day} de ${monthsES[monthIdx] || ""} de ${year}`;
        }
      }
      return new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    };

    const todayIso = new Date().toISOString().split("T")[0];
    const reqDateIso = request_date || notice_start_date || todayIso;
    const noticeStartIso = notice_start_date || reqDateIso;
    const noticeEndIso = notice_end_date || addDaysIso(noticeStartIso, 15);
    const effectiveIso = effective_date || noticeStartIso;

    const reqDateFormatted = formatDate(reqDateIso);
    const noticeStartFormatted = formatDate(noticeStartIso);
    const noticeEndFormatted = formatDate(noticeEndIso);
    const effectiveFormatted = formatDate(effectiveIso);
    const dataCartaExtensoES = formatSpanishDateLong(reqDateIso);

    const documentDatePT = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    const documentDateES = contract_type === "rescisao"
      ? dataCartaExtensoES
      : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const upperContratante = contratante.toUpperCase();
    const isSepeFijoDiscontinuo = contract_type === "contrato_fijo_discontinuo";

    let generatedFileName = "";
    let baseFileName = "";
    let sepeContractMetadata: Record<string, any> = {};
    let companyRepEmail = "";

    // =========================================================================
    // FLUXO 1: CONTRATO OFICIAL SEPE PDF (HEXAGON - INDEFINIDO FIJO-DISCONTINUO)
    // =========================================================================
    if (isSepeFijoDiscontinuo) {
      console.log("Iniciando geração de Contrato Oficial SEPE PDF (Fijo-Discontinuo Código 300)...");

      // 1. Buscar configurações SEPE da empresa (Hexagon)
      const { data: empresaRow } = await supabase
        .schema("core_common")
        .from("empresas")
        .select("*")
        .eq("id", empresa_id)
        .maybeSingle();

      const settings = (empresaRow?.contract_settings && typeof empresaRow.contract_settings === "object")
        ? empresaRow.contract_settings
        : {};
      const sepe = (sepe_overrides && typeof sepe_overrides === "object") ? sepe_overrides : {};
      companyRepEmail = sepe.representante_email || settings.representante_email || "";

      // 2. Obter os bytes do template PDF desbloqueado
      const sepeStoragePath = "HEXAGON/CONTRATO FIJO DISCONTINUO - HEXAGON.pdf";
      let pdfTemplateBytes: Uint8Array | null = null;

      if (template_base64 && typeof template_base64 === "string") {
        const cleanB64 = template_base64.replace(/^data:application\/pdf;base64,/, "");
        const binStr = atob(cleanB64);
        pdfTemplateBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) pdfTemplateBytes[i] = binStr.charCodeAt(i);
        await supabase.storage.from("contract-templates").upload(sepeStoragePath, pdfTemplateBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      } else {
        const { data: sepeBlob, error: sepeDlErr } = await supabase.storage
          .from("contract-templates")
          .download(sepeStoragePath);

        if (!sepeDlErr && sepeBlob) {
          pdfTemplateBytes = new Uint8Array(await sepeBlob.arrayBuffer());
        } else {
          // Fallback: baixar do diretório público da aplicação e salvar no bucket contract-templates
          const originUrl = req.headers.get("origin") || "https://mcs-personal.vercel.app";
          const fallbackUrls = [
            `${originUrl}/templates/CONTRATO_FIJO_DISCONTINUO_HEXAGON.pdf`,
            "https://mcs-personal.vercel.app/templates/CONTRATO_FIJO_DISCONTINUO_HEXAGON.pdf",
          ];
          for (const url of fallbackUrls) {
            try {
              const resp = await fetch(url);
              if (resp.ok) {
                pdfTemplateBytes = new Uint8Array(await resp.arrayBuffer());
                await supabase.storage.from("contract-templates").upload(sepeStoragePath, pdfTemplateBytes, {
                  contentType: "application/pdf",
                  upsert: true,
                });
                break;
              }
            } catch (e) {
              console.warn(`Aviso ao buscar template de ${url}:`, e);
            }
          }
        }
      }

      if (!pdfTemplateBytes) {
        throw new Error("Template PDF do Contrato Fijo-Discontinuo (SEPE) não encontrado no storage nem no servidor.");
      }

      // 3. Preencher campos AcroForm com pdf-lib
      const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
      const form = pdfDoc.getForm();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const setTxt = (fieldName: string, val?: string | null, maxLen?: number) => {
        if (val === undefined || val === null) return;
        let strVal = String(val).trim();
        if (maxLen && strVal.length > maxLen) {
          strVal = strVal.slice(0, maxLen);
        }
        try {
          const tf = form.getTextField(fieldName);
          tf.setText(strVal);
        } catch (err) {
          console.warn(`Campo SEPE ${fieldName} não pôde ser preenchido:`, err);
        }
      };

      // Perfil da função/cargo
      const cargoUpper = (sepe.puesto || jobFunction || "").toUpperCase().trim();
      const funcionesMap = settings.funciones_por_cargo || {};
      const roleProfile = funcionesMap[cargoUpper] ||
        Object.entries(funcionesMap).find(([k]) => cargoUpper.includes(k) || k.includes(cargoUpper))?.[1] ||
        null;

      // Extrair CP e Município da obra se disponíveis
      const cpMatch = (siteAddress || clientAddress || "").match(/\b(\d{5})\b/);
      const resolvedSiteCp = sepe.centro_trabajo_cp || sitePostalCode || (cpMatch ? cpMatch[1] : "") || settings.centro_trabajo_cp || "";
      const resolvedSiteMunicipio = (sepe.centro_trabajo_municipio || siteCity || settings.centro_trabajo_municipio || "BARCELONA").toUpperCase();
      const resolvedSiteCalle = sepe.centro_trabajo_calle || [siteName, siteAddress || clientAddress].filter(Boolean).join(" - ") || "OBRA ASIGNADA";

      // Dados da Empresa
      const empCif = sepe.cif || settings.cif || empresaRow?.tax_id || "B72855497";
      const repNombre = sepe.representante_nombre || settings.representante_nombre || "";
      const repNif = sepe.representante_nif || settings.representante_nif || "";
      const repCargo = sepe.representante_cargo || settings.representante_cargo || "ADMINISTRADOR ÚNICO";
      const empRazonSocial = sepe.razon_social || settings.razon_social || empresaRow?.legal_name || "HEXAGON MONTAJES INDUSTRIALES, S.L.";
      const empDomicilio = sepe.domicilio_social || settings.domicilio_social || empresaRow?.address_line || "PLAZA DE ESPAÑA, 18, PLANTA 8, PUERTA 3";
      const empMunicipio = sepe.empresa_municipio || settings.empresa_municipio || "MADRID";
      const empCodMunicipio = sepe.empresa_cod_municipio || settings.empresa_cod_municipio || "28079";
      const empCp = sepe.empresa_cp || settings.empresa_cp || "28008";

      setTxt("AA0101-E09", empCif, 9);
      setTxt("AA0102", repNombre);
      setTxt("AA0103-E09", repNif, 9);
      setTxt("AA0104", repCargo);
      setTxt("AA0105", empRazonSocial);
      setTxt("AA0106", empDomicilio);
      setTxt("AA0107", empMunicipio);
      setTxt("AA0108-E05", empCodMunicipio, 5);
      setTxt("AA0109-E05", empCp, 5);
      setTxt("AA0110", sepe.empresa_pais || settings.empresa_pais || "ESPAÑA");
      setTxt("AA0111-E03", sepe.empresa_cod_pais || settings.empresa_cod_pais || "724", 3);

      // Dados da Conta de Cotização
      setTxt("AA0201-E04", sepe.regimen_ss || settings.regimen_ss || "0111", 4);
      setTxt("AA0202-E11", (sepe.ccc || settings.ccc || "").replace(/\s+/g, ""), 11);
      setTxt("AA0203", sepe.cnae_texto || settings.cnae_texto || "CONSTRUCCIÓN DE EDIFICIOS / MONTAJES INDUSTRIALES");
      setTxt("AA0204-E02", sepe.cnae_codigo || settings.cnae_codigo || "43", 2);

      // Dados do Centro de Trabalho
      setTxt("AA0301", resolvedSiteMunicipio);
      setTxt("AA0302-E05", sepe.centro_trabajo_cod_municipio || settings.centro_trabajo_cod_municipio || "", 5);
      setTxt("AA0303-E05", resolvedSiteCp, 5);
      setTxt("AA0304", "ESPAÑA");
      setTxt("AA0305-E03", "724", 3);

      // Dados da Pessoa Trabalhadora
      const workerDocId = (sepe.worker_identificacion || worker.nie || worker.dni || worker.pasaporte || worker.nif || "").trim();
      const workerNuss = (sepe.nuss || worker.nuss || worker.niss || "").replace(/\s+/g, "");
      const workerBirthFormatted = formatDate(sepe.fecha_nacimiento || worker.fecha_nacimiento);
      const workerNacionalidad = (sepe.nacionalidade || worker.nacionalidade || "ESPAÑOLA").toUpperCase();
      const workerNivelFormativo = (sepe.nivel_formativo || worker.nivel_formativo || "ESTUDIOS SECUNDARIOS / PRIMERA ETAPA").toUpperCase();
      const workerMunicipioDom = (sepe.municipio_domicilio || worker.municipio_domicilio || worker.location || "MADRID").toUpperCase();
      const workerCpDom = (sepe.codigo_postal || worker.codigo_postal || "").trim();

      setTxt("AA0401", (worker.nome || "").toUpperCase());
      setTxt("AA0402-E09", workerDocId, 9);
      setTxt("AA0403-FE-E10", workerBirthFormatted, 10);
      setTxt("AA0404-E12", workerNuss, 12);
      setTxt("AA0405", workerNacionalidad);
      setTxt("AA0406-E03", sepe.cod_nacionalidad || "", 3);
      setTxt("AA0407", workerNivelFormativo);
      setTxt("AA0408-E02", sepe.cod_nivel_formativo || "23", 2);
      setTxt("AA0409", workerMunicipioDom);
      setTxt("AA0410-E05", sepe.cod_municipio_domicilio || "", 5);
      setTxt("AA0411-E05", workerCpDom, 5);
      setTxt("AA0412", "ESPAÑA");
      setTxt("AA0413-E03", "724", 3);

      // Página 2: Cláusula Primeira e Segunda
      const resolvedPuesto = (sepe.puesto || roleProfile?.puesto || jobFunction || "OPERARIO").toUpperCase();
      const resolvedGrupo = (sepe.grupo_profesional || roleProfile?.grupo_profesional || "OFICIAL").toUpperCase();
      const resolvedFunciones = (sepe.funciones || roleProfile?.funciones || "PROPIAS DEL PUESTO").toUpperCase();
      const resolvedConvenio = sepe.convenio_colectivo || settings.convenio_colectivo || "CONVENIO COLECTIVO DEL SECTOR DE LA CONSTRUCCIÓN";
      const resolvedHoras = sepe.jornada_horas_semanales || settings.jornada_horas_semanales || "40";

      setTxt("C0101", resolvedPuesto);
      setTxt("C0102", resolvedGrupo);
      setTxt("C0103", resolvedFunciones);
      setTxt("C0104", resolvedSiteCalle);

      setTxt("C0201", sepe.actividad_fijo_discontinuo || settings.actividad_fijo_discontinuo || "TRABAJOS DE MONTAJE Y CONSTRUCCIÓN EN OBRAS");
      setTxt("C0202", sepe.actividad_ciclica || settings.actividad_ciclica || "PRESTACIÓN DE SERVICIOS EN CONTRATAS MERCANTILES DE CONSTRUCCIÓN");
      setTxt("C0203", sepe.duracion_estimada || settings.duracion_estimada || "SEGÚN DURACIÓN DE LA OBRA / SERVICIO");
      setTxt("C0204", resolvedHoras);
      setTxt("C0205", sepe.jornada_estimada_periodo || "SEMANALES");
      setTxt("C0206", sepe.distribucion_horaria || settings.distribucion_horaria || "DE LUNES A VIERNES SEGÚN CALENDARIO DE OBRA");
      setTxt("C0207", resolvedConvenio);

      try {
        form.getRadioGroup("C02BO1").select(sepe.tiempo_parcial ? "Elección1" : "Elección2");
      } catch (e) {
        console.warn("Aviso C02BO1:", e);
      }

      // Página 3: Cláusulas Terceira a Oitava
      try {
        form.getRadioGroup("C03BO1").select(sepe.tiempo_parcial ? "Elección2" : "Elección1");
      } catch (e) {
        console.warn("Aviso C03BO1:", e);
      }
      setTxt("C0301", resolvedHoras);
      setTxt("C0302", sepe.jornada_dia_inicio || settings.jornada_dia_inicio || "LUNES");
      setTxt("C0303", sepe.jornada_dia_fin || settings.jornada_dia_fin || "VIERNES");
      setTxt("C0305", sepe.distribucion_tiempo || "SEGÚN CONVENIO COLECTIVO Y CALENDARIO LABORAL");

      const resolvedFechaInicio = formatDate(sepe.fecha_inicio || startDate);
      const resolvedPeriodoPrueba = sepe.periodo_prueba || roleProfile?.periodo_prueba || settings.periodo_prueba_default || "SEGÚN CONVENIO";
      const resolvedRetribucion = sepe.retribucion_total || settings.salario_default_texto || "SEGÚN CONVENIO";
      const resolvedRetribucionPeriodo = sepe.retribucion_periodo || settings.salario_periodo || "MENSUALES";
      const resolvedConceptos = sepe.conceptos_salariales || settings.conceptos_salariales || "SALARIO BASE, PRORRATA PAGAS EXTRAS Y PLUSES DE CONVENIO";
      const resolvedVacaciones = sepe.vacaciones || settings.vacaciones || "30 DÍAS NATURALES";

      setTxt("C0401-FE", resolvedFechaInicio, 10);
      setTxt("C0402", resolvedPeriodoPrueba);
      setTxt("C0501", resolvedRetribucion);
      setTxt("C0502", resolvedRetribucionPeriodo);
      setTxt("C0503", resolvedConceptos);
      try {
        form.getRadioGroup("C06BO1").select("Elección2");
      } catch (e) {
        console.warn("Aviso C06BO1:", e);
      }
      setTxt("C0701", resolvedVacaciones);
      setTxt("C0801", resolvedConvenio);

      // Página 4: Cláusulas Nona a Décima Primeira
      try {
        form.getRadioGroup("C09BO1").select("Elección2");
      } catch (e) {
        console.warn("Aviso C09BO1:", e);
      }
      setTxt("C1101", sepe.sepe_municipio || settings.sepe_municipio || "MADRID");

      // Páginas 5 e 6: Modalidade Indefinido Ordinário -> Código 300 (Fijo-Discontinuo)
      try {
        form.getCheckBox("IP04CV1").check();
      } catch (e) {
        console.warn("Aviso IP04CV1:", e);
      }
      try {
        form.getRadioGroup("IP04BO1").select("Elección3");
      } catch (e) {
        console.warn("Aviso IP04BO1:", e);
      }

      // Página 20 (Página 7 final): Cláusulas Adicionais, Local e Data de Assinatura
      const monthsESUpper = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const nowDate = new Date();
      const diaFirma = String(nowDate.getUTCDate()).padStart(2, "0");
      const mesFirma = monthsESUpper[nowDate.getUTCMonth()] || "NOVIEMBRE";
      const anioFirma2Digits = String(nowDate.getUTCFullYear()).slice(-2);
      const lugarFirma = (sepe.lugar_firma || settings.lugar_firma || empMunicipio || "MADRID").toUpperCase();

      setTxt("ICA01", sepe.clausulas_adicionales || settings.clausulas_adicionales || "");
      setTxt("ICA02", lugarFirma);
      setTxt("ICA03", diaFirma);
      setTxt("ICA04", mesFirma);
      setTxt("ICA05", anioFirma2Digits);

      // 4. Atualizar aparências, achatar formulário no documento de 20 páginas e remover páginas 7 a 19 (índices 6 a 18)
      form.updateFieldAppearances(helvetica);
      form.flatten();

      for (let idx = 18; idx >= 6; idx--) {
        pdfDoc.removePage(idx);
      }

      const finalPdfBytes = await pdfDoc.save();
      const ts = Date.now();
      generatedFileName = `${worker.id}/${contract_type}_${ts}.pdf`;
      baseFileName = `${worker.id}/base_${contract_type}_${ts}.pdf`;

      console.log(`Fazendo upload do PDF SEPE gerado (${finalPdfBytes.byteLength} bytes) para: ${generatedFileName}`);
      const { error: uploadPdfErr } = await supabase.storage
        .from("worker-contracts")
        .upload(generatedFileName, finalPdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadPdfErr) {
        throw new Error(`Falha ao salvar PDF SEPE no storage: ${uploadPdfErr.message}`);
      }

      // Salvar cópia base limpa para carimbo bilateral de assinaturas
      await supabase.storage
        .from("worker-contracts")
        .upload(baseFileName, finalPdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      sepeContractMetadata = {
        is_sepe_pdf: true,
        sepe_codigo: "300",
        base_document_url: baseFileName,
        representante_nombre: repNombre,
        representante_nif: repNif,
        representante_cargo: repCargo,
        representante_email: companyRepEmail,
        puesto: resolvedPuesto,
        grupo_profesional: resolvedGrupo,
        funciones: resolvedFunciones,
        centro_trabajo: resolvedSiteCalle,
        fecha_inicio: resolvedFechaInicio,
        retribucion_total: resolvedRetribucion,
        convenio_colectivo: resolvedConvenio,
      };
    } else {
      // =========================================================================
      // FLUXO 2: CONTRATOS WORD (.DOCX) TRADICIONAIS
      // =========================================================================
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
        templateFileName = `${contratante}/COMUNICADO RESCISAO ${upperContratante}.docx`;
      } else {
        throw new Error(`Tipo de contrato desconhecido: ${contract_type}`);
      }

      console.log(`Baixando template do Storage: ${templateFileName}`);

      let { data: templateBlob, error: downloadErr } = await supabase.storage
        .from("contract-templates")
        .download(templateFileName);
      if ((downloadErr || !templateBlob) && upperContratante !== "STOCCO") {
        const fb = templateFileName.replace(contratante, "STOCCO").replace(upperContratante, "STOCCO");
        const fbRes = await supabase.storage.from("contract-templates").download(fb);
        if (fbRes.data && !fbRes.error) { templateBlob = fbRes.data; downloadErr = null; }
      }

      if (downloadErr || !templateBlob) {
        throw new Error(`Falha ao baixar template do storage (${templateFileName}): ${downloadErr?.message}`);
      }

      const templateBuffer = new Uint8Array(await templateBlob.arrayBuffer());

      function xmlEscape(str: string): string {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      }

      let processedBuffer = templateBuffer;
      const workerAddress = worker.morada_contrato || worker.address_line || worker.morada || worker.direccion || worker.location || "";
      const workerPassport = worker.pasaporte || worker.passaporte || worker.dni || worker.nie || worker.nif || "";
      const workerBirthDate = formatDate(worker.fecha_nacimiento);

      const docParts: string[] = [];
      if (workerPassport) docParts.push(`PASAPORTE: ${workerPassport}`);
      if (worker.nif && worker.nif.trim() !== "") docParts.push(`NIF: ${worker.nif.trim()}`);
      if (worker.niss && worker.niss.trim() !== "") docParts.push(`NISS: ${worker.niss.trim()}`);
      const linhaDocumentos = docParts.join("   ");

      try {
        console.log("Iniciando pre-processamento com JSZip...");
        const zip = new JSZip();
        await zip.loadAsync(templateBuffer);

        const placeholderDict: Record<string, string> = {
          "Nombre": worker.nome || "",
          "NOMBRE": worker.nome || "",
          "nome": worker.nome || "",
          "NOME": worker.nome || "",
          "fecha_nascimento": workerBirthDate,
          "fecha_nacimiento": workerBirthDate,
          "data_nascimento": workerBirthDate,
          "Passaporte": workerPassport,
          "PASSAPORTE": workerPassport,
          "pasaporte": workerPassport,
          "PASAPORTE": workerPassport,
          "passaporte": workerPassport,
          "NIF": worker.nif || "",
          "nif": worker.nif || "",
          "NISS": worker.niss || "",
          "niss": worker.niss || "",
          "Domicilio": workerAddress,
          "DOMICILIO": workerAddress,
          "domicilio": workerAddress,
          "morada": workerAddress,
          "Morada": workerAddress,
          "MORADA": workerAddress,
          "direccion": workerAddress,
          "DIRECCION": workerAddress,
          "direccion_actual": workerAddress,
          "address_line": workerAddress,
          "funcion": jobFunction,
          "FUNCION": jobFunction,
          "funcao": jobFunction,
          "FUNCAO": jobFunction,
          "Cliente": clientName,
          "CLIENTE": clientName,
          "cliente": clientName,
          "endereco": siteAddress || clientAddress || "Instalações do Cliente",
          "ENDERECO": siteAddress || clientAddress || "Instalações do Cliente",
          "fecha_inicio": formatDate(startDate),
          "data_inicio": formatDate(startDate),
          "Fecha_Assinatura_PT": documentDatePT,
          "Fecha_Assinatura_ESP": documentDateES,
          "data_carta_extenso_es": dataCartaExtensoES,
          "DATA_CARTA_EXTENSO_ES": dataCartaExtensoES,
          "linha_documentos": linhaDocumentos,
          "LINHA_DOCUMENTOS": linhaDocumentos,
          "data_solicitacao": reqDateFormatted,
          "DATA_SOLICITACAO": reqDateFormatted,
          "fecha_solicitud": reqDateFormatted,
          "data_inicio_aviso": noticeStartFormatted,
          "DATA_INICIO_AVISO": noticeStartFormatted,
          "fecha_inicio_preaviso": noticeStartFormatted,
          "data_fim_aviso": noticeEndFormatted,
          "DATA_FIM_AVISO": noticeEndFormatted,
          "fecha_fin_preaviso": noticeEndFormatted,
          "data_efeito": effectiveFormatted,
          "DATA_EFEITO": effectiveFormatted,
          "fecha_efecto": effectiveFormatted,
        };

        const bracketRegex = /\[(?:<[^>]+>|[^\]])*\]/g;

        for (const [relativePath, file] of Object.entries(zip.files)) {
          if (relativePath.endsWith(".xml") && relativePath.startsWith("word/")) {
            let content = await file.async("text");
            const originalContent = content;

            content = content.replace(/<w:sdt\b[^>]*>[\s\S]*?<w:sdtContent\b[^>]*>([\s\S]*?)<\/w:sdtContent>\s*<\/w:sdt>/gi, '$1');
            content = content.replace(/<w:rStyle\b[^>]*w:val="[^"]*Placeholder[^"]*"[^>]*\/>/gi, '');
            content = content.replace(/<w:rStyle\b[^>]*w:val="[^"]*TextodoEspaoReservado[^"]*"[^>]*\/>/gi, '');
            content = content.replace(/<w:showingPlcHdr\/>/gi, '');

            if (relativePath === "word/document.xml") {
              content = content.replace(/<w:ind\s+w:right="[1-9]\d{3,}"\s*\/>/gi, '');
              content = content.replace(/<w:ind\s+w:left="-\d+"\s+w:right="-\d+"\s*\/>/gi, '');
              content = content.replace(/<w:ind\s+w:right="-\d+"\s*\/>/gi, '');
              content = content.replace(/<w:tblpPr[^>]*\/>/gi, '');
              content = content.replace(/<w:lastRenderedPageBreak\/>\s*(<w:br\s+w:type="page"\s*\/>)/gi, '$1');
              const paras = content.match(/<w:p\b[\s\S]*?<\/w:p>/g);
              if (paras && paras.length > 0) {
                let prevHadPageBr = false;
                for (let i = 0; i < paras.length; i++) {
                  const p = paras[i];
                  const hasPageBr = p.includes('w:type="page"');
                  const hasLastRendered = p.includes("<w:lastRenderedPageBreak/>");
                  if (hasLastRendered) {
                    const cleanedP = p.replace(/<w:lastRenderedPageBreak\/>/g, "");
                    if (!hasPageBr && !prevHadPageBr) {
                      content = content.replace(p, `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>${cleanedP}`);
                    } else {
                      content = content.replace(p, cleanedP);
                    }
                  }
                  prevHadPageBr = hasPageBr || (hasLastRendered && !prevHadPageBr);
                }
              }
              content = content.replace(/<w:lastRenderedPageBreak\/>/gi, '');
            }
            if (/^word\/header\d*\.xml$/i.test(relativePath) && content.includes("<wp:wrapNone/>")) {
              content = content.replace(/<wp:wrapNone\/>/g, "<wp:wrapTopAndBottom/>");
              content = content.replace(/<wp:posOffset>-\d+<\/wp:posOffset>/g, "<wp:posOffset>0</wp:posOffset>");
            }

            content = content.replace(/\{\s*(?:<[^>]+>)*\s*\{\s*(?:<[^>]+>)*\s*([\s\S]*?)\s*(?:<[^>]+>)*\s*\}\s*(?:<[^>]+>)*\s*\}/gi, (m, k) => '{{' + k.replace(/<[^>]+>/g, '').trim() + '}}');
            content = content.replace(/\{\{\s*(?:IMAGE\s+)?(?:firma_trabalhador|assinatura_trabalhador|assinatura|firma)\s*\}\}/gi, '[ASSINATURA]');

            content = content.replace(bracketRegex, (match) => {
              const plainText = match.replace(/<[^>]+>/g, "");
              const cleanKey = plainText.replace(/[\[\]]/g, "").trim();

              if (placeholderDict.hasOwnProperty(cleanKey)) {
                const safeValue = xmlEscape(placeholderDict[cleanKey]);
                return safeValue;
              }
              return match;
            });

            if (content !== originalContent) {
              zip.file(relativePath, content);
            }
          }
        }

        processedBuffer = await zip.generateAsync({ type: "uint8array" });
      } catch (zipErr) {
        console.error("Erro no pre-processamento JSZip:", zipErr);
      }

      const mergeData = {
        nome: worker.nome || "",
        nome_completo: worker.nome || "",
        Nombre: worker.nome || "",
        NOMBRE: worker.nome || "",
        nif: worker.nif || "",
        niss: worker.niss || "",
        nie: worker.nie || "",
        dni: worker.dni || "",
        pasaporte: workerPassport,
        passaporte: workerPassport,
        Passaporte: workerPassport,
        PASSAPORTE: workerPassport,
        nacionalidade: worker.nacionalidade || "",
        morada: workerAddress,
        Morada: workerAddress,
        MORADA: workerAddress,
        domicilio: workerAddress,
        Domicilio: workerAddress,
        DOMICILIO: workerAddress,
        direccion: workerAddress,
        direccion_actual: workerAddress,
        address_line: workerAddress,
        data_nascimento: workerBirthDate,
        fecha_nascimento: workerBirthDate,
        fecha_nacimiento: workerBirthDate,
        contato: worker.movil || "",
        cliente: clientName,
        cliente_nome: clientName,
        Cliente: clientName,
        obra_local: siteName || siteAddress || "Instalações do Cliente",
        endereco: siteAddress || clientAddress || "Instalações do Cliente",
        data_inicio: formatDate(startDate),
        fecha_inicio: formatDate(startDate),
        funcao: jobFunction,
        funcion: jobFunction,
        Funcao: jobFunction,
        salario_base: assignment?.salario_base || "A combinar",
        fecha_assinatura_pt: documentDatePT,
        fecha_assinatura_es: documentDateES,
        Fecha_Assinatura_PT: documentDatePT,
        Fecha_Assinatura_ESP: documentDateES,
        data_carta_extenso_es: dataCartaExtensoES,
        DATA_CARTA_EXTENSO_ES: dataCartaExtensoES,
        linha_documentos: linhaDocumentos,
        LINHA_DOCUMENTOS: linhaDocumentos,
        data_solicitacao: reqDateFormatted,
        DATA_SOLICITACAO: reqDateFormatted,
        fecha_solicitud: reqDateFormatted,
        data_inicio_aviso: noticeStartFormatted,
        DATA_INICIO_AVISO: noticeStartFormatted,
        fecha_inicio_preaviso: noticeStartFormatted,
        data_fim_aviso: noticeEndFormatted,
        DATA_FIM_AVISO: noticeEndFormatted,
        fecha_fin_preaviso: noticeEndFormatted,
        data_efeito: effectiveFormatted,
        DATA_EFEITO: effectiveFormatted,
        fecha_efecto: effectiveFormatted,
      };

      const generatedDoc = await createReport({
        template: processedBuffer,
        data: mergeData,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
          console.error(`Erro ao processar tag contrato "${command_code}":`, err);
          return "";
        }
      });

      generatedFileName = `${worker.id}/${contract_type}_${Date.now()}.docx`;
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
    }

    // 7. Gerar OTP do Trabalhador e OTP do Representante da Empresa
    const signatureToken = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const companyOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // Válido por 72 horas

    const isAlta = contract_type === "contrato_alta";
    const isRescisao = contract_type === "rescisao";
    const status = isAlta ? "no_signature" : "pending_signature";

    const metadataObj: Record<string, any> = isRescisao
      ? {
          request_date: reqDateIso,
          notice_start_date: noticeStartIso,
          notice_end_date: noticeEndIso,
          effective_date: effectiveIso,
          notice_days: 15,
        }
      : {
          ...sepeContractMetadata,
          worker_signed: false,
          company_signed: false,
          company_otp_code: companyOtpCode,
          company_otp_expires_at: otpExpiresAt.toISOString(),
        };

    // Inserir registro na tabela de contratos
    const contractPayload: Record<string, any> = {
      empresa_id: empresa_id || worker.empresa_id,
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
      terminated_at: isRescisao ? `${noticeEndIso}T23:59:59.000Z` : null,
      metadata: metadataObj,
      created_by: null,
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

    // 8. Enviar E-mail para o trabalhador (e para o representante se configurado)
    const signingLink = isAlta ? "" : `${req.headers.get("origin") || "https://mcs-personal.vercel.app"}/assinar/${signatureToken}`;
    let emailSent = false;

    if (!isAlta && resendApiKey && worker.email) {
      try {
        console.log(`Enviando e-mail de assinatura para: ${worker.email}`);
        const emailSubject = isRescisao
          ? `Firma de Carta de Rescisión - ${contratante}`
          : isSepeFijoDiscontinuo
          ? `Firma de Contrato de Trabajo (SEPE) - ${contratante}`
          : `Assinatura de Contrato - ${contratante}`;
        const emailHtml = isRescisao
          ? `
              <h2>Hola, ${worker.nome}!</h2>
              <p>Su <strong>Solicitud de Rescisión de Contrato de Trabajo</strong> con la empresa <strong>${contratante}</strong> (preaviso del ${noticeStartFormatted} al ${noticeEndFormatted}) está lista para su firma electrónica.</p>
              <p>Por favor, acceda al siguiente enlace para visualizar el documento y realizar la firma:</p>
              <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar y Firmar Carta de Rescisión</a></p>
              <br/>
              <p>Su código de validación OTP es: <strong>${otpCode}</strong></p>
              <p>Este enlace y código expiran en 72 horas.</p>
            `
          : isSepeFijoDiscontinuo
          ? `
              <h2>Hola, ${worker.nome}!</h2>
              <p>Su <strong>Contrato de Trabajo Indefinido Fijo-Discontinuo</strong> con la empresa <strong>${contratante}</strong> está listo para su firma electrónica.</p>
              <p>Por favor, acceda al siguiente enlace para revisar el contrato oficial y firmar electrónicamente:</p>
              <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar y Firmar Contrato</a></p>
              <br/>
              <p>Su código de validación OTP es: <strong>${otpCode}</strong></p>
              <p>Este enlace y código expiran en 72 horas.</p>
            `
          : `
              <h2>Olá, ${worker.nome}!</h2>
              <p>Seu contrato de trabalho com a empresa <strong>${contratante}</strong> está pronto para assinatura eletrônica.</p>
              <p>Por favor, acesse o link abaixo para visualizar o contrato e realizar a assinatura:</p>
              <p><a href="${signingLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Visualizar e Assinar Contrato</a></p>
              <br/>
              <p>Seu código de validação OTP é: <strong>${otpCode}</strong></p>
              <p>Este link e código expiram em 72 horas.</p>
              <p>Se tiver alguma dúvida, entre em contato com o setor de RH.</p>
            `;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Mastercorp Contratos <contratos@mastercorp.pt>",
            to: worker.email,
            subject: emailSubject,
            html: emailHtml,
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

    // Se houver e-mail do representante da empresa configurado, envia também o OTP corporativo
    if (!isAlta && !isRescisao && resendApiKey && companyRepEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Mastercorp Contratos <contratos@mastercorp.pt>",
            to: companyRepEmail,
            subject: `[OTP Empresa] Firma de Contrato - ${worker.nome} (${contratante})`,
            html: `
              <h2>Firma del Representante de la Empresa (${contratante})</h2>
              <p>Se ha emitido un nuevo contrato para <strong>${worker.nome}</strong>.</p>
              <p>Código OTP para la firma del Representante Legal en el panel de gestión: <strong style="font-size:18px;">${companyOtpCode}</strong></p>
            `,
          }),
        });
      } catch (e) {
        console.warn("Aviso ao enviar OTP corporativo por e-mail:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contract_id: contract.id,
        document_url: generatedFileName,
        signature_token: isAlta ? null : signatureToken,
        otp_code: isAlta ? null : otpCode,
        company_otp_code: isAlta ? null : companyOtpCode,
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
