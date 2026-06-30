import { supabase } from '@/shared/supabase/client';
import { parseEuroNumber, parseDate } from '../lib/utils';
import type { 
  ContasReceber, 
  Cliente, 
  EnrichedTitulo, 
  FinanceiroCategoria, 
  Obra, 
  Banco, 
  Recebimento, 
  CobrancaObservacao,
  ContasPagar,
  ContasPagarPagamento,
  OrdemPagamento,
  OrdemPagamentoItem,
  MovimentoPago
} from '../types';

export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .schema('core_common')
    .from('clients')
    .select('*');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    CodCliente: row.codigo || '',
    RazonSocial: row.legal_name || '',
    NombreComercial: row.trade_name || '',
    EmailCobros: row.billing_email || row.email || '',
    TelefonoCobros: row.phone || '',
    RespCobros: '',
    TpPrazosPg: '',
    Pais: '',
    Provincia: '',
    Municipio: '',
    Domicilio: '',
  })).filter((c: Cliente) => c.CodCliente);
}

export async function fetchModernEmpresas(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .schema('core_common')
    .from('empresas')
    .select('id, nome')
    .eq('is_active', true)
    .order('nome');

  if (error) {
    console.error('Error fetching core_common.empresas:', error);
    return [];
  }
  return data || [];
}

export async function fetchContasReceber(): Promise<ContasReceber[]> {
  try {
    await supabase.rpc('fn_update_overdue_cobros');
  } catch (rpcErr) {
    console.error('Failed to trigger fn_update_overdue_cobros RPC:', rpcErr);
  }

  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*, contas_receber_pagamentos(valor, data_recebimento, tipo_recebimento)')
      .order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching contas_receber:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);

    if (data.length < pageSize) break;
    page++;
  }

  return allData.map((row: any, index: number) => {
    // Parse Hist_ValorParcial safely
    let histJSON = [];
    const rawJson = row.hist_valor_parcial;
    if (rawJson) {
      try {
        // Check if it's already an object (JSONB) or string
        histJSON = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      } catch (e) {
        // console.warn('JSON Parse warning in Row', index, rawJson);
      }
    }

    const valTotal = parseEuroNumber(row.valot_total);
    // If Saldo_a_pagar is empty string/null, default to Total
    const rawSaldo = row.saldo_a_pagar;
    const saldo = (rawSaldo === '' || rawSaldo === null || rawSaldo === undefined) ? valTotal : parseEuroNumber(rawSaldo);

    return {
      id: row.id?.toString() || `generated-${index}`,
      Empresa: row.empresa || '',
      CodCliente: row.cod_cliente || '',
      Cliente: row.cliente || '',
      Obra: row.obra || '',
      Num_doc: row.num_doc || '',
      periodo_fat: row.periodo_fat || '',
      Data_emissao: parseDate(row.data_emissao),
      Dt_venc: parseDate(row.dt_venc),
      dt_recebimento: parseDate(row.dt_recebimento),
      Valot_total: valTotal,
      Saldo_a_pagar: saldo,
      Valor_parcial: parseEuroNumber(row.valor_parcial),
      Status: row.status || 'Desconhecido',
      Integral_parcial: row.integral_parcial || '',
      Banco: row.banco || '',
      Form_receb: row.form_receb || '',
      Tipo_cobros: row.tipo_cobros || '',
      comisao_taxa: row.comisao_taxa || '',
      Obs: row.obs || '',
      comentarios: row.comentarios || '',
      obs_recebimento: row.obs_recebimento || '',
      Hist_ValorParcial: histJSON,
      pagamentos_reais: row.contas_receber_pagamentos || [],
      Creado: parseDate(row.creado),
      Creado_por: row.creado_por || '',
      Modificado: parseDate(row.modificado),
      Modificado_por: row.modificado_por || '',
      fatura_id: row.fatura_id || null
    };
  });
}

