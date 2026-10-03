-- Migration: 20261003220000_worker_portal_evolution_and_night_tariffs.sql
-- Description: Evolution of worker portal, night tariffs support, online timesheet drafts and supervisor digital signature via OTP

-- 1. Client Tariffs & Worker Exceptions: Add night tariff columns
ALTER TABLE core_common.client_tariffs 
ADD COLUMN IF NOT EXISTS valor_tarifa_noturna NUMERIC(10, 2);

ALTER TABLE core_common.client_worker_tariffs 
ADD COLUMN IF NOT EXISTS valor_tarifa_noturna NUMERIC(10, 2);

-- 2. Horas Trabalhadas: Support normal and night hours separation
ALTER TABLE core_finance.horas_trabalhadas 
ADD COLUMN IF NOT EXISTS horas_normais NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_noturnas NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tarifa_faturada_noturna NUMERIC(10, 2);

-- 3. Worker Hours: Draft tracking, daily entries, and supervisor signature
ALTER TABLE core_personal.worker_hours 
ADD COLUMN IF NOT EXISTS apontamentos_diarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_horas_normais NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_horas_noturnas NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS signature_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS encarregado_nome TEXT,
ADD COLUMN IF NOT EXISTS encarregado_email TEXT,
ADD COLUMN IF NOT EXISTS encarregado_telefone TEXT,
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_ip TEXT,
ADD COLUMN IF NOT EXISTS signature_image_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- Index for fast token lookups on supervisor signature
CREATE INDEX IF NOT EXISTS idx_worker_hours_signature_token ON core_personal.worker_hours(signature_token);

-- 4. Holerites: Portal publication flag
ALTER TABLE core_personal.holerites 
ADD COLUMN IF NOT EXISTS publicado_portal BOOLEAN DEFAULT TRUE;

-- 5. RPC: Get Worker Holerites for Portal (Secure by worker credentials)
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
          UPPER(TRIM(pasaporte)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(nie)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(dnie)) = UPPER(TRIM(p_pasaporte))
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

-- 6. RPC: Save Worker Timesheet Draft (Daily continuous recording)
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
          UPPER(TRIM(pasaporte)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(nie)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(dnie)) = UPPER(TRIM(p_pasaporte))
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

-- 7. RPC: Request Timesheet Signature (Generates OTP and signature link)
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
          UPPER(TRIM(pasaporte)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(nie)) = UPPER(TRIM(p_pasaporte))
          OR UPPER(TRIM(dnie)) = UPPER(TRIM(p_pasaporte))
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

-- 8. RPC: Get Timesheet For Signature (Called by the supervisor via token, no login needed)
CREATE OR REPLACE FUNCTION public.get_signature_timesheet(
    p_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT 
        wh.id,
        wh.worker_id,
        w.nome AS worker_nome,
        w.pasaporte AS worker_pasaporte,
        w.funcion AS worker_funcion,
        wh.cliente_nombre,
        wh.empresa_id,
        emp.nome AS empresa_nome,
        emp.nif AS empresa_nif,
        wh.period_year,
        wh.period_month,
        wh.apontamentos_diarios,
        wh.total_horas_normais,
        wh.total_horas_noturnas,
        wh.horas_totais,
        wh.status,
        wh.encarregado_nome,
        wh.encarregado_email,
        wh.encarregado_telefone,
        wh.signed_at,
        wh.signed_ip,
        wh.signature_image_url
    INTO v_rec
    FROM core_personal.worker_hours wh
    JOIN core_personal.workers w ON w.id = wh.worker_id
    LEFT JOIN public.empresas emp ON emp.id = wh.empresa_id
    WHERE wh.signature_token = p_token
    LIMIT 1;

    IF v_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folha de horas não encontrada ou link expirado');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'timesheet', row_to_json(v_rec)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_signature_timesheet(UUID) TO anon, authenticated, service_role;

-- 9. RPC: Sign Timesheet By Supervisor
CREATE OR REPLACE FUNCTION public.sign_timesheet_encarregado(
    p_token UUID,
    p_otp_code TEXT,
    p_signature_image TEXT,
    p_encarregado_nome TEXT,
    p_ip TEXT,
    p_user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT id, otp_code, otp_expires_at, status
    INTO v_rec
    FROM core_personal.worker_hours
    WHERE signature_token = p_token
    LIMIT 1;

    IF v_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folha não encontrada');
    END IF;

    IF v_rec.status IN ('assinado_encarregado', 'validado') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta folha de horas já foi assinada anteriormente.');
    END IF;

    -- Validate OTP
    IF v_rec.otp_code IS NOT NULL AND TRIM(v_rec.otp_code) <> TRIM(p_otp_code) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código de verificação OTP incorreto.');
    END IF;

    IF v_rec.otp_expires_at IS NOT NULL AND v_rec.otp_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'O código OTP expirou. Peça ao trabalhador para gerar um novo envio.');
    END IF;

    -- Mark as signed
    UPDATE core_personal.worker_hours
    SET status = 'assinado_encarregado',
        signed_at = NOW(),
        signed_ip = p_ip,
        signature_image_url = p_signature_image,
        encarregado_nome = COALESCE(NULLIF(TRIM(p_encarregado_nome), ''), encarregado_nome),
        otp_code = NULL,
        otp_expires_at = NULL,
        updated_at = NOW()
    WHERE id = v_rec.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Folha de horas aprovada e assinada com sucesso!',
        'signed_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_timesheet_encarregado(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
