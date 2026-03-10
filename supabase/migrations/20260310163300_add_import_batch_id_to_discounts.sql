-- Add import_batch_id to worker_discounts to allow reverting an entire import 

ALTER TABLE public.worker_discounts
ADD COLUMN import_batch_id UUID NULL;

-- Create an index to speed up lookup when reverting a batch
CREATE INDEX idx_worker_discounts_batch_id ON public.worker_discounts(import_batch_id) WHERE import_batch_id IS NOT NULL;
