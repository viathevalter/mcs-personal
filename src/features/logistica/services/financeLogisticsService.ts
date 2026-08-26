import { supabase } from '@/shared/supabase/client';
import { registrosService } from './registrosService';

export interface PagoAlojamento {
  id: string;
  codigo_pago: string;
  contrato_id?: string;
  alojamento_id?: string;
  alojamento_nome?: string;
  alojamento_codigo?: string;
  provedor_id?: string;
  provedor_nome?: string;
  iban_cobranca?: string;
  banco?: string;
  titular?: string;
  centro_custo_cliente?: string;
  centro_custo_obra?: string;
  ordem_pagamento_id?: string;
  tipo_pago: 'Aluguel' | 'Fianza_Saida' | 'Fianza_Devolucion' | 'Suministro_Luz' | 'Suministro_Agua' | 'Suministro_Gas' | 'Suministro_Internet' | 'Manutencao_Limpeza';
  status_pago: 'Rascunho' | 'Aguardando Aprovação' | 'Aprovado' | 'Pago' | 'Cancelado';
  periodo_competencia?: string;
  data_emissao?: string;
  data_vencimento?: string;
  valor_previsto: number;
  moeda?: string;
  observacoes?: string;
  anexo_fatura_url?: string;
}

const FINANCE_STORAGE_KEY = 'mcs_logistica_ordens_pagamento_v2';

export const financeLogisticsService = {
  async fetchPagos(): Promise<PagoAlojamento[]> {
    try {
      const stored = localStorage.getItem(FINANCE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    return [];
  },

  async clearAllPagos(): Promise<void> {
    try {
      localStorage.removeItem(FINANCE_STORAGE_KEY);
      localStorage.removeItem('mcs_logistica_ordens_pagamento_v1');
    } catch (e) {}
  },

  async gerarOrdemPagamento(payload: {
    contrato_id?: string;
    alojamento_id?: string;
    alojamento_nome?: string;
    alojamento_codigo?: string;
    provedor_id?: string;
    provedor_nome?: string;
    iban_cobranca?: string;
    banco?: string;
    titular?: string;
    centro_custo_cliente?: string;
    centro_custo_obra?: string;
    tipo_pago: PagoAlojamento['tipo_pago'];
    valor: number;
    data_vencimento: string;
    periodo_competencia?: string;
    observacoes?: string;
    anexo_fatura_url?: string;
  }): Promise<PagoAlojamento> {
    const list = await this.fetchPagos();
    const nextNum = list.length + 125;
    const codOP = `OP-${String(nextNum).padStart(6, '0')}`;

    const newOP: PagoAlojamento = {
      id: `op-${Date.now()}`,
      codigo_pago: codOP,
      contrato_id: payload.contrato_id,
      alojamento_id: payload.alojamento_id,
      alojamento_nome: payload.alojamento_nome || 'Alojamento',
      alojamento_codigo: payload.alojamento_codigo || 'AL-XXXX',
      provedor_id: payload.provedor_id,
      provedor_nome: payload.provedor_nome || 'Proveedor',
      iban_cobranca: payload.iban_cobranca || '',
      banco: payload.banco || '',
      titular: payload.titular || '',
      centro_custo_cliente: payload.centro_custo_cliente || 'BECK & POLLITZER IBERICA SLU',
      centro_custo_obra: payload.centro_custo_obra || 'Obra Principal',
      tipo_pago: payload.tipo_pago,
      status_pago: 'Rascunho',
      periodo_competencia: payload.periodo_competencia || new Date().toISOString().slice(0, 7),
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: payload.data_vencimento,
      valor_previsto: payload.valor,
      moeda: 'EUR',
      observacoes: payload.observacoes || `${payload.tipo_pago} de ${payload.alojamento_nome}`,
      anexo_fatura_url: payload.anexo_fatura_url
    };

    const updated = [newOP, ...list];
    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    // Tentar persistir também em core_finance se disponível
    try {
      const financeClient = (supabase as any).schema ? (supabase as any).schema('core_finance') : supabase;
      await financeClient.from('ordens_pagamento').insert([{
        cod_orden_pago: codOP,
        departamento_origem: 'Logistica',
        tipo_orden: 'Alojamiento',
        valor: payload.valor,
        status: 'rascunho',
        observaciones: payload.observacoes,
        fecha_vencto: payload.data_vencimento,
        cod_provedor: payload.provedor_id,
        cod_alojamiento: payload.alojamento_id,
        cod_contrato: payload.contrato_id
      }]);
    } catch (e) {}

    return newOP;
  },

  async enviarParaAprovacao(opId: string): Promise<void> {
    const list = await this.fetchPagos();
    const updated = list.map(op => {
      if (op.id === opId) {
        return {
          ...op,
          status_pago: 'Aguardando Aprovação' as const
        };
      }
      return op;
    });

    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async aprovarOrdemPagamento(opId: string): Promise<void> {
    const list = await this.fetchPagos();
    const updated = list.map(op => {
      if (op.id === opId) {
        return {
          ...op,
          status_pago: 'Aprovado' as const
        };
      }
      return op;
    });

    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async cancelarOrdemPagamento(opId: string): Promise<void> {
    const list = await this.fetchPagos();
    const updated = list.map(op => {
      if (op.id === opId) {
        return {
          ...op,
          status_pago: 'Cancelado' as const
        };
      }
      return op;
    });

    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  }
};
