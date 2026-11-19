-- ==============================================================================
-- MCS Almacen - Controle de Conclusão de Pedidos no Almacén (sem alterar Comercial)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core_logistica.almacen_pedido_status (
  pedido_id UUID PRIMARY KEY,
  status VARCHAR(30) NOT NULL DEFAULT 'CONCLUIDO', -- CONCLUIDO
  notes TEXT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID NULL
);

GRANT ALL ON core_logistica.almacen_pedido_status TO authenticated;
ALTER TABLE core_logistica.almacen_pedido_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "almacen_pedido_status_auth_all" ON core_logistica.almacen_pedido_status;
CREATE POLICY "almacen_pedido_status_auth_all" ON core_logistica.almacen_pedido_status
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Marcar como concluídos no Almacén todos os pedidos anteriores a 01/11/2026
INSERT INTO core_logistica.almacen_pedido_status (pedido_id, status, notes)
SELECT id, 'CONCLUIDO', 'Fechamento em lote: pedidos anteriores a novembro/2026'
FROM core_comercial.pedidos
WHERE expected_start_date < '2026-11-01'
  AND operational_status <> 'cancelled'
ON CONFLICT (pedido_id) DO NOTHING;
