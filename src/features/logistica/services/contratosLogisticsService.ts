import { supabase } from '@/shared/supabase/client';

export interface ContratoAlojamento {
  id: string;
  codigo?: string;
  alojamento_id?: string;
  provedor_id?: string;
  empresa_id?: string;
  cliente_id?: string;
  status: 'Activo' | 'Cerrado' | 'Pendente_Renovacao';
  tipo_contrato: 'Fijo' | 'Temporario' | 'Auxilio_moradia';
  data_inicio?: string;
  data_fim?: string;
  valor_mensal: number;
  dia_vencimento: number;
  fianza_valor: number;
  fianza_meses: number;
  renovacao_automatica: boolean;
  aviso_rescisao_dias: number;
  iban_cobranca?: string;
  titular?: string;
  observacoes?: string;
  alojamento?: any;
  provedor?: any;
}

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export const contratosLogisticsService = {
  async fetchContratos(): Promise<ContratoAlojamento[]> {
    const client = getClient();
    const { data, error } = await client
      .from('contratos_alojamento')
      .select(`
        *,
        alojamentos (*),
        provedores (*)
      `)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar contratos:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      alojamento: c.alojamentos,
      provedor: c.provedores
    }));
  },

  async createContrato(contrato: Partial<ContratoAlojamento>): Promise<ContratoAlojamento> {
    const client = getClient();
    const { data, error } = await client
      .from('contratos_alojamento')
      .insert([contrato])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateContrato(id: string, contrato: Partial<ContratoAlojamento>): Promise<ContratoAlojamento> {
    const client = getClient();
    const { data, error } = await client
      .from('contratos_alojamento')
      .update(contrato)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
