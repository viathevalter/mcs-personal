-- ==============================================================================
-- MCS Almacen - Fase 1: Estoque, Variações, Kardex e Ordens de Separação
-- ==============================================================================

-- 1. Evoluir catálogo de EPIs para suportar uniformes por empresa e tamanhos
ALTER TABLE core_logistica.epis
  ADD COLUMN IF NOT EXISTS is_branded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_category VARCHAR(30) NULL;

-- Atualizar CAMISA e PANTALONE existentes
UPDATE core_logistica.epis
SET has_sizes = true, is_branded = true, size_category = 'camisa'
WHERE UPPER(name) LIKE '%CAMISA%' OR UPPER(name) LIKE '%CHAQUETA%';

UPDATE core_logistica.epis
SET has_sizes = true, is_branded = false, size_category = 'pantalon'
WHERE UPPER(name) LIKE '%PANTALON%';

-- 2. Tabela de Estoque (por EPI + Empresa opcional + Tamanho/Variação)
CREATE TABLE IF NOT EXISTS core_logistica.almacen_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id UUID NOT NULL REFERENCES core_logistica.epis(id) ON DELETE CASCADE,
  empresa_id UUID NULL, -- NULL = estoque único compartilhado; UUID = uniforme padronizado da empresa
  size_code VARCHAR(30) NOT NULL DEFAULT 'UNICO',
  sku_code VARCHAR(80) NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  location_bin VARCHAR(80) NULL,
  unit_cost NUMERIC(10,2) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_almacen_stock_item_emp_size
  ON core_logistica.almacen_stock (
    epi_id,
    COALESCE(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid),
    UPPER(size_code)
  );

-- 3. Movimentações de Estoque (Kardex)
CREATE TABLE IF NOT EXISTS core_logistica.almacen_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES core_logistica.almacen_stock(id) ON DELETE CASCADE,
  movement_type VARCHAR(40) NOT NULL, -- ENTRADA_COMPRA, SAIDA_ASIGNACION, SAIDA_REPOSICION, SAIDA_DETERIORO, AJUSTE_INVENTARIO, DEVOLUCAO
  quantity_delta INTEGER NOT NULL,
  previous_qty INTEGER NOT NULL,
  new_qty INTEGER NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id UUID NULL,
  notes TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_almacen_movements_stock_id
  ON core_logistica.almacen_stock_movements(stock_id, created_at DESC);

-- 4. Ordens de Separação / Despacho
CREATE TABLE IF NOT EXISTS core_logistica.almacen_picking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(40) NOT NULL UNIQUE,
  pedido_id UUID NULL,
  pedido_codigo VARCHAR(60) NULL,
  empresa_id UUID NULL,
  empresa_nome VARCHAR(120) NULL,
  client_id UUID NULL,
  client_nome VARCHAR(200) NULL,
  worker_id UUID NULL,
  cod_colab VARCHAR(40) NULL,
  worker_nome VARCHAR(200) NOT NULL,
  worker_identificacion VARCHAR(60) NULL,
  worker_phone VARCHAR(60) NULL,
  job_function_id UUID NULL,
  job_function_name VARCHAR(150) NULL,
  request_type VARCHAR(30) NOT NULL DEFAULT 'ASIGNACION', -- ASIGNACION, REPOSICION, DETERIORO
  status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, EM_SEPARACAO, CONFERIDO, DESPACHADO, ENTREGUE, CANCELADO
  camiseta_size VARCHAR(20) NULL,
  pantalones_size VARCHAR(20) NULL,
  delivery_method VARCHAR(40) NULL, -- NACEX, RECOGIDA, OBRA, ALOJAMIENTO
  tracking_code VARCHAR(100) NULL,
  delivery_address TEXT NULL,
  signature_token UUID NOT NULL DEFAULT gen_random_uuid(),
  signed_at TIMESTAMPTZ NULL,
  signed_by_name VARCHAR(200) NULL,
  signature_data_url TEXT NULL,
  observations TEXT NULL,
  expected_start_date DATE NULL,
  prepared_at TIMESTAMPTZ NULL,
  dispatched_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_almacen_picking_pedido_worker
  ON core_logistica.almacen_picking_orders(pedido_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_almacen_picking_status
  ON core_logistica.almacen_picking_orders(status, created_at DESC);

-- 5. Itens da Ordem de Separação
CREATE TABLE IF NOT EXISTS core_logistica.almacen_picking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picking_order_id UUID NOT NULL REFERENCES core_logistica.almacen_picking_orders(id) ON DELETE CASCADE,
  epi_id UUID NULL REFERENCES core_logistica.epis(id) ON DELETE SET NULL,
  stock_id UUID NULL REFERENCES core_logistica.almacen_stock(id) ON DELETE SET NULL,
  item_name VARCHAR(150) NOT NULL,
  size_code VARCHAR(30) NOT NULL DEFAULT 'UNICO',
  sku_code VARCHAR(80) NULL,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  quantity_picked INTEGER NOT NULL DEFAULT 0,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_almacen_picking_items_order
  ON core_logistica.almacen_picking_items(picking_order_id);

-- 6. Permissões e RLS
GRANT USAGE ON SCHEMA core_logistica TO authenticated;
GRANT ALL ON core_logistica.almacen_stock TO authenticated;
GRANT ALL ON core_logistica.almacen_stock_movements TO authenticated;
GRANT ALL ON core_logistica.almacen_picking_orders TO authenticated;
GRANT ALL ON core_logistica.almacen_picking_items TO authenticated;

ALTER TABLE core_logistica.almacen_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistica.almacen_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistica.almacen_picking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_logistica.almacen_picking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "almacen_stock_auth_all" ON core_logistica.almacen_stock;
CREATE POLICY "almacen_stock_auth_all" ON core_logistica.almacen_stock
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "almacen_movements_auth_all" ON core_logistica.almacen_stock_movements;
CREATE POLICY "almacen_movements_auth_all" ON core_logistica.almacen_stock_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "almacen_picking_orders_auth_all" ON core_logistica.almacen_picking_orders;
CREATE POLICY "almacen_picking_orders_auth_all" ON core_logistica.almacen_picking_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "almacen_picking_items_auth_all" ON core_logistica.almacen_picking_items;
CREATE POLICY "almacen_picking_items_auth_all" ON core_logistica.almacen_picking_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
