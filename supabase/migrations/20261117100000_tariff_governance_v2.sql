-- Migration: Tariff Governance V2 (Effective Month Schedules, Authorizers, Email Templates, Task Completion)
-- Date: 2026-11-17

-- 1. Extend tariff_authorization_requests
ALTER TABLE core_personal.tariff_authorization_requests
    ADD COLUMN IF NOT EXISTS mes_vigencia TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
    ADD COLUMN IF NOT EXISTS solicitante_email TEXT,
    ADD COLUMN IF NOT EXISTS gerente_user_id UUID,
    ADD COLUMN IF NOT EXISTS task_id UUID;

CREATE INDEX IF NOT EXISTS idx_tariff_auth_vigencia ON core_personal.tariff_authorization_requests(mes_vigencia);

-- 2. Extend worker_tariff_audit_logs
ALTER TABLE core_personal.worker_tariff_audit_logs
    ADD COLUMN IF NOT EXISTS mes_vigencia TEXT;

-- 3. Create worker_tariff_schedules (competence-based tariff effective dates)
CREATE TABLE IF NOT EXISTS core_personal.worker_tariff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL,
    tarifa_hora NUMERIC(10, 2) NOT NULL,
    mes_inicio TEXT NOT NULL, -- YYYY-MM (e.g. '2026-12')
    request_id UUID REFERENCES core_personal.tariff_authorization_requests(id) ON DELETE SET NULL,
    aprovado_por_nome TEXT,
    aprovado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, mes_inicio)
);

CREATE INDEX IF NOT EXISTS idx_worker_tariff_schedules_lookup
    ON core_personal.worker_tariff_schedules(worker_id, mes_inicio DESC);

GRANT ALL ON TABLE core_personal.worker_tariff_schedules TO anon, authenticated, service_role;
ALTER TABLE core_personal.worker_tariff_schedules DISABLE ROW LEVEL SECURITY;

-- 4. Create tariff_authorizers (configured users allowed to authorize tariff changes)
CREATE TABLE IF NOT EXISTS core_personal.tariff_authorizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    phone TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON TABLE core_personal.tariff_authorizers TO anon, authenticated, service_role;
ALTER TABLE core_personal.tariff_authorizers DISABLE ROW LEVEL SECURITY;

-- 5. Create tariff_governance_settings (configurable email template with variables)
CREATE TABLE IF NOT EXISTS core_personal.tariff_governance_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    email_subject_template TEXT NOT NULL,
    email_body_template TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_email TEXT
);

GRANT ALL ON TABLE core_personal.tariff_governance_settings TO anon, authenticated, service_role;
ALTER TABLE core_personal.tariff_governance_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO core_personal.tariff_governance_settings (
    id,
    email_subject_template,
    email_body_template
) VALUES (
    'default',
    'Autorização de Reajuste de Tarifa ({{codigo}}) - Vigência {{vigencia}}',
    '<p>Olá, <strong>{{gerente}}</strong>,</p>
<p><strong>{{solicitante}}</strong> gerou o Termo de Autorização de Tarifa <strong>{{codigo}}</strong> com vigência a partir de <strong>{{vigencia}}</strong>.</p>
<p>Uma tarefa foi atribuída a você na <strong>Super Gaveta Operacional</strong> do sistema.</p>
<p><strong>Trabalhadores / Tarifas:</strong></p>
{{itens}}
<p><strong>Justificativa:</strong><br/>{{justificativa}}</p>
<p>Para revisar e assinar eletronicamente (é necessário estar logado com seu e-mail corporativo), acesse o link abaixo:</p>
<p><a href="{{link}}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Revisar e Assinar Termo</a></p>
<p style="font-size:12px;color:#64748b;">Caso o botão não funcione, copie e cole no navegador: {{link}}</p>'
) ON CONFLICT (id) DO NOTHING;

-- 6. RPC to complete the linked Super Gaveta task when the tariff term is signed
CREATE OR REPLACE FUNCTION core_operacoes.concluir_tarefa_termo_tarifa(
    p_task_id UUID,
    p_signed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_task_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE core_operacoes.solicitud_tareas
    SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        resolution_notes = COALESCE(
            NULLIF(TRIM(p_signed_by), ''),
            'Autorizador'
        ) || ' assinou e aprovou o termo de tarifa.'
    WHERE id = p_task_id
      AND status <> 'completed';

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.concluir_tarefa_termo_tarifa(UUID, TEXT) TO authenticated, service_role;
