import { supabase } from '@/shared/supabase/client';

export interface ContatoProvedor {
  id?: string;
  nome: string;
  cargo_tipo?: string;
  telefone?: string;
  email?: string;
}

export interface ContaBancariaProvedor {
  id?: string;
  banco?: string;
  iban?: string;
  swift?: string;
  titular_conta?: string;
  metodo_pago?: string;
  principal?: boolean;
}

export interface Provedor {
  id: string;
  codigo?: string;
  nome_razao_social: string;
  nome_comercial?: string;
  cif_nif?: string;
  classificacao?: string;
  tipo_provedor?: string;
  tipo_pessoa?: 'Persona Física' | 'Persona Jurídica';
  contato_nome?: string;
  telefone?: string;
  email?: string;
  contatos?: ContatoProvedor[];
  dados_bancarios?: ContaBancariaProvedor[];
  iban?: string;
  banco?: string;
  swift?: string;
  titular_conta?: string;
  metodo_pago?: string;
  endereco?: string;
  municipio?: string;
  provincia?: string;
  pais?: string;
  observacoes?: string;
  status?: string;
  created_at?: string;
}

export interface Cama {
  id: string;
  alojamento_id: string;
  identificador: string;
  tipo: 'individual' | 'dupla';
  status: 'livre' | 'ocupada' | 'manutencao';
}

export interface Alojamento {
  id: string;
  codigo?: string;
  provedor_id?: string;
  nome: string;
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
  latitude?: number;
  longitude?: number;
  comodidades?: any;
  suministros?: any;
  fotos?: string[];
  observacoes?: string;
  status?: string;
  created_at?: string;
  provedor?: Provedor;
  camas?: Cama[];
}

export interface Alocacao {
  id: string;
  cama_id: string;
  alojamento_id?: string;
  worker_id?: string;
  solicitud_id?: string;
  pedido_id?: string;
  empresa_id?: string;
  cliente_id?: string;
  data_inicio: string;
  data_fim?: string;
  status: 'En Curso' | 'Checkout' | 'Reservada' | 'Cancelada';
  motivo_checkout?: string;
  gerou_auxilio_moradia?: boolean;
  observacoes?: string;
  cama?: Cama;
  alojamento?: Alojamento;
  worker_nome?: string;
}

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export const logisticsService = {
  // Provedores
  async fetchProvedores(): Promise<Provedor[]> {
    const { data, error } = await getClient()
      .from('provedores')
      .select('*')
      .order('nome_razao_social', { ascending: true });
    
    if (error) {
      console.warn('Erro em core_logistics.provedores, tentando public...', error);
      const res = await supabase.from('provedores').select('*');
      return res.data || [];
    }
    return data || [];
  },

  async createProvedor(provedor: Partial<Provedor>): Promise<Provedor> {
    const client = getClient();
    let payload: any = {
      tipo: 'alojamento',
      tipo_provedor: 'Proveedor Alojamiento',
      status: 'Activo',
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
    throw new Error('Falha ao inserir provedor após sanitização de colunas.');
  },

  async updateProvedor(id: string, provedor: Partial<Provedor>): Promise<Provedor> {
    const { data, error } = await getClient()
      .from('provedores')
      .update(provedor)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Alojamentos
  async fetchAlojamentos(): Promise<Alojamento[]> {
    const client = getClient();
    const { data, error } = await client
      .from('alojamentos')
      .select(`
        *,
        provedores (*)
      `)
      .order('nome', { ascending: true });

    if (error) {
      console.warn('Erro ao carregar alojamentos:', error);
      const res = await supabase.from('alojamentos').select('*');
      return res.data || [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      provedor: item.provedores
    }));
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

  // Camas & Alocações
  async fetchCamas(alojamentoId?: string): Promise<Cama[]> {
    const client = getClient();
    let query = client.from('camas').select('*');
    if (alojamentoId) query = query.eq('alojamento_id', alojamentoId);
    
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  async fetchAlocacoes(): Promise<Alocacao[]> {
    const client = getClient();
    const { data, error } = await client
      .from('alocacoes')
      .select(`
        *,
        camas (*),
        alojamentos (*)
      `)
      .order('data_inicio', { ascending: false });

    if (error) return [];
    return data || [];
  },

  async alocarTrabalhador(payload: {
    cama_id: string;
    alojamento_id: string;
    worker_id: string;
    solicitud_id?: string;
    pedido_id?: string;
    empresa_id?: string;
    cliente_id?: string;
    data_inicio: string;
  }): Promise<Alocacao> {
    const client = getClient();
    const { data, error } = await client
      .from('alocacoes')
      .insert([{
        ...payload,
        status: 'En Curso'
      }])
      .select()
      .single();

    if (error) throw error;

    // Atualizar status da cama para ocupada
    await client.from('camas').update({ status: 'ocupada' }).eq('id', payload.cama_id);

    return data;
  },

  async checkoutTrabalhador(alocacaoId: string, camaId: string, motivo?: string): Promise<void> {
    const client = getClient();
    await client
      .from('alocacoes')
      .update({
        status: 'Checkout',
        data_fim: new Date().toISOString().split('T')[0],
        motivo_checkout: motivo
      })
      .eq('id', alocacaoId);

    // Liberar a cama
    await client.from('camas').update({ status: 'livre' }).eq('id', camaId);
  }
};
