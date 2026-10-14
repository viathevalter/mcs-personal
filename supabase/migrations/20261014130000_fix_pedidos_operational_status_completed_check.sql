-- Migration: 20261014130000_fix_pedidos_operational_status_completed_check.sql
-- Description: Inclui 'completed' na check constraint pedidos_operational_status_check de core_comercial.pedidos para permitir Finalização de Obra (order_termination).

BEGIN;

ALTER TABLE core_comercial.pedidos DROP CONSTRAINT IF EXISTS pedidos_operational_status_check;
ALTER TABLE core_comercial.pedidos ADD CONSTRAINT pedidos_operational_status_check 
CHECK (operational_status IN ('pending_operations', 'partially_fulfilled', 'fulfilled', 'cancelled', 'paused', 'completed'));

COMMIT;
