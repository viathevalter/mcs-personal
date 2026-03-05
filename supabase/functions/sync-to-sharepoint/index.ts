import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de meses para o SharePoint
const monthNamesInSpanish = [
  "1. ENERO", "2. FEBRERO", "3. MARZO", "4. ABRIL", "5. MAYO", "6. JUNIO",
  "7. JULIO", "8. AGOSTO", "9. SEPTIEMBRE", "10. OCTUBRE", "11. NOVIEMBRE", "12. DICIEMBRE"
];

async function getGraphAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('SHAREPOINT_TENANT_ID');
  const clientId = Deno.env.get('SHAREPOINT_CLIENT_ID');
  const clientSecret = Deno.env.get('SHAREPOINT_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Azure AD configuration in Supabase.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const formData = new URLSearchParams();
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  formData.append('scope', 'https://graph.microsoft.com/.default');
  formData.append('grant_type', 'client_credentials');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Token Error:", errorBody);
    throw new Error(`Auth failed with Azure AD: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: any;
  let hourId: string | undefined;

  try {
    const { hour_id } = await req.json();
    hourId = hour_id;

    if (!hour_id) throw new Error("The 'hour_id' is required.");

    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Mark as syncing
    await supabaseClient
      .from('worker_hours')
      .update({ sharepoint_sync_status: 'syncing', sharepoint_sync_date: new Date().toISOString() })
      .eq('id', hour_id);

    // 2. Fetch the hour record
    const { data: hourRecord, error: hourError } = await supabaseClient
      .from('worker_hours')
      .select(`
        *,
        worker:workers (
          nome,
          cliente:clientes (
            cod_cliente,
            nome_comercial
          )
        )
      `)
      .eq('id', hour_id)
      .single();

    if (hourError || !hourRecord) throw new Error("Hour record not found.");
    if (!hourRecord.file_url) throw new Error("This record has no file to sync.");

    // 3. Download the file from Supabase Storage
    const bucketName = 'hours';
    const filePathInBucket = hourRecord.file_url;

    // We fetch using string to get arrayBuffer directly or use Supabase js download
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(bucketName)
      .download(filePathInBucket);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from Supabase: ${downloadError?.message}`);
    }

    const fileBuffer = await fileData.arrayBuffer();

    // 4. Construct SharePoint Path
    const year = hourRecord.period_year;
    const monthIndex = hourRecord.period_month - 1; // 0-based
    const monthName = monthNamesInSpanish[monthIndex];
    // Ex: "3. MARZO 2026"
    const folderMonthName = `${monthName} ${year}`;

    const clientCode = hourRecord.worker?.cliente?.cod_cliente || "00";
    const clientName = hourRecord.worker?.cliente?.nome_comercial || "UNKNOWN";
    // Ex: "54-COMESA SL"
    const folderClientName = `${clientCode}-${clientName}`;

    const originalFileName = hourRecord.file_name || `hoja_horas_${hourRecord.id}.pdf`;

    // Strict structure: Geral / 3. HOJAS TRABAJADORES / 2026 / 3. MARZO 2026 / 54-COMESA SL / Arquivo.pdf
    const spPath = `/Geral/3. HOJAS TRABAJADORES/${year}/${folderMonthName}/${folderClientName}/${originalFileName}`;

    // 5. Upload to SharePoint via Microsoft Graph API
    const accessToken = await getGraphAccessToken();
    const driveId = Deno.env.get('SHAREPOINT_DRIVE_ID');

    if (!driveId) throw new Error("SHAREPOINT_DRIVE_ID is missing from environment variables.");

    // Put file directly. Graph API auto-creates missing folders for path-based uploads.
    // URI Encode the path, but not the slashes
    const encodedPath = spPath.split('/').map(c => encodeURIComponent(c)).join('/');
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;

    console.log("Uploading to SharePoint:", uploadUrl);

    const spUploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf',
      },
      body: fileBuffer,
    });

    if (!spUploadRes.ok) {
      const spErr = await spUploadRes.text();
      throw new Error(`SharePoint upload failed: ${spUploadRes.status} - ${spErr}`);
    }

    // 6. Update Sync Status to Success
    await supabaseClient
      .from('worker_hours')
      .update({ sharepoint_sync_status: 'success', sharepoint_error: null })
      .eq('id', hour_id);

    return new Response(
      JSON.stringify({ success: true, message: "Sincronização concluída com sucesso", path: spPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Sync Error:", error.message);

    if (supabaseClient && hourId) {
      await supabaseClient
        .from('worker_hours')
        .update({ sharepoint_sync_status: 'failed', sharepoint_error: error.message })
        .eq('id', hourId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
