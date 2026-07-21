import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    log(`Starting SharePoint ContasReceber Bulk Sync (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})...`);
    
    const token = await getGraphAccessToken();

    // 1. Fetch target list from SharePoint
    const siteId = 'kotrik.sharepoint.com,9bc6e0ab-cc2a-47d6-9884-9e63ef0a9d07,64523198-9f20-44fb-87c5-182e1e40506a';
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
    const listsResponse = await fetch(listsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listsResponse.ok) {
      throw new Error(`Failed to fetch lists: ${listsResponse.statusText}`);
    }

    const listsData = await listsResponse.json();
    const targetList = listsData.value.find((l: any) => l.name.toLowerCase() === 'contasreceber' || l.displayName.toLowerCase().replace(/\s+/g, '') === 'contasreceber');

    if (!targetList) {
      throw new Error("ContasReceber list not found in SharePoint.");
    }

    log(`Found target list: "${targetList.displayName}" (${targetList.id})`);

    // 2. Fetch all items in pagination loop
    let itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${targetList.id}/items?expand=fields&$top=999`;
    const spItems: any[] = [];
    while (itemsUrl) {
      const itemsResponse = await fetch(itemsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch items: ${itemsResponse.statusText}`);
      }
      const data = await itemsResponse.json();
      spItems.push(...(data.value || []));
      itemsUrl = data['@odata.nextLink'] || null;
    }

    log(`Fetched ${spItems.length} items from SharePoint.`);

    // 3. Connect to Supabase DB using Service Role client to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Load lookup caches from database
    log("Loading lookup data from database...");
    
    // A. Companies cache
    const { data: dbCompanies, error: compErr } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('id, nome')
      .eq('is_active', true);
    if (compErr) throw compErr;
    const companiesMap = new Map<string, string>();
    for (const c of dbCompanies) {
      companiesMap.set(c.nome.toLowerCase().trim(), c.id);
    }

    // B. Clients cache (paginated just in case)
    let dbClients: any[] = [];
    let start = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .schema('core_common')
        .from('clients')
        .select('codigo, legal_name, trade_name')
        .range(start, start + limit - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      dbClients = dbClients.concat(data);
      if (data.length < limit) break;
      start += limit;
    }
    const clientsMap = new Map<string, string>();
    for (const c of dbClients) {
      const cleanLegal = c.legal_name?.toLowerCase().trim() || "";
      const cleanTrade = c.trade_name?.toLowerCase().trim() || "";
      if (cleanLegal) clientsMap.set(cleanLegal, c.codigo);
      if (cleanTrade) clientsMap.set(cleanTrade, c.codigo);
    }

    // C. Financial categories cache
    const { data: dbCategories, error: catErr } = await supabase
      .from('financeiro_categorias')
      .select('id, nome');
    if (catErr) throw catErr;
    const categoriesMap = new Map<string, string>();
    for (const c of dbCategories) {
      categoriesMap.set(c.nome.toLowerCase().trim(), c.id);
    }

    // D. Obras cache
    const { data: dbObras, error: obrasErr } = await supabase
      .from('obras')
      .select('id, nome');
    if (obrasErr) throw obrasErr;
    const obrasMap = new Map<string, string>();
    for (const o of dbObras) {
      obrasMap.set(o.nome.toLowerCase().trim(), o.id);
    }

    log(`Loaded caches: ${companiesMap.size} companies, ${dbClients.length} clients, ${categoriesMap.size} categories, ${obrasMap.size} Obras.`);

    // 5. Map SharePoint items to Database rows
    const rowsToUpsert: any[] = [];
    for (const item of spItems) {
      const f = item.fields || {};
      const spId = parseInt(f.id, 10);
      if (isNaN(spId)) continue;

      // Resolve company ID to look up client code correctly
      const spEmpresa = f.Empresa || "";
      const empId = companiesMap.get(spEmpresa.toLowerCase().trim()) || null;

      // Resolve client code by matching client name
      const spCliente = f.Cliente || "";
      let resolvedClientCode = null;
      if (spCliente) {
        resolvedClientCode = clientsMap.get(spCliente.toLowerCase().trim()) || null;
      }

      // Resolve category ID
      const spCatReceita = f.Cat_receita || "";
      const resolvedCatId = categoriesMap.get(spCatReceita.toLowerCase().trim()) || null;

      // Resolve Obra ID
      const spObra = f.Obra || "";
      const resolvedObraId = obrasMap.get(spObra.toLowerCase().trim()) || null;

      const row = {
        sp_id: spId,
        sp_modified: f.Modified ? new Date(f.Modified).toISOString() : null,
        empresa: spEmpresa,
        cod_cliente: resolvedClientCode,
        cliente: spCliente,
        obra: f.Obra || null,
        periodo_fat: f.Periodo_fat || null,
        data_emissao: f.Data_emissao ? String(f.Data_emissao) : null,
        competencia: f.Competencia ? String(f.Competencia) : null,
        dt_venc: f.Dt_venc ? String(f.Dt_venc) : null,
        moeda: f.Moeda || null,
        valot_total: f.Valot_total !== undefined ? String(f.Valot_total) : null,
        status: f.Status || null,
        origem: f.Origem || null,
        cat_receita: spCatReceita,
        centro_custo: f.Centro_Custo || null,
        conta_contab: f.Conta_contab || null,
        num_doc: f.Num_doc ? String(f.Num_doc) : null,
        obs: f.Obs || null,
        creado: f.Created ? String(f.Created) : null,
        creado_por: item.createdBy?.user?.displayName || null,
        banco: f.Banco || null,
        comentarios: f.comentarios || null,
        form_receb: f.Form_receb || null,
        comisao_taxa: f.comisao_taxa !== undefined ? String(f.comisao_taxa) : null,
        hist_valor_parcial: f.Hist_ValorParcial || null,
        integral_parcial: f.Integral_parcial || null,
        prev_pag: f.prev_pag ? String(f.prev_pag) : null,
        saldo_a_pagar: f.Saldo_a_pagar !== undefined ? String(f.Saldo_a_pagar) : null,
        tipo_cobros: f.Tipo_cobros || null,
        valor_parcial: f.Valor_parcial !== undefined ? String(f.Valor_parcial) : null,
        obs_recebimento: f.obs_recebimento || null,
        dt_recebimento: f.dt_recebimento ? String(f.dt_recebimento) : null,
        modificado: f.Modified ? String(f.Modified) : null,
        modificado_por: item.lastModifiedBy?.user?.displayName || null,
        categoria_id: resolvedCatId,
        obra_id: resolvedObraId
      };

      rowsToUpsert.push(row);
    }

    log(`Mapped ${rowsToUpsert.length} records. Performing bulk upsert...`);

    // 6. Perform bulk upsert in batches of 1000
    let upsertedCount = 0;
    const batchSize = 1000;
    for (let i = 0; i < rowsToUpsert.length; i += batchSize) {
      const batch = rowsToUpsert.slice(i, i + batchSize);
      const { error: upsertErr } = await supabase
        .from('contas_receber')
        .upsert(batch, { onConflict: 'sp_id' });
      
      if (upsertErr) {
        throw new Error(`Failed to bulk upsert batch at index ${i}: ${upsertErr.message}`);
      }
      upsertedCount += batch.length;
      log(`  Upserted batch of ${batch.length} items (${upsertedCount}/${rowsToUpsert.length}).`);
    }

    // 7. Sync relational payments & timeline observations
    log("Syncing partial payment history & comments to relational tables...");
    const spIdsWithHistory = rowsToUpsert
      .filter(r => r.hist_valor_parcial || r.comentarios)
      .map(r => r.sp_id);

    if (spIdsWithHistory.length > 0) {
      // Fetch DB ids for these sp_ids in batches of 1000
      for (let i = 0; i < spIdsWithHistory.length; i += 1000) {
        const batchSpIds = spIdsWithHistory.slice(i, i + 1000);
        const { data: dbRows, error: dbRowsErr } = await supabase
          .from('contas_receber')
          .select('id, sp_id, hist_valor_parcial, comentarios')
          .in('sp_id', batchSpIds);

        if (!dbRowsErr && dbRows) {
          for (const row of dbRows) {
            const contaId = row.id;

            // Process hist_valor_parcial
            if (row.hist_valor_parcial) {
              let histList: any[] = [];
              try {
                histList = typeof row.hist_valor_parcial === 'string' ? JSON.parse(row.hist_valor_parcial) : row.hist_valor_parcial;
              } catch (_) {}

              if (Array.isArray(histList)) {
                for (const p of histList) {
                  const valor = typeof p.ValorParcial === 'number' ? p.ValorParcial : parseFloat(String(p.ValorParcial || 0).replace(/\./g, '').replace(',', '.'));
                  if (isNaN(valor) || valor <= 0) continue;

                  let dataReceb = p.DataPagamento || p.data_pagamento || p.data || new Date().toISOString();
                  if (typeof dataReceb === 'string' && dataReceb.includes('T')) {
                    dataReceb = dataReceb.split('T')[0];
                  }

                  const formaPag = p.Desc || p.forma_pagamento || 'Transferencia';
                  const usuario = p.Usuario || p.usuario || 'Sistema';

                  // Insert payment if missing
                  const { data: existingPag } = await supabase
                    .from('contas_receber_pagamentos')
                    .select('id')
                    .eq('conta_receber_id', contaId)
                    .eq('valor', valor)
                    .eq('data_recebimento', dataReceb)
                    .maybeSingle();

                  if (!existingPag) {
                    await supabase.from('contas_receber_pagamentos').insert({
                      conta_receber_id: contaId,
                      valor: valor,
                      data_recebimento: dataReceb,
                      forma_pagamento: formaPag,
                      tipo_recebimento: 'Parcial'
                    });
                  }

                  // Insert timeline note if missing
                  const formattedVal = valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const obsDesc = `Recebimento Parcial registrado (Histórico SharePoint): € ${formattedVal} (Forma: ${formaPag})`;

                  const { data: existingObs } = await supabase
                    .from('cobranca_observacoes')
                    .select('id')
                    .eq('conta_receber_id', contaId)
                    .ilike('descricao', `%€ ${formattedVal}%`)
                    .maybeSingle();

                  if (!existingObs) {
                    await supabase.from('cobranca_observacoes').insert({
                      conta_receber_id: contaId,
                      data: new Date(dataReceb).toISOString(),
                      usuario: usuario,
                      tipo: 'Recebimento',
                      descricao: obsDesc
                    });
                  }
                }
              }
            }

            // Process comentarios
            if (row.comentarios) {
              let comList: any[] = [];
              try {
                comList = typeof row.comentarios === 'string' ? JSON.parse(row.comentarios) : row.comentarios;
              } catch (_) {}

              if (Array.isArray(comList)) {
                for (const c of comList) {
                  const desc = (c.Desc || c.desc || c.descricao || c.texto || '').trim();
                  if (!desc) continue;

                  let dataObs = c.Data || c.data || new Date().toISOString();
                  if (typeof dataObs === 'string' && !dataObs.includes('T') && dataObs.length === 10) {
                    dataObs = `${dataObs}T12:00:00.000Z`;
                  }
                  const usuario = c.Usuario || c.usuario || 'Sistema';

                  const { data: existingObs } = await supabase
                    .from('cobranca_observacoes')
                    .select('id')
                    .eq('conta_receber_id', contaId)
                    .eq('descricao', desc)
                    .maybeSingle();

                  if (!existingObs) {
                    await supabase.from('cobranca_observacoes').insert({
                      conta_receber_id: contaId,
                      data: new Date(dataObs).toISOString(),
                      usuario: usuario,
                      tipo: 'Anotación Manual',
                      descricao: desc
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    log("SharePoint ContasReceber Bulk Sync completed successfully!");

    return new Response(JSON.stringify({
      success: true,
      synced_records: rowsToUpsert.length,
      execution_logs: executionLogs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err: any) {
    log(`FATAL ERROR during sync: ${err.message}`);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message,
      execution_logs: executionLogs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