export async function fetchEnrichedData(): Promise<EnrichedTitulo[]> {
  try {
    const [clientes, contas] = await Promise.all([
      fetchClientes(),
      fetchContasReceber()
    ]);

    // Create a map for faster lookup
    const clienteMap = new Map<string, Cliente>();
    clientes.forEach(c => {
      if (c.CodCliente) clienteMap.set(c.CodCliente, c);
    });

    return contas.map(conta => {
      const clienteInfo = clienteMap.get(conta.CodCliente) || undefined;
      return {
        ...conta,
        clienteInfo
      };
    });
  } catch (error) {
    console.error("Failed to load enriched data", error);
    return [];
  }
}

// Deprecated synchronous loadData, keeping it temporarily if needed but making it throw or return empty to force update
export function loadData(): EnrichedTitulo[] {
  console.warn("loadData() is deprecated. Use fetchEnrichedData() instead.");
  return [];
}

export async function fetchCategorias(): Promise<FinanceiroCategoria[]> {
  const { data, error } = await supabase.from('financeiro_categorias').select('*').order('nome');
  if (error) {
    console.error('Error fetching categorias:', error);
    return [];
  }
  return data || [];
}

export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await supabase.from('obras').select('*').order('nome');
  if (error) {
    console.error('Error fetching obras:', error);
    return [];
  }
  return data || [];
}

export async function fetchBancos(): Promise<Banco[]> {
  const { data, error } = await supabase.from('bancos').select('*').order('nome_banco');
  if (error) {
    console.error('Error fetching bancos:', error);
    return [];
  }
  return data || [];
}

export async function saveBanco(banco: Partial<Banco>): Promise<{ success: boolean; error?: any }> {
  try {
    if (banco.id) {
      const { error } = await supabase.from('bancos').update(banco).eq('id', banco.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bancos').insert([banco]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    console.error("Error saving banco:", err);
    return { success: false, error: err };
  }
}

export async function fetchRecebimentos(contaReceberId: string): Promise<Recebimento[]> {
  const { data, error } = await supabase.from('contas_receber_pagamentos').select('*').eq('conta_receber_id', contaReceberId).order('data_recebimento', { ascending: false });
  if (error) {
    console.error('Error fetching recebimentos:', error);
    return [];
  }
  return data || [];
}

export async function saveRecebimento(recebimento: Partial<Recebimento>): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('contas_receber_pagamentos').insert([recebimento]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error saving recebimento:", err);
    return { success: false, error: err };
  }
}

export async function fetchObservacoes(contaReceberId: string): Promise<CobrancaObservacao[]> {
  const { data, error } = await supabase.from('cobranca_observacoes').select('*').eq('conta_receber_id', contaReceberId).order('data', { ascending: false });
  if (error) {
    console.error('Error fetching observacoes:', error);
    return [];
  }
  return data || [];
}

export async function saveObservacao(obs: Partial<CobrancaObservacao>): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('cobranca_observacoes').insert([obs]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error saving observacao:", err);
    return { success: false, error: err };
  }
}

