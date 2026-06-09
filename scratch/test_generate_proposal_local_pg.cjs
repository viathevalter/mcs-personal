const { Client } = require('pg');
const { createReport } = require('docx-templates');
const fs = require('fs');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const estimacion_id = '14797205-bee6-4e1c-9379-f0064a8dfd18';

async function run() {
    console.log("Locally testing generate-proposal logic using PG connection for estimacion_id:", estimacion_id);
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();

    try {
        // 1. Fetch estimacion
        const estRes = await client.query('SELECT * FROM core_comercial.estimaciones WHERE id = $1', [estimacion_id]);
        const est = estRes.rows[0];
        if (!est) throw new Error("Estimacion not found.");
        console.log("Estimación carregada:", est.codigo);

        // 2. Fetch empresa
        const empRes = await client.query('SELECT * FROM core_common.empresas WHERE id = $1', [est.empresa_id]);
        const empresa = empRes.rows[0];
        if (!empresa) throw new Error("Empresa not found.");

        const senderEmail = empresa.proposal_sender_email || "vendas@stoco.es";

        // 3. Fetch client details
        let targetName = "";
        let targetEmail = "";
        let targetPhone = "";
        let targetCompany = "";
        let clientAddress = "";
        let clientTaxId = "";

        if (est.client_id) {
            const clRes = await client.query('SELECT * FROM core_common.clients WHERE id = $1', [est.client_id]);
            const c = clRes.rows[0];
            if (c) {
                targetName = est.contact_name || c.trade_name || c.legal_name || "";
                targetEmail = est.contact_email || c.email || "";
                targetPhone = c.phone || "";
                targetCompany = c.legal_name || c.trade_name || "";
                clientTaxId = c.tax_id || c.vat_id || "";
                clientAddress = `${c.address_line || ""}, ${c.city || ""}, ${c.postal_code || ""} (${c.province || ""})`;
            }
        }

        // 3.5. Fetch site details
        let siteAddress = "";
        if (est.client_site_id) {
            const siteRes = await client.query('SELECT * FROM core_common.client_sites WHERE id = $1', [est.client_site_id]);
            const site = siteRes.rows[0];
            if (site) {
                siteAddress = `${site.address_line || ""}, ${site.city || ""}, ${site.postal_code || ""} (${site.province || ""})`;
            }
        }

        // 4. Fetch version
        const versionId = est.current_version_id;
        if (!versionId) throw new Error("current_version_id is null.");

        const verRes = await client.query('SELECT * FROM core_comercial.estimacion_versions WHERE id = $1', [versionId]);
        const version = verRes.rows[0];
        if (!version) throw new Error("Version not found.");

        // 4.5. Fetch items
        const itemsRes = await client.query(`
            SELECT i.*, j.name as job_function_name
            FROM core_comercial.estimacion_items i
            LEFT JOIN core_comercial.job_functions j ON j.id = i.job_function_id
            WHERE i.estimacion_version_id = $1
        `, [versionId]);
        const items = itemsRes.rows;

        const formattedItems = items.map((item) => {
            const totalHours = Number(item.planned_total_hours || item.total_hours || 0);
            const sellRate = Number(item.sell_rate_hour || 0);
            const quantity = Number(item.quantity || 0);
            return {
                funcao: item.job_function_name_snapshot || item.job_function_name || "Perfil",
                quantidade: quantity,
                horas_dia: item.planned_hours_per_day,
                dias_semana: item.planned_days_per_week,
                total_horas: totalHours,
                tarifa_venda: sellRate,
                valor_total: (quantity * totalHours * sellRate).toFixed(2),
            };
        });

        // 5. Load templates from local files
        console.log("Loading templates from local files...");
        const templateBuffer = fs.readFileSync('scratch/default.docx');
        const contractTemplateBuffer = fs.readFileSync('scratch/default_contrato.docx');

        // 6. Merge data
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
            
            total_custo: Number(version.total_cost || 0).toFixed(2),
            total_receita: Number(version.total_revenue || 0).toFixed(2),
            margem_percentual: Number(version.margin_percent || 0).toFixed(2),
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

    } catch (e) {
        console.error("Error during execution:", e);
    } finally {
        await client.end();
    }
}

run();
