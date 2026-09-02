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
        const list: PagoAlojamento[] = JSON.parse(stored);
        let changed = false;
        const repaired = list.map(op => {
          if (
            (op.alojamento_codigo === 'AL-0977' || (op.alojamento_nome && op.alojamento_nome.toLowerCase().includes('jesús'))) &&
            (!op.centro_custo_cliente || op.centro_custo_cliente === 'BECK & POLLITZER IBERICA SLU')
          ) {
            changed = true;
            return {
              ...op,
              centro_custo_cliente: 'EUROCONTAINER',
              centro_custo_obra: 'Obra ZARAGOZA'
            };
          }
          return op;
        });

        if (changed) {
          try {
            localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(repaired));
          } catch (e) {}
        }
        return repaired;
      }
    } catch (e) {
      console.warn('Erro ao ler pagamentos do localStorage:', e);
    }

    // Inicialização padrão de demonstração / seed caso vazio
    const initialSeed: PagoAlojamento[] = [
      {
        id: 'pago-001',
        codigo_pago: 'OP-2026/0891',
        contrato_id: 'CT-2026/0001',
        alojamento_nome: 'MADRID - Piso Centro Paseo de la Castellana 45',
        alojamento_codigo: 'AL-0001',
        provedor_nome: 'Inmobiliaria Castellana Real Estate SL',
        iban_cobranca: 'ES9121000418450200051332',
        banco: 'CaixaBank',
        titular: 'Inmobiliaria Castellana Real Estate SL',
        centro_custo_cliente: 'CALDENOR',
        centro_custo_obra: 'Obra Madrid Norte',
        tipo_pago: 'Aluguel',
        status_pago: 'Aguardando Aprovação',
        periodo_competencia: '08/2026',
        data_emissao: '2026-08-01',
        data_vencimento: '2026-08-05',
        valor_previsto: 1450.00,
        moeda: 'EUR',
        observacoes: 'Aluguel mensal referente ao mês de Agosto/2026'
      },
      {
        id: 'pago-002',
        codigo_pago: 'OP-2026/0892',
        contrato_id: 'CT-2026/0004',
        alojamento_nome: 'VALENCIA - Apartamento Turia Gran Vía 12',
        alojamento_codigo: 'AL-0004',
        provedor_nome: 'Levante Habitats SL',
        iban_cobranca: 'ES7600491500051234567890',
        banco: 'Santander',
        titular: 'Levante Habitats SL',
        centro_custo_cliente: 'IBERDROLA RENOVABLES',
        centro_custo_obra: 'Parque Eólico Sagunto',
        tipo_pago: 'Aluguel',
        status_pago: 'Aprovado',
        periodo_competencia: '08/2026',
        data_emissao: '2026-08-01',
        data_vencimento: '2026-08-07',
        valor_previsto: 1200.00,
        moeda: 'EUR',
        observacoes: 'Aluguel mensal fechado'
      },
      {
        id: 'pago-003',
        codigo_pago: 'OP-2026/0893',
        contrato_id: 'CT-2026/0002',
        alojamento_nome: 'BARCELONA - Gran Via de les Corts Catalanes 112',
        alojamento_codigo: 'AL-0002',
        provedor_nome: 'Barcelona Living Solutions SL',
        iban_cobranca: 'ES8800810123450001234567',
        banco: 'Banc Sabadell',
        titular: 'Barcelona Living Solutions SL',
        centro_custo_cliente: 'SIEMENS MOBILITY',
        centro_custo_obra: 'Metro L9 Barcelona',
        tipo_pago: 'Fianza_Saida',
        status_pago: 'Pago',
        periodo_competencia: '08/2026',
        data_emissao: '2026-07-28',
        data_vencimento: '2026-08-01',
        valor_previsto: 1600.00,
        moeda: 'EUR',
        observacoes: 'Depósito de caução contratual (1 mês de fianza)'
      }
    ];

    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(initialSeed));
    } catch (e) {}

    return initialSeed;
  },

  async gerarOrdemPagamento(payload: Omit<PagoAlojamento, 'id' | 'codigo_pago' | 'status_pago' | 'data_emissao'>): Promise<PagoAlojamento> {
    const list = await this.fetchPagos();
    const codigoPago = `OP-2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const novaOP: PagoAlojamento = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pago-${Date.now()}`,
      codigo_pago: codigoPago,
      status_pago: 'Aguardando Aprovação',
      data_emissao: new Date().toISOString().split('T')[0],
      moeda: 'EUR',
      ...payload
    };

    list.unshift(novaOP);
    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}

    return novaOP;
  },

  async gerarOrdensPagamentoEmLote(
    payloads: Array<Omit<PagoAlojamento, 'id' | 'codigo_pago' | 'status_pago' | 'data_emissao'>>
  ): Promise<PagoAlojamento[]> {
    const list = await this.fetchPagos();
    const today = new Date().toISOString().split('T')[0];

    const createdList: PagoAlojamento[] = payloads.map((payload, index) => {
      const randomPart = Math.floor(1000 + Math.random() * 9000) + index;
      const codigoPago = `OP-2026/${randomPart}`;
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `pago-${Date.now()}-${index}`,
        codigo_pago: codigoPago,
        status_pago: 'Aguardando Aprovação',
        data_emissao: today,
        moeda: 'EUR',
        ...payload
      };
    });

    const updated = [...createdList, ...list];
    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return createdList;
  },

  async registrarDevolucaoFianza(params: {
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
    valor_devolvido: number;
    valor_danos?: number;
    valor_suministros?: number;
    documentos_url?: string;
    observacoes?: string;
  }): Promise<PagoAlojamento> {
    const list = await this.fetchPagos();
    const codigoPago = `REC-FIANZA-${Math.floor(1000 + Math.random() * 9000)}`;

    const novaDevolucao: PagoAlojamento = {
      id: crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}`,
      codigo_pago: codigoPago,
      contrato_id: params.contrato_id,
      alojamento_id: params.alojamento_id,
      alojamento_nome: params.alojamento_nome,
      alojamento_codigo: params.alojamento_codigo,
      provedor_id: params.provedor_id,
      provedor_nome: params.provedor_nome,
      iban_cobranca: params.iban_cobranca,
      banco: params.banco,
      titular: params.titular,
      centro_custo_cliente: params.centro_custo_cliente || 'Centro de Coste General',
      centro_custo_obra: params.centro_custo_obra || 'Obra Principal',
      tipo_pago: 'Fianza_Devolucion',
      status_pago: 'Pago',
      periodo_competencia: '09/2026',
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: new Date().toISOString().split('T')[0],
      valor_previsto: params.valor_devolvido,
      moeda: 'EUR',
      anexo_fatura_url: params.documentos_url,
      observacoes: `Reembolso / Devolución de fianza de ${params.alojamento_nome}. Importe reembolsado a banco: € ${params.valor_devolvido}. ${params.valor_danos ? `(Deducción por daños: € ${params.valor_danos})` : ''} ${params.valor_suministros ? `(Deducción por suministros: € ${params.valor_suministros})` : ''} ${params.observacoes || ''}`
    };

    list.unshift(novaDevolucao);
    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}

    return novaDevolucao;
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