export async function createContaReceber(data: Partial<ContasReceber>): Promise<{ success: boolean; error?: any }> {
  try {
    const dbData = {
      empresa: data.Empresa || null,
      cod_cliente: data.CodCliente || null,
      cliente: data.Cliente || null,
      obra: data.Obra || null,
      num_doc: data.Num_doc || null,
      data_emissao: data.Data_emissao ? new Date(data.Data_emissao).toISOString() : null,
      dt_venc: data.Dt_venc ? new Date(data.Dt_venc).toISOString() : null,
      valot_total: data.Valot_total?.toString() || null,
      saldo_a_pagar: data.Saldo_a_pagar?.toString() || null,
      status: data.Status || 'A vencer',
      categoria_id: data.categoria_id || null,
      departamento_id: data.departamento_id || null,
      obra_id: data.obra_id || null,
      anexo_url: data.anexo_url || null,
      fatura_id: data.fatura_id || null,
      creado: new Date().toISOString()
    };

    const { error } = await supabase.from('contas_receber').insert([dbData]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error creating conta:", err);
    return { success: false, error: err };
  }
}

export async function updateContaReceber(id: string, data: Partial<ContasReceber>): Promise<{ success: boolean; error?: any }> {
  try {
    const dbData: any = {
      modificado: new Date().toISOString()
    };
    if (data.Empresa !== undefined) dbData.empresa = data.Empresa;
    if (data.CodCliente !== undefined) dbData.cod_cliente = data.CodCliente;
    if (data.Cliente !== undefined) dbData.cliente = data.Cliente;
    if (data.Obra !== undefined) dbData.obra = data.Obra;
    if (data.Num_doc !== undefined) dbData.num_doc = data.Num_doc;
    if (data.Data_emissao !== undefined) dbData.data_emissao = data.Data_emissao ? new Date(data.Data_emissao).toISOString() : null;
    if (data.Dt_venc !== undefined) dbData.dt_venc = data.Dt_venc ? new Date(data.Dt_venc).toISOString() : null;
    if (data.Valot_total !== undefined) dbData.valot_total = data.Valot_total?.toString() || null;
    if (data.Saldo_a_pagar !== undefined) dbData.saldo_a_pagar = data.Saldo_a_pagar?.toString() || null;
    if (data.Status !== undefined) dbData.status = data.Status;
    if (data.Integral_parcial !== undefined) dbData.integral_parcial = data.Integral_parcial;
    if (data.categoria_id !== undefined) dbData.categoria_id = data.categoria_id;
    if (data.departamento_id !== undefined) dbData.departamento_id = data.departamento_id;
    if (data.obra_id !== undefined) dbData.obra_id = data.obra_id;
    if (data.anexo_url !== undefined) dbData.anexo_url = data.anexo_url;
    if (data.fatura_id !== undefined) dbData.fatura_id = data.fatura_id;

    const { error } = await supabase.from('contas_receber').update(dbData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error updating conta:", err);
    return { success: false, error: err };
  }
}

export async function deleteContaReceber(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('contas_receber').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error deleting conta:", err);
    return { success: false, error: err };
  }
}

// --- CONTAS A PAGAR (PAGOS) API ---

export async function fetchContasPagar(): Promise<ContasPagar[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('contas_pagar')
      .select('*, contas_pagar_pagamentos(valor, data_pagamento, forma_pagamento)')
      .order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching contas_pagar:', error);
      break;
    }

    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  return allData.map((row: any, index: number) => {
    let histJSON = [];
    const rawJson = row.hist_valor_parcial;
    if (rawJson) {
      try {
        histJSON = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      } catch (e) {}
    }

    const valTotal = parseEuroNumber(row.valor_total || row.valot_total);
    const rawSaldo = row.saldo_a_pagar;
    const saldo = (rawSaldo === '' || rawSaldo === null || rawSaldo === undefined) ? valTotal : parseEuroNumber(rawSaldo);

    return {
      id: row.id?.toString() || `generated-${index}`,
      sp_id: row.sp_id,
      sp_modified: parseDate(row.sp_modified),
      Empresa: row.empresa || '',
      CodProvedor: row.cod_provedor || '',
      Provedor: row.provedor || '',
      Obra: row.obra || '',
      periodo_fat: row.periodo_fat || '',
      Data_emissao: parseDate(row.data_emissao),
      competencia: row.competencia || '',
      Dt_venc: parseDate(row.dt_venc),
      Moeda: row.moeda || 'EUR',
      Valor_total: valTotal,
      Status: row.status || 'A vencer',
      origem: row.origem || '',
      cat_despesa: row.cat_despesa || '',
      centro_custo: row.centro_custo || '',
      conta_contab: row.conta_contab || '',
      Num_doc: row.num_doc || '',
      Obs: row.obs || '',
      Creado: parseDate(row.creado),
      Creado_por: row.creado_por || '',
      Banco: row.banco || '',
      comentarios: row.comentarios || '',
      form_pag: row.form_pag || '',
      hist_valor_parcial: histJSON,
      integral_parcial: row.integral_parcial || 'Integral',
      prev_pag: row.prev_pag || '',
      saldo_a_pagar: saldo,
      valor_parcial: parseEuroNumber(row.valor_parcial),
      obs_pagamento: row.obs_pagamento || '',
      dt_pagamento: parseDate(row.dt_pagamento),
      Modificado: parseDate(row.modificado),
      Modificado_por: row.modificado_por || '',
      categoria_id: row.categoria_id,
      departamento_id: row.departamento_id,
      obra_id: row.obra_id,
      anexo_url: row.anexo_url,
      ordem_pagamento_id: row.ordem_pagamento_id,
      ordem_pagamento_item_id: row.ordem_pagamento_item_id,
      pagamentos_reais: (row.contas_pagar_pagamentos || []).map((p: any) => ({
        id: p.id,
        conta_pagar_id: p.conta_pagar_id?.toString(),
        valor: Number(p.valor) || 0,
        data_pagamento: p.data_pagamento,
        forma_pagamento: p.forma_pagamento
      }))
    };
  });
}

