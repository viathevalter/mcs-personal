import { supabase } from '@/shared/supabase/client';
import { registrosService } from './registrosService';

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
  codigo_postal?: string;
  country_id?: string | null;
  region_id?: string | null;
  observacoes?: string;
  status?: string;
  created_at?: string;
}

export interface Alojamento {
  id: string;
  codigo?: string;
  provedor_id?: string;
  nome: string;
  titulo?: string;
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
  codigo_postal?: string;
  country_id?: string | null;
  region_id?: string | null;
  comodidades?: any;
  suministros?: any;
  valor_mensal?: number;
  observacoes?: string;
  status?: string;
  provedor?: {
    nome_razao_social: string;
    telefone?: string;
  };
  camas?: Cama[];
}

export interface Cama {
  id: string;
  alojamento_id: string;
  identificador: string;
  tipo: 'individual' | 'dupla';
  status: 'livre' | 'ocupada' | 'manutencao';
  alocacao_atual?: Alocacao;
}

export interface Alocacao {
  id: string;
  cama_id: string;
  worker_id: string;
  data_inicio: string;
  data_fim?: string;
  status: 'Programada' | 'En Curso' | 'Checkout';
  observacoes?: string;
  cama?: Cama;
  alojamento?: Alojamento;
  worker_nome?: string;
}

export const logisticsService = {
  // Provedores
  async fetchProvedores(): Promise<Provedor[]> {
    return (await registrosService.fetchProvedores()) as Provedor[];
  },

  async createProvedor(provedor: Partial<Provedor>): Promise<Provedor> {
    return (await registrosService.createProvedor(provedor as any)) as Provedor;
  },

  async updateProvedor(id: string, provedor: Partial<Provedor>): Promise<Provedor> {
    return (await registrosService.updateProvedor(id, provedor as any)) as Provedor;
  },

  async fetchProvedorById(id: string): Promise<Provedor | null> {
    return (await registrosService.fetchProvedorById(id)) as Provedor | null;
  },

  async deleteProvedor(id: string): Promise<boolean> {
    return await registrosService.deleteProvedor(id);
  },

  // Alojamentos
  async fetchAlojamentos(): Promise<Alojamento[]> {
    const list = await registrosService.fetchAlojamentos();
    return list.map(a => ({
      ...a,
      nome: a.titulo || a.nome || ''
    }));
  },

  async createAlojamento(alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const res = await registrosService.createAlojamento({
      ...alojamento,
      titulo: alojamento.nome || alojamento.titulo || 'Novo Alojamento'
    });
    return {
      ...res,
      nome: res.titulo || res.nome || ''
    };
  },

  async updateAlojamento(id: string, alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const res = await registrosService.updateAlojamento(id, {
      ...alojamento,
      titulo: alojamento.nome || alojamento.titulo || ''
    });
    return {
      ...res,
      nome: res.titulo || res.nome || ''
    };
  },

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    const res = await registrosService.fetchAlojamentoById(id);
    if (!res) return null;
    return {
      ...res,
      nome: res.titulo || res.nome || ''
    };
  },

  async deleteAlojamento(id: string): Promise<boolean> {
    return await registrosService.deleteAlojamento(id);
  },

  // Camas & Alocações
  async fetchCamas(alojamentoId?: string): Promise<Cama[]> {
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    try {
      let query = client.from('camas').select('*');
      if (alojamentoId) query = query.eq('alojamento_id', alojamentoId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
    return [];
  },

  async fetchAlocacoes(): Promise<Alocacao[]> {
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    try {
      const { data, error } = await client
        .from('alocacoes')
        .select(`
          *,
          camas (
            *,
            alojamentos (
              *
            )
          )
        `)
        .order('data_inicio', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          ...item,
          cama: item.camas,
          alojamento: item.camas?.alojamentos
        }));
      }
    } catch (e) {}
    return [];
  },

  async alocarTrabalhador(payload: {
    cama_id: string;
    worker_id: string;
    worker_nome: string;
    data_inicio: string;
    data_fim?: string;
    observacoes?: string;
  }): Promise<Alocacao> {
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    const { data, error } = await client
      .from('alocacoes')
      .insert([{
        cama_id: payload.cama_id,
        worker_id: payload.worker_id,
        worker_nome: payload.worker_nome,
        data_inicio: payload.data_inicio,
        data_fim: payload.data_fim,
        observacoes: payload.observacoes,
        status: 'En Curso'
      }])
      .select()
      .single();

    if (error) throw error;

    await client.from('camas').update({ status: 'ocupada' }).eq('id', payload.cama_id);
    return data;
  },

  async checkoutTrabalhador(alocacaoId: string, camaId: string, motivo?: string): Promise<void> {
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    await client
      .from('alocacoes')
      .update({
        status: 'Checkout',
        data_fim: new Date().toISOString().split('T')[0],
        motivo_checkout: motivo
      })
      .eq('id', alocacaoId);

    await client.from('camas').update({ status: 'livre' }).eq('id', camaId);
  }
};
