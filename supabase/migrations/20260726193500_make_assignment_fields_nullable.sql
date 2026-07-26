-- Migration to allow standalone replacements and operational allocations without mandatory commercial order IDs
ALTER TABLE core_personal.worker_assignments ALTER COLUMN pedido_id DROP NOT NULL;
ALTER TABLE core_personal.worker_assignments ALTER COLUMN pedido_item_id DROP NOT NULL;
ALTER TABLE core_personal.worker_assignments ALTER COLUMN client_site_id DROP NOT NULL;
ALTER TABLE core_personal.worker_assignments ALTER COLUMN job_function_id DROP NOT NULL;