export async function createContaPagar(data: Partial<ContasPagar>): Promise<{ success: boolean; error?: any }> {
  try {
    const dbData = {
      empresa: data.Empresa || null,
      cod_provedor: data.CodProvedor || null,
      provedor: data.Provedor || null,
      obra: data.Obra || null,
      num_doc: data.Num_doc || null,
      data_emissao: data.Data_emissao ? new Date(data.Data_emissao).toISOString().split('T')[0] : null,
      dt_venc: data.Dt_venc ? new Date(data.Dt_venc).toISOString().split('T')[0] : null,
      valor_total: data.Valor_total?.toString() || null,
      saldo_a_pagar: data.Saldo_a_pagar?.toString() || null,
      status: data.Status || 'A vencer',
      categoria_id: data.categoria_id || null,
      departamento_id: data.departamento_id || null,
      obra_id: data.obra_id || null,
      anexo_url: data.anexo_url || null,
      ordem_pagamento_id: data.ordem_pagamento_id || null,
      ordem_pagamento_item_id: data.ordem_pagamento_item_id || null,
      creado: new Date().toISOString()
    };

    const { error } = await supabase.from('contas_pagar').insert([dbData]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error creating contas_pagar:", err);
    return { success: false, error: err };
  }
}

export async function updateContaPagar(id: string, data: Partial<ContasPagar>): Promise<{ success: boolean; error?: any }> {
  try {
    const dbData: any = {
      modificado: new Date().toISOString()
    };
    if (data.Empresa !== undefined) dbData.empresa = data.Empresa;
    if (data.CodProvedor !== undefined) dbData.cod_provedor = data.CodProvedor;
    if (data.Provedor !== undefined) dbData.provedor = data.Provedor;
    if (data.Obra !== undefined) dbData.obra = data.Obra;
    if (data.Num_doc !== undefined) dbData.num_doc = data.Num_doc;
    if (data.Data_emissao !== undefined) dbData.data_emissao = data.Data_emissao ? new Date(data.Data_emissao).toISOString().split('T')[0] : null;
    if (data.Dt_venc !== undefined) dbData.dt_venc = data.Dt_venc ? new Date(data.Dt_venc).toISOString().split('T')[0] : null;
    if (data.Valor_total !== undefined) dbData.valor_total = data.Valor_total?.toString();
    if (data.Saldo_a_pagar !== undefined) dbData.saldo_a_pagar = data.Saldo_a_pagar?.toString();
    if (data.Status !== undefined) dbData.status = data.Status;
    if (data.integral_parcial !== undefined) dbData.integral_parcial = data.integral_parcial;
    if (data.categoria_id !== undefined) dbData.categoria_id = data.categoria_id;
    if (data.departamento_id !== undefined) dbData.departamento_id = data.departamento_id;
    if (data.obra_id !== undefined) dbData.obra_id = data.obra_id;
    if (data.anexo_url !== undefined) dbData.anexo_url = data.anexo_url;

    const { error } = await supabase.from('contas_pagar').update(dbData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error updating contas_pagar:", err);
    return { success: false, error: err };
  }
}

export async function deleteContaPagar(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error deleting contas_pagar:", err);
    return { success: false, error: err };
  }
}

export async function fetchPagamentos(contaPagarId: string): Promise<ContasPagarPagamento[]> {
  const { data, error } = await supabase
    .from('contas_pagar_pagamentos')
    .select('*')
    .eq('conta_pagar_id', contaPagarId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Error fetching contas_pagar_pagamentos:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    conta_pagar_id: row.conta_pagar_id?.toString(),
    valor: Number(row.valor) || 0,
    data_pagamento: row.data_pagamento,
    forma_pagamento: row.forma_pagamento,
    tipo_pagamento: row.tipo_pagamento,
    banco_id: row.banco_id,
    criado_por: row.criado_por,
    criado_em: row.criado_em
  }));
}

