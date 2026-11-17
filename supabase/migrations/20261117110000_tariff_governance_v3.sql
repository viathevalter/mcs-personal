-- Migration: Tariff Governance V3 (ES Email Templates, Rejection/Non-Authorization Reason, Signature Type, Test Cleanup)
-- Date: 2026-11-17

ALTER TABLE core_personal.tariff_authorization_requests
    ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT,
    ADD COLUMN IF NOT EXISTS rejeitado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejeitado_por_nome TEXT,
    ADD COLUMN IF NOT EXISTS tipo_assinatura TEXT DEFAULT 'desenho';

ALTER TABLE core_personal.tariff_governance_settings
    ADD COLUMN IF NOT EXISTS email_subject_template_es TEXT,
    ADD COLUMN IF NOT EXISTS email_body_template_es TEXT;

UPDATE core_personal.tariff_governance_settings
SET
    email_subject_template_es = COALESCE(
        email_subject_template_es,
        'Autorización de Ajuste de Tarifa ({{codigo}}) - Vigencia {{vigencia}}'
    ),
    email_body_template_es = COALESCE(
        email_body_template_es,
        '<p>Hola, <strong>{{gerente}}</strong>,</p>
<p><strong>{{solicitante}}</strong> ha generado el Termo de Autorización de Tarifa <strong>{{codigo}}</strong> con vigencia a partir de <strong>{{vigencia}}</strong>.</p>
<p>Se te ha asignado una tarea en la <strong>Super Gaveta Operacional</strong> del sistema.</p>
<p><strong>Trabajadores / Tarifas:</strong></p>
{{itens}}
<p><strong>Justificación:</strong><br/>{{justificativa}}</p>
<p>Para revisar y firmar electrónicamente (es necesario iniciar sesión con tu correo corporativo), accede al siguiente enlace:</p>
<p><a href="{{link}}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Revisar y Firmar Termo</a></p>
<p style="font-size:12px;color:#64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador: {{link}}</p>'
    )
WHERE id = 'default';

-- Delete all old test authorization requests issued before 2026-11-17
DELETE FROM core_personal.tariff_authorization_requests
WHERE created_at::date < DATE '2026-11-17';
