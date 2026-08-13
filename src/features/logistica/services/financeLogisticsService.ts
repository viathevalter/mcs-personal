import { supabase } from '@/shared/supabase/client';

export interface PagoAlojamento {
  id: string;
  codigo_pago?: string;
  contrato_id?: string;
  alojamento_id?: string;
  provedor_id?: string;
  ordem_pagamento_id?: string;
  tipo_pago: 'Aluguel' | 'Fianza_Saida' | 'Fianza_Devolucion' | 'Suministro';
  status_pago: 'Previsto' | 'En Orden' | 'Aprobado' | 'Pago' | 'Cancelado';
  periodo_competencia?: string;
  data_vencimento?: string;
  valor_previsto: number;
  moeda?: string;
  num_parcela?: number;
  observacoes?: string;
  alojamento?: any;
  provedor?: any;
  contrato?: any;
}

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export const financeLogisticsService = {
  async fetchPagos(): Promise<PagoAlojamento[]> {
    const client = getClient();
    const { data, error } = await client
      .from('pagos_alojamento')
      .select(`
        *,
        alojamentos (*),
        provedores (*)
      `)
      .order('data_vencimento', { ascending: true });

    if (error) return [];
    return (data || []).map((p: any) => ({
      ...p,
      alojamento: p.alojamentos,
      provedor: p.provedores
    }));
  },

  async gerarOrdemPagamento(payload: {
    contrato_id?: string;
    alojamento_id?: string;
    provedor_id?: string;
    tipo_pago: 'Aluguel' | 'Suministro' | 'Fianza_Saida';
    valor: number;
    data_vencimento: string;
    observacoes?: string;
    periodo_competencia?: string;
  }): Promise<any> {
    const financeClient = (supabase as any).schema ? (supabase as any).schema('core_finance') : supabase;
    const logClient = getClient();

    // 1. Inserir em core_finance.ordens_pagamento
    const codOP = `OP-${Date.now().toString().slice(-6)}`;
    const { data: opData, error: opErr } = await financeClient
      .from('ordens_pagamento')
      .insert([{
        cod_orden_pago: codOP,
        departamento_origem: 'Logistica',
        tipo_orden: 'Alojamiento',
        valor: payload.valor,
        status: 'pendente',
        observaciones: payload.observacoes || `Pagamento de ${payload.tipo_pago} referente a ${payload.periodo_competencia || 'mês atual'}`,
        fecha_vencto: payload.data_vencimento,
        cod_provedor: payload.provedor_id,
        cod_alojamiento: payload.alojamento_id,
        cod_contrato: payload.contrato_id
      }])
      .select()
      .single();

    if (opErr) throw opErr;

    // 2. Inserir item em core_finance.ordens_pagamento_itens
    if (opData) {
      await financeClient.from('ordens_pagamento_itens').insert([{
        ordem_pagamento_id: opData.id,
        cod_orden_pago: codOP,
        categoria_orden: payload.tipo_pago,
        valor_orden: payload.valor,
        vencimento_orden: payload.data_vencimento,
        observacion_item: payload.observacoes
      }]);

      // 3. Registrar ou atualizar em core_logistics.pagos_alojamento
      const codPago = `PG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      await logClient.from('pagos_alojamento').insert([{
        codigo_pago: codPago,
        contrato_id: payload.contrato_id,
        alojamento_id: payload.alojamento_id,
        provedor_id: payload.provedor_id,
        ordem_pagamento_id: opData.id,
        tipo_pago: payload.tipo_pago,
        status_pago: 'En Orden',
        periodo_competencia: payload.periodo_competencia || new Date().toISOString().slice(0, 7),
        data_vencimento: payload.data_vencimento,
        valor_previsto: payload.valor,
        observacoes: payload.observacoes
      }]);
    }

    return opData;
  }
};