export async function savePagamento(pagamento: Partial<ContasPagarPagamento>): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: dbPagar, error: fetchErr } = await supabase
      .from('contas_pagar')
      .select('valor_total, saldo_a_pagar')
      .eq('id', pagamento.conta_pagar_id)
      .single();

    if (fetchErr) throw fetchErr;

    const total = parseEuroNumber(dbPagar.valor_total);
    const currentSaldo = parseEuroNumber(dbPagar.saldo_a_pagar !== null ? dbPagar.saldo_a_pagar : total);
    const newSaldo = Math.max(0, currentSaldo - (pagamento.valor || 0));

    const status = newSaldo <= 0 ? 'Pago' : 'Parcial';
    const integral_parcial = newSaldo <= 0 && currentSaldo === total ? 'Integral' : 'Parcial';

    const { error: insertErr } = await supabase.from('contas_pagar_pagamentos').insert([pagamento]);
    if (insertErr) throw insertErr;

    const { error: updateErr } = await supabase
      .from('contas_pagar')
      .update({
        saldo_a_pagar: newSaldo.toString(),
        status,
        integral_parcial,
        dt_pagamento: pagamento.data_pagamento,
        obs_pagamento: pagamento.forma_pagamento
      })
      .eq('id', pagamento.conta_pagar_id);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (err) {
    console.error("Error saving pagamento:", err);
    return { success: false, error: err };
  }
}

// BATCH PAYMENT (BAIXA EM LOTE)
export async function savePagamentoLote(
  ids: string[],
  bancoId: string,
  dataPagamento: string,
  formaPagamento: string,
  criadoPor: string
): Promise<{ success: boolean; error?: any }> {
  try {
    for (const id of ids) {
      const { data: dbPagar, error: fetchErr } = await supabase
        .from('contas_pagar')
        .select('valor_total, saldo_a_pagar')
        .eq('id', id)
        .single();

      if (fetchErr) continue;

      const total = parseEuroNumber(dbPagar.valor_total);
      const currentSaldo = parseEuroNumber(dbPagar.saldo_a_pagar !== null ? dbPagar.saldo_a_pagar : total);
      if (currentSaldo <= 0) continue; // Already paid

      // Create payment record
      const pagamento: Partial<ContasPagarPagamento> = {
        conta_pagar_id: id,
        valor: currentSaldo,
        data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento,
        tipo_pagamento: 'Total',
        banco_id: bancoId,
        criado_por: criadoPor
      };

      await supabase.from('contas_pagar_pagamentos').insert([pagamento]);

      // Update payable status
      await supabase
        .from('contas_pagar')
        .update({
          saldo_a_pagar: '0',
          status: 'Pago',
          integral_parcial: 'Integral',
          dt_pagamento: dataPagamento,
          obs_pagamento: formaPagamento
        })
        .eq('id', id);
    }
    return { success: true };
  } catch (err) {
    console.error("Error in batch payment:", err);
    return { success: false, error: err };
  }
}

// --- ORDENS DE PAGAMENTO API ---

export async function fetchOrdensPagamento(): Promise<OrdemPagamento[]> {
  const { data, error } = await supabase
    .schema('core_finance')
    .from('ordens_pagamento')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ordens_pagamento:', error);
    return [];
  }
  return data || [];
}

export async function fetchOrdemPagamentoDetails(id: string): Promise<OrdemPagamento | null> {
  const { data: header, error: headerErr } = await supabase
    .schema('core_finance')
    .from('ordens_pagamento')
    .select('*')
    .eq('id', id)
    .single();

  if (headerErr) {
    console.error('Error fetching OP header:', headerErr);
    return null;
  }

  const { data: itens, error: itensErr } = await supabase
    .schema('core_finance')
    .from('ordens_pagamento_itens')
    .select('*')
    .eq('ordem_pagamento_id', id)
    .order('cod_orden_pago_item');

  if (itensErr) {
    console.error('Error fetching OP items:', itensErr);
  }

  const { data: movimentos, error: movsErr } = await supabase
    .schema('core_finance')
    .from('movimentos_pagos')
    .select('*')
    .eq('ordem_pagamento_id', id)
    .order('criado_em', { ascending: true });

  if (movsErr) {
    console.error('Error fetching OP movements:', movsErr);
  }

  return {
    ...header,
    itens: itens || [],
    movimentos: movimentos || []
  };
}

