-- ==============================================================================
-- MCS Almacen - Cadastro Oficial de Tamanhos / Grades & Fornecedor no Estoque
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core_logistica.almacen_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL, -- camisa, pantalon, calzado
  code VARCHAR(20) NOT NULL,     -- S, M, L, XL, XXL, XXXL, 40, 42...
  label VARCHAR(60) NOT NULL,    -- Ex: XL (60), M (42/44)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, code)
);

ALTER TABLE core_logistica.almacen_stock
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150) NULL;

GRANT ALL ON core_logistica.almacen_sizes TO authenticated;
ALTER TABLE core_logistica.almacen_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "almacen_sizes_auth_all" ON core_logistica.almacen_sizes;
CREATE POLICY "almacen_sizes_auth_all" ON core_logistica.almacen_sizes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed oficial de Tamanhos (Camisa & Calça)
INSERT INTO core_logistica.almacen_sizes (category, code, label, sort_order) VALUES
  ('camisa', 'S', 'S (50/52)', 1),
  ('camisa', 'M', 'M (54/56)', 2),
  ('camisa', 'L', 'L (58)', 3),
  ('camisa', 'XL', 'XL (60)', 4),
  ('camisa', 'XXL', 'XXL (62)', 5),
  ('camisa', 'XXXL', 'XXXL (64)', 6),
  ('pantalon', 'S', 'S (38/40)', 1),
  ('pantalon', 'M', 'M (42/44)', 2),
  ('pantalon', 'L', 'L (46)', 3),
  ('pantalon', 'XL', 'XL (52)', 4),
  ('pantalon', 'XXL', 'XXL (54)', 5),
  ('pantalon', 'XXXL', 'XXXL (56)', 6)
ON CONFLICT (category, code) DO NOTHING;

-- Normalizar tamanhos legados em core_personal.workers para o código padronizado (S..XXXL)
UPDATE core_personal.workers
SET camiseta = CASE
  WHEN UPPER(camiseta) ~ '(XXXL|64)' THEN 'XXXL'
  WHEN UPPER(camiseta) ~ '(XXL|62)' THEN 'XXL'
  WHEN UPPER(camiseta) ~ '(XL|60)' THEN 'XL'
  WHEN UPPER(camiseta) ~ '(\mL\M|58|\mG\M)' THEN 'L'
  WHEN UPPER(camiseta) ~ '(\mM\M|54|56)' THEN 'M'
  WHEN UPPER(camiseta) ~ '(\mS\M|50|52|\mP\M)' THEN 'S'
  ELSE camiseta
END
WHERE camiseta IS NOT NULL AND TRIM(camiseta) <> '';

UPDATE core_personal.workers
SET pantalones = CASE
  WHEN UPPER(pantalones) ~ '(XXXL|56)' THEN 'XXXL'
  WHEN UPPER(pantalones) ~ '(XXL|54)' THEN 'XXL'
  WHEN UPPER(pantalones) ~ '(XL|52)' THEN 'XL'
  WHEN UPPER(pantalones) ~ '(\mL\M|46|\mG\M)' THEN 'L'
  WHEN UPPER(pantalones) ~ '(\mM\M|42|44)' THEN 'M'
  WHEN UPPER(pantalones) ~ '(\mS\M|38|40|\mP\M)' THEN 'S'
  ELSE pantalones
END
WHERE pantalones IS NOT NULL AND TRIM(pantalones) <> '';
