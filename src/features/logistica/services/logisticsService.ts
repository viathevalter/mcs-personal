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
  provedor?: Provedor;
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

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

const buildProvedorPayload = (input: any) => {
  const metadata: any = {
    codigo_postal: input.codigo_postal || '',
    country_id: input.country_id || null,
    region_id: input.region_id || null,
    dados_bancarios: input.dados_bancarios || [],
    tipo_pessoa: input.tipo_pessoa || 'Persona Jurídica',
    classificacao: input.classificacao || 'Proveedor Alojamiento',
    endereco: input.endereco || '',
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España'
  };

  let cleanObs = (input.observacoes || '').replace(/__META_JSON__:[^\n]+/, '').trim();
  const obsWithMeta = `${cleanObs}\n__META_JSON__:${JSON.stringify(metadata)}`.trim();

  const payload: any = {
    nome_razao_social: input.nome_razao_social || '',
    nome_comercial: input.nome_comercial || '',
    cif_nif: input.cif_nif || '',
    classificacao: input.classificacao || 'Proveedor Alojamiento',
    tipo_provedor: input.tipo_pessoa || 'Persona Jurídica',
    contato_nome: input.contato_nome || '',
    telefone: input.telefone || '',
    email: input.email || '',
    iban: input.iban || '',
    banco: input.banco || '',
    swift: input.swift || '',
    titular_conta: input.titular_conta || '',
    metodo_pago: input.metodo_pago || 'Transferir',
    endereco: input.endereco || '',
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España',
    contatos: input.contatos || [],
    observacoes: obsWithMeta,
    status: input.ativo === false ? 'Inactivo' : 'Activo'
  };

  if (input.codigo) payload.codigo = input.codigo;

  return payload;
};

const hydrateProvedor = (p: any): Provedor => {
  if (!p) return p;
  let metadata: any = {};
  if (p.observacoes && p.observacoes.includes('__META_JSON__:')) {
    try {
      const match = p.observacoes.match(/__META_JSON__:(.+)/);
      if (match && match[1]) {
        metadata = JSON.parse(match[1].trim());
      }
    } catch (e) {
      console.warn('Erro ao parsear metadata de provedor', e);
    }
  }

  const endereco = p.endereco || metadata.endereco || '';
  const municipio = p.municipio || metadata.municipio || '';
  const provincia = p.provincia || metadata.provincia || '';
  const pais = p.pais || metadata.pais || 'España';
  const codigo_postal = p.codigo_postal || metadata.codigo_postal || '';

  return {
    ...p,
    tipo: 'alojamento',
    tipo_pessoa: p.tipo_pessoa || metadata.tipo_pessoa || (p.tipo_provedor?.includes('Física') ? 'Persona Física' : 'Persona Jurídica'),
    classificacao: p.classificacao || metadata.classificacao || 'Proveedor Alojamiento',
    endereco,
    municipio,
    provincia,
    pais,
    codigo_postal,
    country_id: p.country_id || metadata.country_id || null,
    region_id: p.region_id || metadata.region_id || null,
    dados_bancarios: (p.dados_bancarios && p.dados_bancarios.length > 0)
      ? p.dados_bancarios
      : (metadata.dados_bancarios && metadata.dados_bancarios.length > 0)
        ? metadata.dados_bancarios
        : (p.iban ? [{ banco: p.banco, iban: p.iban, swift: p.swift, titular_conta: p.titular_conta, metodo_pago: p.metodo_pago, principal: true }] : []),
    status: p.status || 'Activo'
  };
};

const buildAlojamentoPayload = (input: any) => {
  const metadata: any = {
    codigo_postal: input.codigo_postal || '',
    country_id: input.country_id || null,
    region_id: input.region_id || null,
    comodidades: input.comodidades || {},
    suministros: input.suministros || {},
    valor_mensal: input.valor_mensal,
    endereco: input.endereco || '',
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España'
  };

  let cleanObs = (input.observacoes || '').replace(/__META_JSON__:[^\n]+/, '').trim();
  const obsWithMeta = `${cleanObs}\n__META_JSON__:${JSON.stringify(metadata)}`.trim();

  const payload: any = {
    nome: input.nome || input.titulo || 'Alojamento Sem Nome',
    tipo_alojamento: input.tipo_alojamento || 'Fijo',
    classificacao: input.classificacao || 'Privado',
    capacidade_pessoas: Number(input.capacidade_pessoas) || 0,
    dormitorios: Number(input.dormitorios) || 0,
    total_camas: Number(input.total_camas) || 0,
    camas_individuais: Number(input.camas_individuais) || 0,
    camas_duplas: Number(input.camas_duplas) || 0,
    banheiros: Number(input.banheiros) || 0,
    endereco: input.endereco || '',
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España',
    observacoes: obsWithMeta,
    status: input.ativo === false ? 'inativo' : 'ativo'
  };

  if (input.provedor_id) payload.provedor_id = input.provedor_id;
  if (input.codigo) payload.codigo = input.codigo;

  return payload;
};

