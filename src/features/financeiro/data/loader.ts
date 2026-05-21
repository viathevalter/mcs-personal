import { supabase } from '@/shared/supabase/client';
import { parseEuroNumber, parseDate } from '../lib/utils';
import type { ContasReceber, Cliente, EnrichedTitulo } from '../types';

export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*');

  if (error) {
    console.error('Error fetching clientes:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    CodCliente: row.cod_cliente || '',
    RazonSocial: row.razon_social || '',
    NombreComercial: row.nombre_comercial || '',
    EmailCobros: row.email_cobros || '',
    TelefonoCobros: row.telefono_cobros || '',
    RespCobros: row.resp_cobros || '',
    TpPrazosPg: row.tp_prazos_pg || '',
    Pais: row.pais || '',
    Provincia: row.provincia || '',
    Municipio: row.municipio || '',
    Domicilio: row.domicilio || '',
  })).filter((c: Cliente) => c.CodCliente);
}

export async function fetchContasReceber(): Promise<ContasReceber[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*')
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
      Creado: parseDate(row.creado),
      Creado_por: row.creado_por || '',
      Modificado: parseDate(row.modificado),
      Modificado_por: row.modificado_por || ''
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
