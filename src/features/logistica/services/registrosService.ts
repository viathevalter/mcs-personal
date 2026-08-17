import { supabase } from '@/shared/supabase/client';

export interface Provedor {
  id: string;
  codigo?: string;
  nome_razao_social: string;
  nome_comercial?: string;
  cif_nif?: string;
  tipo: 'padrao' | 'alojamento';
  tipo_pessoa?: 'Persona Física' | 'Persona Jurídica';
  contato_nome?: string;
  telefone?: string;
  email?: string;
  contatos?: Array<{
    nome: string;
    cargo_tipo?: string;
    telefone?: string;
    email?: string;
  }>;
  iban?: string;
  banco?: string;
  swift?: string;
  titular_conta?: string;
  metodo_pago?: string;
  endereco?: string;
  municipio?: string;
  provincia?: string;
  pais?: string;
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
    const client = getClient();
    let payload: any = {
      tipo: 'alojamento',
      tipo_provedor: 'Proveedor Alojamiento',
      ativo: true,
      ...provedor
    };
    let attempts = 0;

    while (attempts < 10) {
      attempts++;
      const { data, error } = await client
        .from('provedores')
        .insert([payload])
        .select()
        .single();
      
      if (!error) return data;

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete (payload as any)[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao inserir provedor.');
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
