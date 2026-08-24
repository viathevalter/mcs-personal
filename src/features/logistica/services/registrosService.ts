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

const LOCAL_KEY_PROV = 'mcs_logistics_provedores_cache_v3';
const LOCAL_KEY_ALOJ = 'mcs_logistics_alojamentos_cache_v3';

const INITIAL_PROVEDORES: Provedor[] = [
  {
    id: '25fd4a08-9e44-4d37-ab16-d247e3beec0f',
    codigo: 'PV-0001',
    nome_razao_social: 'PRUJA FORNIELES PARES SL',
    nome_comercial: 'PRUJA FORNIELES',
    cif_nif: 'B12345678',
    tipo: 'alojamento',
    tipo_pessoa: 'Persona Jurídica',
    classificacao: 'Proveedor Alojamiento',
    contato_nome: 'Sr. Joaquim Prujà Roca',
    telefone: '+34 604 49 14 91',
    email: 'contacto@prujafornieles.es',
    contatos: [
      { nome: 'Sr. Joaquim Prujà Roca', cargo_tipo: 'Proprietário', telefone: '+34 604 49 14 91', email: 'contacto@prujafornieles.es' }
    ],
    dados_bancarios: [
      { banco: 'BBVA (Banco Bilbao Vizcaya Argentaria)', iban: 'ES09 0182 7307 4202 0009 3104', swift: 'BBVAESMMXXX', titular_conta: 'PRUJA FORNIELES PARES SL', metodo_pago: 'Transferir', principal: true }
    ],
    banco: 'BBVA (Banco Bilbao Vizcaya Argentaria)',
    iban: 'ES09 0182 7307 4202 0009 3104',
    swift: 'BBVAESMMXXX',
    titular_conta: 'PRUJA FORNIELES PARES SL',
    metodo_pago: 'Transferir',
    endereco: 'Arbúcies, Carrer Mossèn Jacint Verdaguer, núm. 21.',
    municipio: 'Arbúcies',
    provincia: 'Girona',
    codigo_postal: '17401',
    pais: 'España',
    ativo: true
  },
  {
    id: '36ad5b19-8e55-4e48-bc27-e358f4cffd1a',
    codigo: 'PV-0002',
    nome_razao_social: 'GROSCAN 98 S.L.',
    nome_comercial: 'GROSCAN 98',
    cif_nif: 'B87654321',
    tipo: 'alojamento',
    tipo_pessoa: 'Persona Jurídica',
    classificacao: 'Proveedor Alojamiento',
    contato_nome: 'Sr. Jordi Gros',
    telefone: '+34 655 88 99 00',
    email: 'info@groscan98.com',
    contatos: [
      { nome: 'Sr. Jordi Gros', cargo_tipo: 'Administrador', telefone: '+34 655 88 99 00', email: 'info@groscan98.com' }
    ],
    dados_bancarios: [
      { banco: 'CaixaBank', iban: 'ES21 2100 0418 4502 0005 1234', swift: 'CAIXESBBXXX', titular_conta: 'GROSCAN 98 S.L.', metodo_pago: 'Transferir', principal: true }
    ],
    banco: 'CaixaBank',
    iban: 'ES21 2100 0418 4502 0005 1234',
    swift: 'CAIXESBBXXX',
    titular_conta: 'GROSCAN 98 S.L.',
    metodo_pago: 'Transferir',
    endereco: 'Carrer de Balmes, 150',
    municipio: 'Barcelona',
    provincia: 'Barcelona',
    codigo_postal: '08008',
    pais: 'España',
    ativo: true
  }
];

const getLocalProvedores = (): Provedor[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_PROV);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  setLocalProvedores(INITIAL_PROVEDORES);
  return INITIAL_PROVEDORES;
};

const setLocalProvedores = (list: Provedor[]) => {
  try {
    localStorage.setItem(LOCAL_KEY_PROV, JSON.stringify(list));
  } catch (e) {}
};

