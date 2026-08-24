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
  dados_bancarios?: Array<{
    banco?: string;
    iban?: string;
    swift?: string;
    titular_conta?: string;
    metodo_pago?: string;
    principal?: boolean;
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
    const client = getClient();
    let payload: any = {
      nome: (alojamento as any).titulo || alojamento.nome || 'Alojamento Sem Nome',
      status: 'ativo',
      ...alojamento
    };
    if (payload.titulo && !payload.nome) {
      payload.nome = payload.titulo;
    }

    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      const { data, error } = await client
        .from('alojamentos')
        .insert([payload])
        .select()
        .single();
      
      if (!error) {
        if (data && data.total_camas > 0) {
          const camasToInsert = Array.from({ length: data.total_camas }, (_, i) => ({
            alojamento_id: data.id,
            identificador: `Cama ${String(i + 1).padStart(2, '0')}`,
            tipo: i < (data.camas_individuais || 0) ? 'individual' : 'dupla',
            status: 'livre'
          }));
          await client.from('camas').insert(camasToInsert).catch(console.warn);
        }
        return data;
      }

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete (payload as any)[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao inserir alojamento.');
  },

  async fetchProvedorById(id: string): Promise<Provedor | null> {
    const { data, error } = await getClient()
      .from('provedores')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async updateProvedor(id: string, provedor: Partial<Provedor>): Promise<Provedor> {
    const client = getClient();
    let payload = { ...provedor };
    let attempts = 0;

    while (attempts < 10) {
      attempts++;
      const { data, error } = await client
        .from('provedores')
        .update(payload)
        .eq('id', id)
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
    throw new Error('Falha ao atualizar provedor.');
  },

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select('*, provedores(*)')
      .eq('id', id)
      .single();
    if (error) return null;
    return {
      ...data,
      titulo: data.titulo || data.nome
    };
  },

  async updateAlojamento(id: string, alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const client = getClient();
    let payload: any = { ...alojamento };
    if (payload.titulo && !payload.nome) {
      payload.nome = payload.titulo;
    }

    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      const { data, error } = await client
        .from('alojamentos')
        .update(payload)
        .eq('id', id)
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
    throw new Error('Falha ao atualizar alojamento.');
  },

  async deleteProvedor(id: string): Promise<boolean> {
    const { error } = await getClient()
      .from('provedores')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAlojamento(id: string): Promise<boolean> {
    const client = getClient();
    // Excluir camas vinculadas primeiro se necessário
    await client.from('camas').delete().eq('alojamento_id', id).catch(console.warn);
    const { error } = await client
      .from('alojamentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
