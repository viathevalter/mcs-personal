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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    // Verify user JWT
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid JWT token or user not found");
    }

    const { hour_id } = await req.json();
    hourId = hour_id;

    if (!hour_id) throw new Error("The 'hour_id' is required.");

    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'core_personal' } }
    );

    // 1. Mark as syncing
    await supabaseClient
      .from('worker_hours')
      .update({ sharepoint_sync_status: 'syncing', sharepoint_sync_date: new Date().toISOString(), sharepoint_error: null })
      .eq('id', hour_id);

    // 2. Fetch the hour record and worker details (within core_personal)
    const { data: hrData, error: hourError } = await supabaseClient
      .from('worker_hours')
      .select(`
        *,
        worker:workers (
          nome,
          cod_colab
        )
      `)
      .eq('id', hour_id)
      .single();

    if (hourError || !hrData) {
      throw new Error(`Hour record not found in DB: ${hourError?.message} (Code: ${hourError?.code}, ID: ${hour_id})`);
    }

    const hourRecord = hrData as any;

    // Leia os dados gravados no momento do envio da folha pela UI:
    // hourRecord.contratante e hourRecord.cliente_nombre já contêm STOCCO / LUMINOUS etc.

    if (!hourRecord.file_url) throw new Error("This record has no file to sync.");

    // 3. Download the file from Supabase Storage
    const bucketName = 'horas_trabalhadores';
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

    // Empresa (Company) string e.g. LUMINOUS, STOCCO, KOTRIK ROSAS
    const folderEmpresaName = hourRecord.contratante || "";
    // O Cliente já será fornecido com o código embutido se a UI tiver gerado dessa forma (ex: 628-METALVENT)
    const folderClientName = hourRecord.cliente_nombre || "";

    // Use worker's name for the file, keeping the original extension
    const workerName = hourRecord.worker?.nome || `Trabalhador_${hourRecord.worker_id}`;
    const originalExt = hourRecord.file_name ? hourRecord.file_name.split('.').pop() : 'pdf';
    const finalFileName = `${workerName}.${originalExt}`;

    // Dynamically build the path depending on what we have.
    // If we have Empresa and Client: Geral / 3. HOJAS TRABAJADORES / 2026 / 3. MARZO 2026 / LUMINOUS / 628 METALVENT / WILLIAM.pdf
    // If not: Geral / 3. HOJAS TRABAJADORES / 2026 / 3. MARZO 2026 / WILLIAM.pdf
    let dynamicSubPaths = "";
    if (folderEmpresaName && folderClientName) {
        dynamicSubPaths = `/${folderEmpresaName}/${folderClientName}`;
    }

    const spPath = `/Geral/3. HOJAS TRABAJADORES/${year}/${folderMonthName}${dynamicSubPaths}/${finalFileName}`;

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
      .eq('id', hourId);

    return new Response(
      JSON.stringify({ success: true, message: "Sincronização concluída com sucesso", path: spPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Sync Error:", error.message);

    try {
        const fallbackClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { db: { schema: 'core_personal' } }
        );
        if (hourId) {
          await fallbackClient
            .from('worker_hours')
            .update({ sharepoint_sync_status: 'failed', sharepoint_error: error.message })
            .eq('id', hourId);
        }
    } catch (e) {
        console.error("Failed to write error to DB:", e);
    }

    // Returning 200 with success: false prevents Supabase JS from throwing the generic "non 2xx" error.
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
