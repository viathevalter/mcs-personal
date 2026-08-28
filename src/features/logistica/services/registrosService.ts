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

export interface ContratoInfo {
  codigo?: string;
  status?: string;
  renovacao_automatica?: boolean;
  aviso_renovacao_dias?: number;
  data_inicio?: string;
  data_fim?: string;
  dia_vencimento?: number;
  valor_mensal?: number;
  valor_por_pessoa?: number;
  tipo_contrato?: string;
  tem_fianza?: boolean;
  fianza_valor?: number;
  fianza_meses?: number;
  metodo_pago?: string;
  banco?: string;
  iban?: string;
  swift?: string;
  titular?: string;
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
  latitude?: number | string | null;
  longitude?: number | string | null;
  country_id?: string | null;
  region_id?: string | null;
  comodidades?: {
    wifi?: boolean;
    aire_acondicionado?: boolean;
    parking?: boolean;
    cocina?: boolean;
    calefaccion?: boolean;
    lavadora?: boolean;
    tv?: boolean;
    ascensor?: boolean;
    [key: string]: any;
  };
  suministros?: {
    internet?: boolean;
    agua?: boolean;
    luz?: boolean;
    gas?: boolean;
    limpieza?: boolean;
    otros?: boolean;
    [key: string]: any;
  };
  fotos?: string[];
  contrato?: ContratoInfo;
  valor_mensal?: number;
  observacoes?: string;
  status?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  provedor?: {
    id?: string;
    codigo?: string;
    nome_razao_social: string;
    telefone?: string;
    banco?: string;
    iban?: string;
    swift?: string;
    titular_conta?: string;
    metodo_pago?: string;
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
    ativo: p.ativo !== false && p.status !== 'Inactivo' && p.status !== 'inativo'
  };
};

const buildAlojamentoPayload = (input: any) => {
  const comodidadesMeta = {
    ...(input.comodidades || {}),
    __fotos: input.fotos || [],
    __contrato: input.contrato || {},
    __created_at: input.created_at || new Date().toISOString()
  };

  const name = input.titulo || input.nome || 'Novo Alojamento';
  const isInactive = input.ativo === false || (input.status || '').toLowerCase().includes('ina');

  const payload: any = {
    nome: name,
    titulo: name,
    endereco: input.endereco || '',
    tipo_alojamento: input.tipo_alojamento || 'Fijo',
    classificacao: input.classificacao || 'Privado',
    capacidade_total: Number(input.capacidade_pessoas) || Number(input.capacidade_total) || 0,
    capacidade_pessoas: Number(input.capacidade_pessoas) || Number(input.capacidade_total) || 0,
    dormitorios: Number(input.dormitorios) || 0,
    total_camas: Number(input.total_camas) || 0,
    camas_individuais: Number(input.camas_individuais) || 0,
    camas_duplas: Number(input.camas_duplas) || 0,
    banheiros: Number(input.banheiros) || 0,
    municipio: input.municipio || '',
    provincia: input.provincia || '',
    pais: input.pais || 'España',
    codigo_postal: input.codigo_postal || '',
    comodidades: comodidadesMeta,
    suministros: input.suministros || {},
    valor_mensal: input.valor_mensal || input.contrato?.valor_mensal || null,
    custo_mensal_total: input.valor_mensal || input.contrato?.valor_mensal || null,
    observacoes: input.observacoes || '',
    status: isInactive ? 'inativo' : 'ativo'
  };

  if (input.created_at) payload.created_at = input.created_at;

  if (input.latitude !== undefined && input.latitude !== null && input.latitude !== '') {
    const latNum = typeof input.latitude === 'string' ? parseFloat(input.latitude.replace(',', '.')) : input.latitude;
    payload.latitude = !isNaN(latNum) ? latNum : null;
  }
  if (input.longitude !== undefined && input.longitude !== null && input.longitude !== '') {
    const lngNum = typeof input.longitude === 'string' ? parseFloat(input.longitude.replace(',', '.')) : input.longitude;
    payload.longitude = !isNaN(lngNum) ? lngNum : null;
  }

  if (input.provedor_id) payload.provedor_id = input.provedor_id;
  if (input.codigo) payload.codigo = input.codigo;

  return payload;
};