const hydrateAlojamento = (a: any): Alojamento => {
  if (!a) return a;
  let metadata: any = {};
  if (a.observacoes && a.observacoes.includes('__META_JSON__:')) {
    try {
      const match = a.observacoes.match(/__META_JSON__:(.+)/);
      if (match && match[1]) {
        metadata = JSON.parse(match[1].trim());
      }
    } catch (e) {
      console.warn('Erro ao parsear metadata de alojamento', e);
    }
  }

  return {
    ...a,
    nome: a.nome || a.titulo || '',
    endereco: a.endereco || metadata.endereco || '',
    municipio: a.municipio || metadata.municipio || '',
    provincia: a.provincia || metadata.provincia || '',
    pais: a.pais || metadata.pais || 'España',
    codigo_postal: a.codigo_postal || metadata.codigo_postal || '',
    country_id: a.country_id || metadata.country_id || null,
    region_id: a.region_id || metadata.region_id || null,
    comodidades: a.comodidades || metadata.comodidades || {},
    suministros: a.suministros || metadata.suministros || {},
    valor_mensal: a.valor_mensal || metadata.valor_mensal,
    provedor: a.provedores || a.provedor
  };
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
      return (res.data || []).map(hydrateProvedor);
    }
    return (data || []).map(hydrateProvedor);
  },

  async createProvedor(provedor: Partial<Provedor>): Promise<Provedor> {
    const client = getClient();
    let payload = buildProvedorPayload(provedor);
    let attempts = 0;

    while (attempts < 12) {
      attempts++;
      const { data, error } = await client
        .from('provedores')
        .insert([payload])
        .select()
        .single();

      if (!error) return hydrateProvedor(data);

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete payload[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao inserir provedor após sanitização de colunas.');
  },

  async updateProvedor(id: string, provedor: Partial<Provedor>): Promise<Provedor> {
    const client = getClient();
    let payload = buildProvedorPayload(provedor);
    let attempts = 0;

    while (attempts < 12) {
      attempts++;
      const { data, error } = await client
        .from('provedores')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error) return hydrateProvedor(data);

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete payload[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao atualizar provedor após sanitização.');
  },

  async fetchProvedorById(id: string): Promise<Provedor | null> {
    const { data, error } = await getClient()
      .from('provedores')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return hydrateProvedor(data);
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
      return (res.data || []).map(hydrateAlojamento);
    }

    return (data || []).map(hydrateAlojamento);
  },

  async createAlojamento(alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const client = getClient();
    let payload = buildAlojamentoPayload(alojamento);
    let attempts = 0;

    while (attempts < 12) {
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
        return hydrateAlojamento(data);
      }

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete payload[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao inserir alojamento.');
  },

  async updateAlojamento(id: string, alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const client = getClient();
    let payload = buildAlojamentoPayload(alojamento);
    let attempts = 0;

    while (attempts < 12) {
      attempts++;
      const { data, error } = await client
        .from('alojamentos')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error) return hydrateAlojamento(data);

      if (error.message && error.message.includes('Could not find the')) {
        const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
        if (missingMatch && missingMatch[1]) {
          delete payload[missingMatch[1]];
          continue;
        }
      }

      throw error;
    }
    throw new Error('Falha ao atualizar alojamento.');
  },

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select('*, provedores(*)')
      .eq('id', id)
      .single();
    if (error) return null;
    return hydrateAlojamento(data);
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
        camas (
          *,
          alojamentos (
            *
          )
        )
      `)
      .order('data_inicio', { ascending: false });

    if (error) return [];

    return (data || []).map((item: any) => ({
      ...item,
      cama: item.camas,
      alojamento: item.camas?.alojamentos
    }));
  },

  async alocarTrabalhador(payload: {
    cama_id: string;
    worker_id: string;
    worker_nome: string;
    data_inicio: string;
    data_fim?: string;
    observacoes?: string;
  }): Promise<Alocacao> {
    const client = getClient();
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
    const client = getClient();
    await client
      .from('alocacoes')
      .update({
        status: 'Checkout',
        data_fim: new Date().toISOString().split('T')[0],
        motivo_checkout: motivo
      })
      .eq('id', alocacaoId);

    await client.from('camas').update({ status: 'livre' }).eq('id', camaId);
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
    await client.from('camas').delete().eq('alojamento_id', id).catch(console.warn);
    const { error } = await client
      .from('alojamentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
