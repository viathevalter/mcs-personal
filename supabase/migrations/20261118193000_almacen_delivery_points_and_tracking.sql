-- ==============================================================================
-- MCS Almacen - Pontos / Agências Nacex Frequentes & Rastreabilidade
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core_logistica.almacen_delivery_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  point_type VARCHAR(30) NOT NULL DEFAULT 'NACEX_AGENCIA', -- NACEX_AGENCIA, NACEX_SHOP, OBRA_FIXA, OUTRO
  nacex_code VARCHAR(40) NULL,
  address_line TEXT NOT NULL,
  postal_code VARCHAR(20) NULL,
  city VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  phone VARCHAR(60) NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE core_logistica.almacen_picking_orders
  ADD COLUMN IF NOT EXISTS delivery_point_id UUID NULL REFERENCES core_logistica.almacen_delivery_points(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS carrier_status VARCHAR(40) NULL, -- PENDENTE_ENVIO, EM_TRANSITO, DISPONIVEL_RETIRADA, ENTREGUE, INCIDENCIA
  ADD COLUMN IF NOT EXISTS carrier_status_detail TEXT NULL,
  ADD COLUMN IF NOT EXISTS carrier_last_sync_at TIMESTAMPTZ NULL;

GRANT ALL ON core_logistica.almacen_delivery_points TO authenticated;
ALTER TABLE core_logistica.almacen_delivery_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "almacen_delivery_points_auth_all" ON core_logistica.almacen_delivery_points;
CREATE POLICY "almacen_delivery_points_auth_all" ON core_logistica.almacen_delivery_points
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
