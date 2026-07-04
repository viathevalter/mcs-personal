import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function getDeterministicUUID(namespace: string, name: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(namespace + name);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Starting SharePoint Epis Sync...");
    const token = await getGraphAccessToken();

    // Mastercorp site ID
    const siteId = "kotrik.sharepoint.com,9bc6e0ab-cc2a-47d6-9884-9e63ef0a9d07,64523198-9f20-44fb-87c5-182e1e40506a";
    
    // 1. Fetch lists to find list named 'Epis'
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
    const listsResponse = await fetch(listsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listsResponse.ok) {
      throw new Error(`Failed to fetch lists: ${listsResponse.statusText}`);
    }

    const listsData = await listsResponse.json();
    const episList = listsData.value.find((l: any) => l.name.toLowerCase() === 'epis' || l.displayName.toLowerCase() === 'epis');

    if (!episList) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "List 'Epis' not found in SharePoint site."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404
      });
    }

    // 2. Fetch list items from SharePoint
    const itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${episList.id}/items?expand=fields`;
    const itemsResponse = await fetch(itemsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!itemsResponse.ok) {
      throw new Error(`Failed to fetch items: ${itemsResponse.statusText}`);
    }

    const itemsData = await itemsResponse.json();
    const spItems = itemsData.value;
    console.log(`Fetched ${spItems.length} EPIs from SharePoint.`);

    // 3. Connect to Supabase DB using Service Role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'core_logistica' } }
    );

    // 4. Fetch all active companies
    const { data: companies, error: companiesError } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('id, nome');

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    console.log(`Found ${companies.length} active companies.`);

    // 5. Sync/Upsert EPIs per company
    let syncedCount = 0;
    const errors: any[] = [];
    for (const empresa of companies) {
      console.log(`Syncing EPIs for company "${empresa.nome}"...`);
      for (const item of spItems) {
        const fields = item.fields || {};
        const epiName = fields.Nombre;
        if (!epiName) continue;

        const epiId = await getDeterministicUUID(empresa.id, `epi_${item.id}`);
        const epiCode = `EPI-${item.id.padStart(4, '0')}`;
        const epiDesc = fields.Descripcion || null;
        const epiCat = fields.Tipo || 'Estandar';
        const epiStatus = fields.StatusEpi === 'Ativo' ? 'active' : 'inactive';

        const { error: upsertError } = await supabase
          .from('epis')
          .upsert({
            id: epiId,
            empresa_id: empresa.id,
            code: epiCode,
            name: epiName,
            description: epiDesc,
            category: epiCat,
            unit: 'Ud',
            default_cost: 0.00,
            status: epiStatus
          });

        if (upsertError) {
          console.error(`Failed to upsert EPI ${epiCode} for ${empresa.nome}:`, upsertError);
          errors.push({
            company: empresa.nome,
            epi: epiCode,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint
          });
        } else {
          syncedCount++;
        }
      }
    }

    console.log(`Successfully synced ${syncedCount} EPI entries across all companies.`);

    return new Response(JSON.stringify({
      success: true,
      synced_records: syncedCount,
      errors_count: errors.length,
      errors: errors,
      companies_count: companies.length,
      sharepoint_items_count: spItems.length,
      sample_mapped: spItems.slice(0, 3).map((item: any) => ({
        id: item.id,
        nombre: item.fields?.Nombre,
        fields_keys: Object.keys(item.fields || {})
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err: any) {
    console.error("Error syncing SharePoint Epis:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