const hydrateAlojamento = (a: any): Alojamento => {
  if (!a) return a;
  const comodidades = a.comodidades || {};
  const fotos = a.fotos || comodidades.__fotos || [];
  const contrato = a.contrato || comodidades.__contrato || {};
  const createdAt = a.created_at || comodidades.__created_at || a.data_cadastro || undefined;

  return {
    ...a,
    titulo: a.nome || a.titulo || '',
    nome: a.nome || a.titulo || '',
    endereco: a.endereco || '',
    municipio: a.municipio || '',
    provincia: a.provincia || '',
    pais: a.pais || 'España',
    codigo_postal: a.codigo_postal || '',
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    comodidades: comodidades,
    suministros: a.suministros || {},
    fotos: Array.isArray(fotos) ? fotos : [],
    contrato: contrato,
    valor_mensal: a.valor_mensal || a.custo_mensal_total || contrato.valor_mensal,
    capacidade_pessoas: a.capacidade_pessoas || a.capacidade_total || 0,
    observacoes: a.observacoes || '',
    status: a.status === 'inativo' || a.status === 'Inactivo' ? 'Inactivo' : 'Activo',
    provedor: a.provedores || a.provedor,
    ativo: a.status !== 'inativo' && a.status !== 'Inactivo' && a.ativo !== false,
    created_at: createdAt
  };
};

async function fetchAllTableRows(tableName: string): Promise<any[]> {
  const client = getClient();
  let allRows: any[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .range(from, from + step - 1);

    if (error) {
      console.warn(`Error fetching range ${from}-${from + step - 1} on ${tableName}:`, error);
      if (from === 0) {
        const fallback = await client.from(tableName).select('*');
        return fallback.data || [];
      }
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < step) {
      break;
    }

    from += step;
  }

  return allRows;
}

