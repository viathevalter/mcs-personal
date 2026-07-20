-- Add Microsoft/SharePoint connectivity columns to core_common.empresas
ALTER TABLE core_common.empresas 
ADD COLUMN IF NOT EXISTS microsoft_tenant_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS microsoft_client_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS microsoft_client_secret TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS microsoft_sharepoint_drive_id TEXT DEFAULT NULL;

COMMENT ON COLUMN core_common.empresas.microsoft_tenant_id IS 'ID do tenant Microsoft Azure / Entra ID específico para esta empresa (override do global)';
COMMENT ON COLUMN core_common.empresas.microsoft_client_id IS 'Client ID do aplicativo Microsoft Entra ID específico para esta empresa (override do global)';
COMMENT ON COLUMN core_common.empresas.microsoft_client_secret IS 'Client Secret do aplicativo Microsoft Entra ID específico para esta empresa (override do global)';
COMMENT ON COLUMN core_common.empresas.microsoft_sharepoint_drive_id IS 'ID do Drive do SharePoint específico para esta empresa (override do global)';
