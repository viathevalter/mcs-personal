-- Expand core_operacoes.pedidos view to include client details and expected dates
DROP VIEW IF EXISTS core_operacoes.pedidos CASCADE;

CREATE VIEW core_operacoes.pedidos AS
SELECT 
    p.id,
    p.codigo,
    p.empresa_id,
    p.client_id,
    p.client_site_id,
    p.expected_start_date,
    p.expected_end_date,
    p.created_at,
    p.commercial_status,
    p.operational_status,
    c.trade_name AS client_name,
    c.legal_name AS client_legal_name,
    cs.name AS site_name
FROM core_comercial.pedidos p
LEFT JOIN core_common.clients c ON c.id = p.client_id
LEFT JOIN core_common.client_sites cs ON cs.id = p.client_site_id;

GRANT SELECT ON core_operacoes.pedidos TO authenticated, anon;