export const registrosService = {
  async fetchProvedores(): Promise<Provedor[]> {
    try {
      const data = await fetchAllTableRows('provedores');
      return data.map(hydrateProvedor);
    } catch (e) {
      console.warn('Erro ao buscar provedores:', e);
      return [];
    }
  },

  async fetchAlojamentos(): Promise<Alojamento[]> {
    try {
      const [alojData, provRaw] = await Promise.all([
        fetchAllTableRows('alojamentos'),
        fetchAllTableRows('provedores')
      ]);

      const provData = provRaw.map(hydrateProvedor);

      return alojData.map((a: any) => {
        const matchingProv = provData.find(p => p.id === a.provedor_id);
        const hydrated = hydrateAlojamento(a);
        if (matchingProv) {
          hydrated.provedor = matchingProv;
        }
        return hydrated;
      });
    } catch (err) {
      console.warn('Erro ao buscar alojamentos:', err);
      const basic = await getClient().from('alojamentos').select('*');
      return (basic.data || []).map(hydrateAlojamento);
    }
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

      if (error.message) {
        if (error.message.includes('Could not find the')) {
          const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
          if (missingMatch && missingMatch[1]) {
            delete payload[missingMatch[1]];
            continue;
          }
        }
        if (error.message.includes('violates not-null constraint')) {
          const notNullMatch = error.message.match(/column "([^"]+)"/);
          if (notNullMatch && notNullMatch[1]) {
            payload[notNullMatch[1]] = payload.nome_razao_social || 'Proveedor';
            continue;
          }
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

      if (error.message) {
        if (error.message.includes('Could not find the')) {
          const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
          if (missingMatch && missingMatch[1]) {
            delete payload[missingMatch[1]];
            continue;
          }
        }
        if (error.message.includes('violates not-null constraint')) {
          const notNullMatch = error.message.match(/column "([^"]+)"/);
          if (notNullMatch && notNullMatch[1]) {
            payload[notNullMatch[1]] = payload.nome_razao_social || 'Proveedor';
            continue;
          }
        }
      }

      throw error;
    }
    throw new Error('Falha ao atualizar provedor.');
  },

  async fetchAlojamentoById(id: string): Promise<Alojamento | null> {
    const { data, error } = await getClient()
      .from('alojamentos')
      .select(`*, provedores(id, codigo, nome_razao_social, telefone, banco, iban, swift, titular_conta, metodo_pago)`)
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

      if (error.message) {
        if (error.message.includes('Could not find the')) {
          const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
          if (missingMatch && missingMatch[1]) {
            delete payload[missingMatch[1]];
            continue;
          }
        }
        if (error.message.includes('violates not-null constraint')) {
          const notNullMatch = error.message.match(/column "([^"]+)"/);
          if (notNullMatch && notNullMatch[1]) {
            payload[notNullMatch[1]] = payload.nome || payload.titulo || 'Alojamento';
            continue;
          }
        }
        if (error.message.includes('alojamentos_codigo_key') || error.message.includes('duplicate key value')) {
          try {
            const { data: allCodes } = await client.from('alojamentos').select('codigo');
            let maxN = 0;
            (allCodes || []).forEach((item: any) => {
              if (item.codigo) {
                const m = item.codigo.match(/AL-(\d+)/i);
                if (m && m[1]) {
                  const n = parseInt(m[1], 10);
                  if (n > maxN) maxN = n;
                }
              }
            });
            const nextAutoCode = `AL-${String(maxN + 1).padStart(4, '0')}`;
            payload.codigo = nextAutoCode;
            if (payload.nome && payload.nome.includes('AL-')) {
              payload.nome = payload.nome.replace(/AL-\d+/i, nextAutoCode);
            }
            if (payload.titulo && payload.titulo.includes('AL-')) {
              payload.titulo = payload.titulo.replace(/AL-\d+/i, nextAutoCode);
            }
            continue;
          } catch (codeErr) {
            console.warn('Erro ao resolver codigo duplicado:', codeErr);
          }
        }
        if (error.message.includes('invalid input value for enum')) {
          payload.status = 'ativo';
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

      if (error.message) {
        if (error.message.includes('Could not find the')) {
          const missingMatch = error.message.match(/Could not find the '([^']+)' column/);
          if (missingMatch && missingMatch[1]) {
            delete payload[missingMatch[1]];
            continue;
          }
        }
        if (error.message.includes('violates not-null constraint')) {
          const notNullMatch = error.message.match(/column "([^"]+)"/);
          if (notNullMatch && notNullMatch[1]) {
            payload[notNullMatch[1]] = payload.nome || payload.titulo || 'Alojamento';
            continue;
          }
        }
        if (error.message.includes('alojamentos_codigo_key') || error.message.includes('duplicate key value')) {
          try {
            const { data: allCodes } = await client.from('alojamentos').select('codigo');
            let maxN = 0;
            (allCodes || []).forEach((item: any) => {
              if (item.codigo) {
                const m = item.codigo.match(/AL-(\d+)/i);
                if (m && m[1]) {
                  const n = parseInt(m[1], 10);
                  if (n > maxN) maxN = n;
                }
              }
            });
            const nextAutoCode = `AL-${String(maxN + 1).padStart(4, '0')}`;
            payload.codigo = nextAutoCode;
            if (payload.nome && payload.nome.includes('AL-')) {
              payload.nome = payload.nome.replace(/AL-\d+/i, nextAutoCode);
            }
            if (payload.titulo && payload.titulo.includes('AL-')) {
              payload.titulo = payload.titulo.replace(/AL-\d+/i, nextAutoCode);
            }
            continue;
          } catch (codeErr) {
            console.warn('Erro ao resolver codigo duplicado:', codeErr);
          }
        }
        if (error.message.includes('invalid input value for enum')) {
          payload.status = 'ativo';
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
