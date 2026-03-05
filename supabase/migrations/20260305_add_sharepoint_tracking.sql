-- Add SharePoint tracking columns to worker_hours table
ALTER TABLE worker_hours 
ADD COLUMN IF NOT EXISTS sharepoint_sync_status text DEFAULT 'pending' CHECK (sharepoint_sync_status IN ('pending', 'syncing', 'success', 'failed')),
ADD COLUMN IF NOT EXISTS sharepoint_sync_date timestamptz,
ADD COLUMN IF NOT EXISTS sharepoint_error text;

-- Add index for querying pending syncs
CREATE INDEX IF NOT EXISTS idx_worker_hours_sp_sync ON worker_hours(sharepoint_sync_status);
