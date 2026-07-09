const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  // Handles DD/MM/YYYY or DD-MM-YYYY format
  const parts = cleanStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseEuroNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const clean = val.replace(/[^\d,\.\-]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

async function fetchClientes() {
  console.log('fetchClientes starting...');
  const { data, error } = await supabase
    .schema('core_common')
    .from('clients')
    .select('*');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
  console.log('fetchClientes finished. Loaded', data.length);
  return data;
}

async function fetchContasReceber() {
  console.log('fetchContasReceber starting...');
  try {
    console.log('Triggering RPC...');
    await supabase.rpc('fn_update_overdue_cobros');
    console.log('RPC trigger completed.');
  } catch (rpcErr) {
    console.error('Failed to trigger fn_update_overdue_cobros RPC:', rpcErr);
  }

  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    console.log(`Fetching page ${page}...`);
    let { data, error } = await supabase
      .from('contas_receber')
      .select('*, contas_receber_pagamentos(valor, data_recebimento, tipo_recebimento)')
      .order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.warn('Joint fetch failed, falling back to single table query...', error.message);
      const fallback = await supabase
        .from('contas_receber')
        .select('*')
        .order('id', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error fetching contas_receber:', error);
      break;
    }

    if (!data || data.length === 0) {
      console.log('No more data, breaking.');
      break;
    }

    console.log(`Page ${page} fetched:`, data.length, 'records.');
    allData = allData.concat(data);

    if (data.length < pageSize) {
      console.log('Last page loaded.');
      break;
    }
    page++;
  }

  console.log('Mapping results...');
  return allData.map((row, index) => {
    let histJSON = [];
    const rawJson = row.hist_valor_parcial;
    if (rawJson) {
      try {
        histJSON = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      } catch (e) {}
    }

    const valTotal = parseEuroNumber(row.valot_total);
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

async function run() {
  console.log('Starting fetchEnrichedData simulation...');
  const start = Date.now();
  
  const [clientes, contas] = await Promise.all([
    fetchClientes(),
    fetchContasReceber()
  ]);

  console.log(`fetchEnrichedData completed in ${Date.now() - start}ms.`);
  console.log('Clientes:', clientes.length);
  console.log('Contas Receber:', contas.length);
}

run();
