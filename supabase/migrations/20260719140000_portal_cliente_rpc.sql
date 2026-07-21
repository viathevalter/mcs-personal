-- Drop old function in core_finance if it exists
DROP FUNCTION IF EXISTS core_finance.get_fatura_portal_data(UUID);

-- 1. Cria a função que retorna dados do portal para a fatura com segurança (definida como SECURITY DEFINER para ignorar RLS) no schema public
CREATE OR REPLACE FUNCTION public.get_fatura_portal_data(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fatura RECORD;
    v_client RECORD;
    v_empresa RECORD;
    v_empresa_id UUID;
    v_horas JSONB;
    v_workers JSONB;
    v_job_functions JSONB;
    v_result JSONB;
BEGIN
    -- A. Buscar fatura
    SELECT * INTO v_fatura FROM core_finance.faturas WHERE magic_link_token = p_token LIMIT 1;
    IF v_fatura.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- B. Buscar cliente
    SELECT id, trade_name, codigo, payment_terms, address_line, postal_code, city, province, tax_id 
    INTO v_client 
    FROM core_common.clients 
    WHERE id = v_fatura.client_id;

    -- C. Buscar empresa associada (prioridade: v_fatura.empresa_id, depois client_company_settings)
    v_empresa_id := v_fatura.empresa_id;
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id 
        FROM core_common.client_company_settings 
        WHERE client_id = v_fatura.client_id AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_empresa_id IS NOT NULL THEN
        SELECT * INTO v_empresa FROM core_common.empresas WHERE id = v_empresa_id;
    END IF;

    -- D. Buscar horas_trabalhadas
    SELECT json_agg(h) INTO v_horas 
    FROM (
        SELECT id, worker_id, client_id, fatura_id, data_trabalho, hora_inicio, hora_fim, horas_totais, status, extraction_confidence, created_at, funcao_id, obra_id, tarifa_faturada 
        FROM core_finance.horas_trabalhadas 
        WHERE fatura_id = v_fatura.id 
        ORDER BY data_trabalho DESC
    ) h;

    -- E. Buscar workers
    SELECT json_agg(w) INTO v_workers 
    FROM (
        SELECT id, nome, cod_colab, funcion FROM core_personal.workers 
        WHERE id IN (
            SELECT DISTINCT worker_id FROM core_finance.horas_trabalhadas WHERE fatura_id = v_fatura.id
        )
    ) w;

    -- F. Buscar job functions
    SELECT json_agg(jf) INTO v_job_functions
    FROM (
        SELECT id, name FROM core_comercial.job_functions
        WHERE id IN (
            SELECT DISTINCT funcao_id FROM core_finance.horas_trabalhadas WHERE fatura_id = v_fatura.id AND funcao_id IS NOT NULL
        )
    ) jf;

    -- G. Construir JSON de resposta com todas as informações requeridas
    v_result := jsonb_build_object(
        'fatura', jsonb_build_object(
            'id', v_fatura.id,
            'client_id', v_fatura.client_id,
            'status', v_fatura.status,
            'data_emissao', v_fatura.data_emissao,
            'magic_link_token', v_fatura.magic_link_token,
            'ajustes_json', v_fatura.ajustes_json,
            'fatura_numero', v_fatura.fatura_numero,
            'atcud', v_fatura.atcud,
            'client', jsonb_build_object(
                'nombre_comercial', v_client.trade_name,
                'codigo', v_client.codigo,
                'paymentTermName', COALESCE(v_client.payment_terms, 'N/A'),
                'paymentTermDays', 0,
                'address_line', v_client.address_line,
                'postal_code', v_client.postal_code,
                'city', v_client.city,
                'province', v_client.province,
                'tax_id', v_client.tax_id
            ),
            'empresa', CASE WHEN v_empresa.id IS NOT NULL THEN jsonb_build_object(
                'nome', v_empresa.nome,
                'taxId', v_empresa.tax_id,
                'addressLine', v_empresa.address_line,
                'postalCode', v_empresa.postal_code,
                'city', v_empresa.city,
                'province', v_empresa.province,
                'email', v_empresa.email,
                'phone', v_empresa.phone,
                'iban', v_empresa.iban,
                'bankDetails', v_empresa.bank_details,
                'invoiceSeries', v_empresa.invoice_series,
                'nextInvoiceNumber', v_empresa.next_invoice_number,
                'atcudPrefix', v_empresa.atcud_prefix,
                'capitalSocial', v_empresa.capital_social,
                'conservatoria', v_empresa.conservatoria,
                'matricula', v_empresa.matricula,
                'certifiedSoftwareText', v_empresa.certified_software_text,
                'invoiceLogoUrl', v_empresa.invoice_logo_url
            ) ELSE NULL END
        ),
        'horas', COALESCE(v_horas, '[]'::jsonb),
        'workers', COALESCE(v_workers, '[]'::jsonb),
        'job_functions', COALESCE(v_job_functions, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;

-- Concede privilégio de execução ao perfil público anon (acesso via magic link) no schema public
GRANT EXECUTE ON FUNCTION public.get_fatura_portal_data(UUID) TO anon, authenticated, service_role;
