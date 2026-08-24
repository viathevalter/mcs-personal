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

// Constrói payload de provedor seguro com metadata no campo contatos (JSONB)
const buildProvedorPayload = (input: any) => {
  const metadata = {
    endereco: input.endereco || '',
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España',
    codigo_postal: input.codigo_postal || '',
    dados_bancarios: input.dados_bancarios || [],
    country_id: input.country_id || null,
    region_id: input.region_id || null,
  };

  // Preserva a lista de contatos do usuário e anexa metadata como objeto auxiliar no array
  const rawContatos = Array.isArray(input.contatos) ? input.contatos.filter((c: any) => !c.__meta) : [];
  const contatosComMeta = [
    ...rawContatos,
    { __meta: true, ...metadata }
  ];

  const payload: any = {
    nome_razao_social: input.nome_razao_social || '',
    nome_comercial: input.nome_comercial || '',
    cif_nif: input.cif_nif || '',
    classificacao: input.classificacao || 'Proveedor Alojamiento',
    tipo_provedor: input.tipo_pessoa || 'Persona Jurídica',
    tipo_pessoa: input.tipo_pessoa || 'Persona Jurídica',
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
    codigo_postal: input.codigo_postal || '',
    contatos: contatosComMeta,
    tipo: 'alojamento',
    ativo: input.ativo ?? true
  };

  if (input.codigo) payload.codigo = input.codigo;

  return payload;
};

const hydrateProvedor = (p: any): Provedor => {
  if (!p) return p;

  let metaObj: any = {};
  if (Array.isArray(p.contatos)) {
    const metaItem = p.contatos.find((c: any) => c.__meta);
    if (metaItem) metaObj = metaItem;
  }

  const cleanContatos = Array.isArray(p.contatos) ? p.contatos.filter((c: any) => !c.__meta) : [];

  return {
    ...p,
    tipo: 'alojamento',
    tipo_pessoa: p.tipo_pessoa || (p.tipo_provedor?.includes('Física') ? 'Persona Física' : 'Persona Jurídica'),
    classificacao: p.classificacao || 'Proveedor Alojamiento',
    endereco: p.endereco || metaObj.endereco || '',
    municipio: p.municipio || metaObj.municipio || '',
    provincia: p.provincia || metaObj.provincia || '',
    pais: p.pais || metaObj.pais || 'España',
    codigo_postal: p.codigo_postal || metaObj.codigo_postal || '',
    country_id: p.country_id || metaObj.country_id || null,
    region_id: p.region_id || metaObj.region_id || null,
    contatos: cleanContatos.length > 0 ? cleanContatos : (p.contato_nome || p.telefone ? [{ nome: p.contato_nome || '', telefone: p.telefone || '', email: p.email || '', cargo_tipo: 'Proprietário' }] : []),
    dados_bancarios: (p.dados_bancarios && p.dados_bancarios.length > 0)
      ? p.dados_bancarios
      : (metaObj.dados_bancarios && metaObj.dados_bancarios.length > 0)
        ? metaObj.dados_bancarios
        : (p.iban ? [{ banco: p.banco, iban: p.iban, swift: p.swift, titular_conta: p.titular_conta, metodo_pago: p.metodo_pago, principal: true }] : []),
    ativo: p.ativo !== false && p.status !== 'Inactivo'
  };
};

const buildAlojamentoPayload = (input: any) => {
  const payload: any = {
    nome: input.titulo || input.nome || 'Novo Alojamento',
    endereco: input.endereco || '',
    tipo_alojamento: input.tipo_alojamento || 'Fijo',
    classificacao: input.classificacao || 'Privado',
    capacidade_pessoas: Number(input.capacidade_pessoas) || 0,
    dormitorios: Number(input.dormitorios) || 0,
    total_camas: Number(input.total_camas) || 0,
    camas_individuais: Number(input.camas_individuais) || 0,
    camas_duplas: Number(input.camas_duplas) || 0,
    banheiros: Number(input.banheiros) || 0,
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España',
    codigo_postal: input.codigo_postal || '',
    comodidades: input.comodidades || {},
    suministros: input.suministros || {},
    valor_mensal: input.valor_mensal,
    status: input.ativo === false ? 'inativo' : 'ativo'
  };

  if (input.provedor_id) payload.provedor_id = input.provedor_id;
  if (input.codigo) payload.codigo = input.codigo;

  return payload;
};

const hydrateAlojamento = (a: any): Alojamento => {
  if (!a) return a;
  return {
    ...a,
    titulo: a.nome || a.titulo || '',
    endereco: a.endereco || '',
    municipio: a.municipio || '',
    provincia: a.provincia || '',
    pais: a.pais || 'España',
    codigo_postal: a.codigo_postal || '',
    comodidades: a.comodidades || {},
    suministros: a.suministros || {},
    valor_mensal: a.valor_mensal || a.custo_mensal_total,
    capacidade_pessoas: a.capacidade_pessoas || a.capacidade_total || 0,
    provedor: a.provedores || a.provedor,
    ativo: a.status !== 'inativo' && a.ativo !== false
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
      .select(`*, provedores(nome_razao_social, telefone)`)
      .order('nome');

    if (error) {
      const basic = await getClient().from('alojamentos').select('*').order('nome');
      if (basic.data) return basic.data.map(hydrateAlojamento);
      throw error;
    }
    return (data || []).map(hydrateAlojamento);
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

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select(`*, provedores(nome_razao_social, telefone)`)
      .eq('id', id)
      .single();
    
    if (error) {
      const basic = await getClient().from('alojamentos').select('*').eq('id', id).single();
      if (basic.data) return hydrateAlojamento(basic.data);
      return null;
    }
    return hydrateAlojamento(data);
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

  async deleteProvedor(id: string): Promise<boolean> {
    const { error } = await getClient()
      .from('provedores')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAlojamento(id: string): Promise<boolean> {
    const { error } = await getClient()
      .from('alojamentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
