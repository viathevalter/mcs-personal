import { supabase } from '@/shared/supabase/client';

export interface Provedor {
  id: string;
  codigo?: string;
  nome_razao_social: string;
  tipo: 'padrao' | 'alojamento';
  contato_nome?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export interface Alojamento {
  id: string;
  codigo?: string;
  provedor_id?: string;
  titulo: string;
  tipo_alojamento?: string;
  classificacao?: string;
  capacidade_pessoas: number;
  dormitorios: number;
  total_camas: number;
  camas_individuais: number;
  camas_duplas: number;
  banheiros: number;
  endereco?: string;
  municipio?: string;
  provincia?: string;
  pais?: string;
  comodidades?: any;
  suministros?: any;
  valor_mensal?: number;
  ativo: boolean;
  provedor?: {
    nome_razao_social: string;
  };
}

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export const registrosService = {
  async fetchProvedores(): Promise<Provedor[]> {
    const { data, error } = await getClient()
      .from('provedores')
      .select('*')
      .order('nome_razao_social');
    
    if (error) throw error;
    return data || [];
  },

  async fetchAlojamentos(): Promise<Alojamento[]> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select(`
        *,
        provedores ( nome_razao_social )
      `)
      .order('titulo');
    
    if (error) throw error;
    // Map provedores to provedor to keep it consistent
    return (data || []).map((item: any) => ({
      ...item,
      provedor: item.provedores
    }));
  },

  async createProvedor(provedor: Partial<Provedor>): Promise<Provedor> {
    const { data, error } = await getClient()
      .from('provedores')
      .insert([provedor])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createAlojamento(alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .insert([alojamento])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
