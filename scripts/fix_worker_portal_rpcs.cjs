const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const sql = `
-- 1. Fix get_worker_holerites_portal (remove dnie)
CREATE OR REPLACE FUNCTION public.get_worker_holerites_portal(
    p_worker_id UUID,
    p_pasaporte TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_valid BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Verify worker identity
    SELECT TRUE INTO v_worker_valid
    FROM core_personal.workers
    WHERE id = p_worker_id
      AND (
          UPPER(TRIM(COALESCE(pasaporte, ''))) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(COALESCE(nie, ''))) = UPPER(TRIM(p_pasaporte))
      )
    LIMIT 1;

    IF NOT COALESCE(v_worker_valid, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credenciais inválidas');
    END IF;

    -- Fetch paid and published holerites with their eventos and enterprise info
    SELECT jsonb_build_object(
        'success', true,
        'holerites', COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', h.id,
                'empresa_id', h.empresa_id,
                'empresa_nome', emp.nome,
                'empresa_nif', emp.nif,
                'worker_id', h.worker_id,
                'mes_referencia', h.mes_referencia,
                'horas_trabalhadas', h.horas_trabalhadas,
                'total_proventos', h.total_proventos,
                'total_descontos', h.total_descontos,
                'valor_liquido', h.valor_liquido,
                'status', h.status,
                'data_pagamento', h.data_pagamento,
                'metodo_pagamento', h.metodo_pagamento,
                'eventos', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', e.id,
                            'tipo_evento', e.tipo_evento,
                            'categoria', e.categoria,
                            'descricao', e.descricao,
                            'valor', e.valor,
                            'referencia_dias_horas', e.referencia_dias_horas
                        ) ORDER BY e.tipo_evento ASC, e.valor DESC
                    ), '[]'::jsonb)
                    FROM core_personal.holerite_eventos e
                    WHERE e.holerite_id = h.id
                )
            ) ORDER BY h.mes_referencia DESC
        ), '[]'::jsonb)
    ) INTO v_result
    FROM core_personal.holerites h
    LEFT JOIN public.empresas emp ON emp.id = h.empresa_id
    WHERE h.worker_id = p_worker_id
      AND h.status = 'pago'
      AND COALESCE(h.publicado_portal, TRUE) = TRUE;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_worker_holerites_portal(UUID, TEXT) TO anon, authenticated, service_role;

-- 2. Fix save_worker_timesheet_draft (remove dnie)
CREATE OR REPLACE FUNCTION public.save_worker_timesheet_draft(
    p_worker_id UUID,
    p_pasaporte TEXT,
    p_worker_hour_id UUID,
    p_apontamentos JSONB,
    p_total_normais NUMERIC,
    p_total_noturnas NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_valid BOOLEAN := FALSE;
    v_current_status TEXT;
BEGIN
    -- Verify credentials
    SELECT TRUE INTO v_worker_valid
    FROM core_personal.workers
    WHERE id = p_worker_id
      AND (
          UPPER(TRIM(COALESCE(pasaporte, ''))) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(COALESCE(nie, ''))) = UPPER(TRIM(p_pasaporte))
      )
    LIMIT 1;

    IF NOT COALESCE(v_worker_valid, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credenciais inválidas');
    END IF;

    -- Fetch current status
    SELECT status INTO v_current_status
    FROM core_personal.worker_hours
    WHERE id = p_worker_hour_id AND worker_id = p_worker_id;

    IF v_current_status IN ('assinado_encarregado', 'validado') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folha já assinada ou validada. Não pode ser modificada.');
    END IF;

    -- Update draft
    UPDATE core_personal.worker_hours
    SET apontamentos_diarios = p_apontamentos,
        total_horas_normais = COALESCE(p_total_normais, 0),
        total_horas_noturnas = COALESCE(p_total_noturnas, 0),
        horas_totais = COALESCE(p_total_normais, 0) + COALESCE(p_total_noturnas, 0),
        status = CASE 
            WHEN status = 'pendente' THEN 'em_andamento'
            ELSE status 
        END,
        updated_at = NOW()
    WHERE id = p_worker_hour_id AND worker_id = p_worker_id;

    RETURN jsonb_build_object(
        'success', true, 
        'horas_totais', COALESCE(p_total_normais, 0) + COALESCE(p_total_noturnas, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_worker_timesheet_draft(UUID, TEXT, UUID, JSONB, NUMERIC, NUMERIC) TO anon, authenticated, service_role;

-- 3. Fix request_timesheet_signature (remove dnie)
CREATE OR REPLACE FUNCTION public.request_timesheet_signature(
    p_worker_id UUID,
    p_pasaporte TEXT,
    p_worker_hour_id UUID,
    p_encarregado_nome TEXT,
    p_encarregado_email TEXT,
    p_encarregado_telefone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_valid BOOLEAN := FALSE;
    v_token UUID;
    v_otp VARCHAR(6);
    v_expires TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
    SELECT TRUE INTO v_worker_valid
    FROM core_personal.workers
    WHERE id = p_worker_id
      AND (
          UPPER(TRIM(COALESCE(pasaporte, ''))) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(COALESCE(nie, ''))) = UPPER(TRIM(p_pasaporte))
      )
    LIMIT 1;

    IF NOT COALESCE(v_worker_valid, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credenciais inválidas');
    END IF;

    -- Generate 6-digit OTP
    v_otp := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    -- Ensure token exists
    SELECT COALESCE(signature_token, gen_random_uuid()) INTO v_token
    FROM core_personal.worker_hours
    WHERE id = p_worker_hour_id AND worker_id = p_worker_id;

    UPDATE core_personal.worker_hours
    SET signature_token = v_token,
        encarregado_nome = p_encarregado_nome,
        encarregado_email = p_encarregado_email,
        encarregado_telefone = p_encarregado_telefone,
        otp_code = v_otp,
        otp_expires_at = v_expires,
        status = 'aguardando_assinatura',
        updated_at = NOW()
    WHERE id = p_worker_hour_id AND worker_id = p_worker_id;

    RETURN jsonb_build_object(
        'success', true,
        'signature_token', v_token,
        'otp_code', v_otp,
        'encarregado_nome', p_encarregado_nome
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_timesheet_signature(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
`;

async function runOnDb(name, connStr) {
    const client = new Client({ connectionString: connStr });
    try {
        await client.connect();
        console.log(`Connected to ${name} database.`);
        await client.query(sql);
        console.log(`Successfully fixed RPCs on ${name} DB!`);
    } catch (err) {
        console.error(`Error applying fix to ${name} DB:`, err);
    } finally {
        await client.end();
    }
}

async function main() {
    console.log("Applying fix to DEV database...");
    await runOnDb('DEV', devConnectionString);

    console.log("Applying fix to PROD database...");
    await runOnDb('PROD', prodConnectionString);
}

main();