export async function createOrdemPagamento(
  ordem: Partial<OrdemPagamento>,
  itens: Partial<OrdemPagamentoItem>[]
): Promise<{ success: boolean; data?: OrdemPagamento; error?: any }> {
  try {
    // 1. Generate CodOrdenPago (OP-XXXXXX)
    const { data: countData, error: countErr } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .select('id', { count: 'exact', head: true });

    if (countErr) throw countErr;
    const nextNum = (countData?.length || 0) + 121; // Match starting ID of CSV
    const codOrdenPago = `OP-${LPAD(nextNum.toString(), 6, '0')}`;

    // 2. Insert header
    const headerInsert = {
      ...ordem,
      cod_orden_pago: codOrdenPago,
      qtde_itens: itens.length,
      status: 'rascunho'
    };

    const { data: newOrdem, error: insertErr } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .insert([headerInsert])
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 3. Insert items
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      const itemNum = i + 1;
      const codOrdenPagoItem = `${codOrdenPago}-IT-${LPAD(itemNum.toString(), 3, '0')}`;

      const itemInsert = {
        ...item,
        ordem_pagamento_id: newOrdem.id,
        cod_orden_pago: codOrdenPago,
        cod_orden_pago_item: codOrdenPagoItem,
        status_item: 'Pendente'
      };

      await supabase.schema('core_finance').from('ordens_pagamento_itens').insert([itemInsert]);
    }

    // 4. Create initial movement log
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email || 'sistema';

    const movimento: Partial<MovimentoPago> = {
      ordem_pagamento_id: newOrdem.id,
      cod_mov: `MOV-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(2, 14)}`,
      tipo_mov: 'Orden Generada',
      estado_mov: 'Orden Gerada',
      valor_pago: newOrdem.valor,
      observaciones: newOrdem.observaciones || 'Ordem de pagamento inicializada.',
      criado_por: email
    };

    await supabase.schema('core_finance').from('movimentos_pagos').insert([movimento]);

    return { success: true, data: newOrdem };
  } catch (err) {
    console.error("Error creating Ordem de Pagamento:", err);
    return { success: false, error: err };
  }
}

export async function updateOrdemPagamentoStatus(
  id: string,
  status: 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'pago' | 'rejeitado',
  comments: string,
  aprovadorId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email || 'sistema';

    const updateObj: any = { status, updated_at: new Date().toISOString() };
    if (status === 'aprovado' && aprovadorId) {
      updateObj.aprovador_id = aprovadorId;
      updateObj.fecha_aprobacion = new Date().toISOString();
      updateObj.observaciones_financeiro = comments;
    } else if (status === 'rejeitado') {
      updateObj.observaciones_financeiro = comments;
    }

    const { error: updateErr } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update(updateObj)
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Create movement log
    let tipo_mov = 'Atualização';
    let estado_mov = status;
    if (status === 'aguardando_aprovacao') {
      tipo_mov = 'Devolución para aprovación';
      estado_mov = 'Aguardando aprovação';
    } else if (status === 'rejeitado') {
      tipo_mov = 'Devolución para revisão';
      estado_mov = 'Aguardando revisão';
    } else if (status === 'aprovado') {
      return { success: true };
    }

    const movimento: Partial<MovimentoPago> = {
      ordem_pagamento_id: id,
      cod_mov: `MOV-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(2, 14)}`,
      tipo_mov,
      estado_mov,
      observaciones: comments,
      criado_por: email
    };

    await supabase.schema('core_finance').from('movimentos_pagos').insert([movimento]);

    return { success: true };
  } catch (err) {
    console.error("Error updating OP status:", err);
    return { success: false, error: err };
  }
}

// Helpers
function LPAD(str: string, length: number, char: string): string {
  return str.padStart(length, char);
}
