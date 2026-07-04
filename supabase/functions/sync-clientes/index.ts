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

function extractDigits(str: string): string {
  if (!str) return '';
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10).toString() : '';
}

const pzDaysMap: Record<string, number> = {
  'PZ1': 10,
  'PZ2': 15,
  'PZ3': 30,
  'PZ4': 45,
  'PZ5': 60
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const executionLogs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    executionLogs.push(msg);
  };

  try {
    const isProd = Deno.env.get('SUPABASE_URL')?.includes('unbepkdzvsfvylnysrcq');
    log(`Starting SharePoint Clientes & Rates Bulk Sync (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})...`);
    const token = await getGraphAccessToken();

    // Mastercorp site ID
    const siteId = "kotrik.sharepoint.com,9bc6e0ab-cc2a-47d6-9884-9e63ef0a9d07,64523198-9f20-44fb-87c5-182e1e40506a";

    // 1. Fetch Lists Metadata
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
    const listsResponse = await fetch(listsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!listsResponse.ok) {
      throw new Error(`Failed to fetch lists: ${listsResponse.statusText}`);
    }
    const listsData = await listsResponse.json();

    const clientesList = listsData.value.find((l: any) => l.name.toLowerCase() === 'clientes' || l.displayName.toLowerCase() === 'clientes');
    const ratesList = listsData.value.find((l: any) => l.name.toLowerCase() === 'alteracoes_valor_funcion_cliente' || l.displayName.toLowerCase() === 'alteracoes_valor_funcion_cliente');

    if (!clientesList) throw new Error("List 'Clientes' not found on SharePoint site.");
    if (!ratesList) throw new Error("List 'Alteracoes_valor_funcion_cliente' not found on SharePoint site.");

    // 2. Fetch Clientes items
    const clientesItemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${clientesList.id}/items?expand=fields&$top=1000`;
    const clientesResponse = await fetch(clientesItemsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!clientesResponse.ok) {
      throw new Error(`Failed to fetch clients: ${clientesResponse.statusText}`);
    }
    const clientesData = await clientesResponse.json();
    const spClients = clientesData.value;
    log(`Fetched ${spClients.length} clients from SharePoint.`);

    // 3. Fetch Alteracoes items
    const ratesItemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${ratesList.id}/items?expand=fields&$top=2000`;
    const ratesResponse = await fetch(ratesItemsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!ratesResponse.ok) {
      throw new Error(`Failed to fetch custom rates: ${ratesResponse.statusText}`);
    }
    const ratesData = await ratesResponse.json();
    const spRates = ratesData.value;
    log(`Fetched ${spRates.length} custom rates overrides from SharePoint.`);

    // 4. Connect to Supabase DB using Service Role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'core_common' } }
    );

    // 5. Fetch all active companies
    const { data: companies, error: companiesError } = await supabase
      .from('empresas')
      .select('id, nome');
    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }
    log(`Found ${companies.length} active companies.`);

    // 6. Pre-process Rates overrides by Client Code
    const ratesByClientDigit: Record<string, any[]> = {};
    for (const rateItem of spRates) {
      const fields = rateItem.fields || {};
      const workerName = fields.Trabajador;
      const jobFunction = fields.Funcion;
      const clientRaw = fields.Cliente; // e.g. "122-MANREC"
      const obra = fields.Obra || 'Sin Obra';
      const rateVal = parseFloat(fields.Valor || '0') || 0.00;

      if (!workerName || !clientRaw) continue;

      const clientDigit = extractDigits(clientRaw);
      if (!clientDigit) continue;

      if (!ratesByClientDigit[clientDigit]) {
        ratesByClientDigit[clientDigit] = [];
      }
      ratesByClientDigit[clientDigit].push({
        worker_name: workerName.trim(),
        job_function_name: jobFunction ? jobFunction.trim() : null,
        obra: obra.trim(),
        rate: rateVal
      });
    }

    // 7. Fetch all existing clients for in-memory caching lookup (paginated to bypass 1000-row limit)
    let existingClients: any[] = [];
    let start = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('clients')
        .select('id, empresa_id, codigo, tax_id')
        .range(start, start + limit - 1);
        
      if (error) {
        throw new Error(`Failed to fetch existing clients at range ${start}: ${error.message}`);
      }
      if (!data || data.length === 0) {
        break;
      }
      existingClients = existingClients.concat(data);
      if (data.length < limit) {
        break;
      }
      start += limit;
    }

    log(`CACHE: Fetched ${existingClients.length} existing clients from database.`);

    // Build lookup maps: "empresaId_codigo" -> id AND "empresaId_taxId" -> id (lowercase for case-insensitivity)
    const clientByCodeMap = new Map<string, string>();
    const clientByTaxMap = new Map<string, string>();
    for (const ec of existingClients) {
      if (ec.codigo) {
        clientByCodeMap.set(`${ec.empresa_id}_${ec.codigo.trim().toLowerCase()}`, ec.id);
      }
      if (ec.tax_id) {
        clientByTaxMap.set(`${ec.empresa_id}_${ec.tax_id.trim().toLowerCase()}`, ec.id);
      }
    }

    // 8. Sync Loop
    let syncedClientsCount = 0;
    const errors: any[] = [];

    for (const empresa of companies) {
      log(`Processing company "${empresa.nome}"...`);

      // A. Ensure Payment Terms exist in database and resolve their IDs
      const paymentTermsMap: Record<number, string> = {}; // days -> term_id
      const targetDays = [10, 15, 30, 45, 60];
      
      for (const d of targetDays) {
        const { data: existingTerm, error: checkErr } = await supabase
          .from('payment_terms')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('days', d)
          .maybeSingle();

        if (checkErr) {
          log(`  Error checking payment term for ${d} days: ${checkErr.message}`);
          continue;
        }

        if (existingTerm) {
          paymentTermsMap[d] = existingTerm.id;
        } else {
          // Create it
          const newTermId = await getDeterministicUUID(empresa.id, `pay_term_${d}_days`);
          const termName = `${d} dias após faturamento`;
          const { error: insertErr } = await supabase
            .from('payment_terms')
            .insert({
              id: newTermId,
              empresa_id: empresa.id,
              name: termName,
              days: d,
              active: true
            });

          if (insertErr) {
            log(`  Failed to create payment term for ${d} days: ${insertErr.message}`);
          } else {
            log(`  Created payment term: "${termName}" for ${empresa.nome}`);
            paymentTermsMap[d] = newTermId;
          }
        }
      }

      // B. Build the batch array to upsert for this company
      const uniqueClientsToUpsert = new Map<string, any>();
      const usedTaxIds = new Set<string>();
      const usedIdsInBatch = new Set<string>();

      for (const clientItem of spClients) {
        const fields = clientItem.fields || {};
        const codCliente = fields.CodCliente;
        const razonSocial = fields.RazonSocial;

        if (!codCliente || !razonSocial) continue;

        const codKey = codCliente.trim();
        const codLookupKey = codKey.toLowerCase();
        let taxId = fields.CifDni ? fields.CifDni.trim() : null;
        const taxLookupKey = taxId ? taxId.toLowerCase() : '';

        // Skip if client code already processed in this batch to avoid duplicates
        if (uniqueClientsToUpsert.has(codLookupKey)) {
          continue;
        }

        const clientDigit = extractDigits(codCliente);
        const clientOverrides = ratesByClientDigit[clientDigit] || null;

        // Resolve payment term ID
        const pzCode = fields.TpPrazosPg || '';
        const targetDays = pzDaysMap[pzCode] || 30; // default to 30 if PZ code is missing or unmapped
        const resolvedTermId = paymentTermsMap[targetDays] || null;
        const termNameText = resolvedTermId ? `${targetDays} dias` : null;

        // Lookup in-memory to find existing ID ONLY by client code
        let clientId = clientByCodeMap.get(`${empresa.id}_${codLookupKey}`);
        if (!clientId) {
          clientId = await getDeterministicUUID(empresa.id, `client_${codKey}`);
        }

        // Final fallback: if ID is still duplicate in batch, generate a random one
        if (usedIdsInBatch.has(clientId)) {
          clientId = crypto.randomUUID();
        }

        // If taxId already processed in this batch, nullify it to prevent constraint violation
        if (taxId && usedTaxIds.has(taxLookupKey)) {
          taxId = null;
        }

        // If taxId is already owned by a different client in DB, nullify it to prevent constraint violation
        if (taxId) {
          const dbTaxOwnerId = clientByTaxMap.get(`${empresa.id}_${taxLookupKey}`);
          if (dbTaxOwnerId && dbTaxOwnerId !== clientId) {
            taxId = null;
          }
        }

        // Track used IDs and tax IDs
        usedIdsInBatch.add(clientId);
        if (taxId) {
          usedTaxIds.add(taxLookupKey);
        }

        const tradeName = fields.NombreComercial || fields.RazonSocial;
        const address = fields.Domicilio || null;
        const phone = fields.Telefono || null;
        const emailFactura = fields.EmailEnvioFactura || null;
        const emailCobros = fields.EmailCobros || null;
        const respCobros = fields.RespCobros || null;
        const telCobros = fields.TelefonoCobros || null;

        const clientRow: any = {
          id: clientId,
          empresa_id: empresa.id,
          codigo: codKey,
          legal_name: razonSocial.trim(),
          trade_name: tradeName.trim(),
          tax_id: taxId,
          address_line: address ? address.trim() : null,
          phone: phone ? phone.trim() : null,
          billing_email: emailFactura ? emailFactura.trim() : null,
          payment_term_id: resolvedTermId,
          status: 'active'
        };

        if (!isProd) {
          clientRow.collections_email = emailCobros ? emailCobros.trim() : null;
          clientRow.collections_contact_name = respCobros ? respCobros.trim() : null;
          clientRow.collections_contact_phone = telCobros ? telCobros.trim() : null;
          clientRow.payment_terms = termNameText;
          clientRow.functions_json = clientOverrides;
        }

        uniqueClientsToUpsert.set(codLookupKey, clientRow);
      }

      const companyClientsToUpsert = Array.from(uniqueClientsToUpsert.values());

      // C. Perform bulk upsert for this company
      if (companyClientsToUpsert.length > 0) {
        log(`  Bulk upserting ${companyClientsToUpsert.length} clients for ${empresa.nome}...`);
        const { error: upsertError } = await supabase
          .from('clients')
          .upsert(companyClientsToUpsert);

        if (upsertError) {
          log(`  Failed to bulk upsert clients for ${empresa.nome}: ${upsertError.message}`);
          errors.push({
            company: empresa.nome,
            message: upsertError.message
          });
        } else {
          syncedClientsCount += companyClientsToUpsert.length;
        }
      }
    }

    log(`Successfully synced ${syncedClientsCount} client entries across all companies.`);

    return new Response(JSON.stringify({
      success: true,
      synced_clients: syncedClientsCount,
      errors_count: errors.length,
      errors: errors,
      companies_count: companies.length,
      sharepoint_clients_count: spClients.length,
      sharepoint_rates_count: spRates.length,
      execution_logs: executionLogs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err: any) {
    console.error("Error syncing SharePoint Clientes:", err);
    return new Response(JSON.stringify({ success: false, error: err.message, execution_logs: executionLogs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
