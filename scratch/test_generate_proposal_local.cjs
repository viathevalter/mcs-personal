const { createClient } = require('@supabase/supabase-js');
const { createReport } = require('docx-templates');
const fs = require('fs');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const estimacion_id = '14797205-bee6-4e1c-9379-f0064a8dfd18';

async function run() {
    console.log("Locally testing generate-proposal logic for estimacion_id:", estimacion_id);
    
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

    console.log("Estimación carregada:", est.codigo);

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

    // 3. Buscar dados do Cliente ou Lead
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
        targetName = lead.name;
        targetEmail = lead.email;
        targetPhone = lead.phone || "";
        targetCompany = lead.company_name || "";
        clientAddress = lead.notes || "";
      }
    }

    // 3.5. Buscar dados do Obra/Local
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
      throw new Error(`Erro ao buscar itens: ${itemsErr.message}`);
    }

    const formattedItems = (items || []).map((item) => {
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

    // 5. Baixar templates do storage
    console.log("Downloading templates from storage...");
    const { data: blob } = await supabase.storage.from("proposal-templates").download("default.docx");
    const { data: contractBlob } = await supabase.storage.from("proposal-templates").download("default_contrato.docx");

    const templateBuffer = new Uint8Array(await blob.arrayBuffer());
    const contractTemplateBuffer = new Uint8Array(await contractBlob.arrayBuffer());

    // 6. Mesclar dados
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
      proposta_notas: est.general_notes || "",
      
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
    };

    console.log("Generating proposal docx...");
    const proposalOutput = await createReport({
        template: templateBuffer,
        data: mergeData,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true
    });
    fs.writeFileSync('scratch/test_output_proposal.docx', proposalOutput);
    console.log("Saved scratch/test_output_proposal.docx");

    console.log("Generating contract docx...");
    const contractOutput = await createReport({
        template: contractTemplateBuffer,
        data: mergeData,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true
    });
    fs.writeFileSync('scratch/test_output_contract.docx', contractOutput);
    console.log("Saved scratch/test_output_contract.docx");
    console.log("Test completed successfully!");
}

run().catch(err => console.error(err));