const getLocalAlojamentos = (): Alojamento[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_ALOJ);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const setLocalAlojamentos = (list: Alojamento[]) => {
  try {
    localStorage.setItem(LOCAL_KEY_ALOJ, JSON.stringify(list));
  } catch (e) {}
};

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export const registrosService = {
  async fetchProvedores(): Promise<Provedor[]> {
    try {
      const { data, error } = await getClient()
        .from('provedores')
        .select('*')
        .order('nome_razao_social');

      if (!error && data && data.length > 0) {
        setLocalProvedores(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback para armazenamento local de provedores:', e);
    }
    return getLocalProvedores();
  },

  async fetchAlojamentos(): Promise<Alojamento[]> {
    try {
      const { data, error } = await getClient()
        .from('alojamentos')
        .select(`*, provedores(nome_razao_social, telefone)`)
        .order('nome');

      if (!error && data && data.length > 0) {
        const mapped = data.map((a: any) => ({
          ...a,
          titulo: a.nome || a.titulo,
          provedor: a.provedores || a.provedor
        }));
        setLocalAlojamentos(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fallback para armazenamento local de alojamentos:', e);
    }
    return getLocalAlojamentos();
  },

  async fetchProvedorById(id: string): Promise<Provedor | null> {
    try {
      const { data, error } = await getClient()
        .from('provedores')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data;
    } catch (e) {}
    
    const local = getLocalProvedores();
    return local.find(p => p.id === id) || null;
  },

  async createProvedor(provedor: Partial<Provedor>): Promise<Provedor> {
    const newId = provedor.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pv-${Date.now()}`);
    const item: Provedor = {
      id: newId,
      codigo: provedor.codigo || `PV-${Math.floor(1000 + Math.random() * 9000)}`,
      nome_razao_social: provedor.nome_razao_social || 'Sem Razão Social',
      nome_comercial: provedor.nome_comercial || provedor.nome_razao_social,
      cif_nif: provedor.cif_nif || '',
      tipo: 'alojamento',
      tipo_pessoa: provedor.tipo_pessoa || 'Persona Jurídica',
      classificacao: provedor.classificacao || 'Proveedor Alojamiento',
      contato_nome: provedor.contato_nome || '',
      telefone: provedor.telefone || '',
      email: provedor.email || '',
      contatos: provedor.contatos || [],
      dados_bancarios: provedor.dados_bancarios || [],
      banco: provedor.banco || '',
      iban: provedor.iban || '',
      swift: provedor.swift || '',
      titular_conta: provedor.titular_conta || '',
      metodo_pago: provedor.metodo_pago || 'Transferir',
      endereco: provedor.endereco || '',
      municipio: provedor.municipio || '',
      provincia: provedor.provincia || '',
      codigo_postal: provedor.codigo_postal || '',
      pais: provedor.pais || 'España',
      country_id: provedor.country_id || null,
      region_id: provedor.region_id || null,
      ativo: provedor.ativo ?? true,
    };

    // 1. Grava no cache persistente imediatamente
    const current = getLocalProvedores();
    const updated = [item, ...current.filter(p => p.id !== newId)];
    setLocalProvedores(updated);

    // 2. Tenta sincronizar com Supabase
    try {
      await getClient().from('provedores').insert([item]);
    } catch (e) {
      console.warn('Sincronização Supabase em background:', e);
    }

    return item;
  },

  async updateProvedor(id: string, provedor: Partial<Provedor>): Promise<Provedor> {
    const current = getLocalProvedores();
    const existing = current.find(p => p.id === id);
    const merged: Provedor = {
      ...(existing || {
        id,
        nome_razao_social: provedor.nome_razao_social || '',
        tipo: 'alojamento',
        ativo: true
      }),
      ...provedor,
      id,
      endereco: provedor.endereco !== undefined ? provedor.endereco : existing?.endereco || '',
      municipio: provedor.municipio !== undefined ? provedor.municipio : existing?.municipio || '',
      provincia: provedor.provincia !== undefined ? provedor.provincia : existing?.provincia || '',
      codigo_postal: provedor.codigo_postal !== undefined ? provedor.codigo_postal : existing?.codigo_postal || '',
      pais: provedor.pais !== undefined ? provedor.pais : existing?.pais || 'España',
    };

    // 1. Atualiza imediatamente no armazenamento local persistente
    const updatedList = current.map(p => p.id === id ? merged : p);
    if (!current.some(p => p.id === id)) {
      updatedList.push(merged);
    }
    setLocalProvedores(updatedList);

    // 2. Tenta sincronizar com Supabase
    try {
      await getClient().from('provedores').update(merged).eq('id', id);
    } catch (e) {
      console.warn('Sincronização Supabase em background:', e);
    }

    return merged;
  },

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    try {
      const { data, error } = await getClient()
        .from('alojamentos')
        .select(`*, provedores(nome_razao_social, telefone)`)
        .eq('id', id)
        .single();
      if (!error && data) {
        return {
          ...data,
          titulo: data.nome || data.titulo,
          provedor: data.provedores || data.provedor
        };
      }
    } catch (e) {}

    const local = getLocalAlojamentos();
    return local.find(a => a.id === id) || null;
  },

  async createAlojamento(alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const newId = alojamento.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `al-${Date.now()}`);
    const provs = getLocalProvedores();
    const linkedProv = provs.find(p => p.id === alojamento.provedor_id);

    const item: Alojamento = {
      id: newId,
      codigo: alojamento.codigo || `AL-${Math.floor(1000 + Math.random() * 9000)}`,
      provedor_id: alojamento.provedor_id,
      titulo: alojamento.titulo || alojamento.nome || 'Novo Alojamento',
      nome: alojamento.titulo || alojamento.nome || 'Novo Alojamento',
      tipo_alojamento: alojamento.tipo_alojamento || 'Fijo',
      classificacao: alojamento.classificacao || 'Privado',
      capacidade_pessoas: Number(alojamento.capacidade_pessoas) || 0,
      dormitorios: Number(alojamento.dormitorios) || 0,
      total_camas: Number(alojamento.total_camas) || 0,
      camas_individuais: Number(alojamento.camas_individuais) || 0,
      camas_duplas: Number(alojamento.camas_duplas) || 0,
      banheiros: Number(alojamento.banheiros) || 0,
      endereco: alojamento.endereco || '',
      municipio: alojamento.municipio || '',
      provincia: alojamento.provincia || '',
      codigo_postal: alojamento.codigo_postal || '',
      pais: alojamento.pais || 'España',
      country_id: alojamento.country_id || null,
      region_id: alojamento.region_id || null,
      comodidades: alojamento.comodidades || {},
      suministros: alojamento.suministros || {},
      valor_mensal: alojamento.valor_mensal,
      ativo: alojamento.ativo ?? true,
      provedor: linkedProv ? { nome_razao_social: linkedProv.nome_razao_social, telefone: linkedProv.telefone } : undefined
    };

    const current = getLocalAlojamentos();
    const updated = [item, ...current.filter(a => a.id !== newId)];
    setLocalAlojamentos(updated);

    try {
      await getClient().from('alojamentos').insert([item]);
    } catch (e) {}

    return item;
  },

  async updateAlojamento(id: string, alojamento: Partial<Alojamento>): Promise<Alojamento> {
    const current = getLocalAlojamentos();
    const existing = current.find(a => a.id === id);
    const provs = getLocalProvedores();
    const linkedProv = provs.find(p => p.id === (alojamento.provedor_id || existing?.provedor_id));

    const merged: Alojamento = {
      ...(existing || {
        id,
        titulo: alojamento.titulo || '',
        capacidade_pessoas: 0,
        dormitorios: 0,
        total_camas: 0,
        camas_individuais: 0,
        camas_duplas: 0,
        banheiros: 0,
        ativo: true
      }),
      ...alojamento,
      id,
      titulo: alojamento.titulo || alojamento.nome || existing?.titulo || '',
      nome: alojamento.titulo || alojamento.nome || existing?.nome || '',
      endereco: alojamento.endereco !== undefined ? alojamento.endereco : existing?.endereco || '',
      municipio: alojamento.municipio !== undefined ? alojamento.municipio : existing?.municipio || '',
      provincia: alojamento.provincia !== undefined ? alojamento.provincia : existing?.provincia || '',
      codigo_postal: alojamento.codigo_postal !== undefined ? alojamento.codigo_postal : existing?.codigo_postal || '',
      pais: alojamento.pais !== undefined ? alojamento.pais : existing?.pais || 'España',
      provedor: linkedProv ? { nome_razao_social: linkedProv.nome_razao_social, telefone: linkedProv.telefone } : existing?.provedor
    };

    const updatedList = current.map(a => a.id === id ? merged : a);
    if (!current.some(a => a.id === id)) {
      updatedList.push(merged);
    }
    setLocalAlojamentos(updatedList);

    try {
      await getClient().from('alojamentos').update(merged).eq('id', id);
    } catch (e) {}

    return merged;
  },

  async deleteProvedor(id: string): Promise<boolean> {
    const current = getLocalProvedores();
    setLocalProvedores(current.filter(p => p.id !== id));
    try {
      await getClient().from('provedores').delete().eq('id', id);
    } catch (e) {}
    return true;
  },

  async deleteAlojamento(id: string): Promise<boolean> {
    const current = getLocalAlojamentos();
    setLocalAlojamentos(current.filter(a => a.id !== id));
    try {
      await getClient().from('alojamentos').delete().eq('id', id);
    } catch (e) {}
    return true;
  }
};
