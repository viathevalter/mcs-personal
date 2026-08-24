import { supabase } from '@/shared/supabase/client';

export interface Provedor {
  id: string;
  codigo?: string;
  nome_razao_social: string;
  nome_comercial?: string;
  cif_nif?: string;
  tipo: 'padrao' | 'alojamento';
  tipo_pessoa?: 'Persona Física' | 'Persona Jurídica';
  tipo_provedor?: string;
  classificacao?: string;
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
  codigo_postal?: string;
  country_id?: string | null;
  region_id?: string | null;
  observacoes?: string;
  ativo: boolean;
}

export interface Alojamento {
  id: string;
  codigo?: string;
  provedor_id?: string;
  titulo: string;
  nome?: string;
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
  ativo: boolean;
  provedor?: {
    nome_razao_social: string;
    telefone?: string;
  };
}

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

// Serialização com sanitização de campos para PostgreSQL core_logistics.provedores
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

  // Apenas campos físicos válidos na tabela provedores
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
    ativo: p.status !== 'Inactivo' && p.ativo !== false,
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
    nome: input.titulo || input.nome || 'Alojamento Sem Nome',
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
    titulo: a.nome || a.titulo || '',
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
    provedor: a.provedores || a.provedor,
    ativo: a.status !== 'inativo' && a.ativo !== false,
  };
};

export const registrosService = {
  async fetchProvedores(): Promise<Provedor[]> {
    const { data, error } = await getClient()
      .from('provedores')
      .select('*')
      .order('nome_razao_social');
    
    if (error) throw error;
    return (data || []).map(hydrateProvedor);
  },

  async fetchAlojamentos(): Promise<Alojamento[]> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select(`
        *,
        provedores ( nome_razao_social, telefone )
      `)
      .order('nome');
    
    if (error) throw error;
    return (data || []).map(hydrateAlojamento);
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
    throw new Error('Falha ao inserir provedor.');
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
    throw new Error('Falha ao atualizar provedor.');
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
