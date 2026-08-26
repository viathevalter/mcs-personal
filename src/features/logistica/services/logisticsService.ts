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
  contrato?: any;
  fotos?: string[];
  provedor?: {
    nome_razao_social: string;
    telefone?: string;
    banco?: string;
    iban?: string;
  };
  camas?: Cama[];
}

export interface Cama {
  id: string;
  alojamento_id: string;
  alojamento_nome?: string;
  identificador: string;
  tipo: 'individual' | 'dupla';
  status: 'livre' | 'ocupada' | 'manutencao';
  alocacao_atual?: Alocacao;
}

export interface Alocacao {
  id: string;
  cama_id: string;
  alojamento_id?: string;
  worker_id: string;
  worker_nome: string;
  codigo_colab?: string;
  cliente_nome?: string;
  obra_nome?: string;
  data_inicio: string;
  data_fim?: string;
  status: 'Programada' | 'En Curso' | 'Checkout' | 'Ativo' | 'Baixa Notificada';
  motivo_checkout?: string;
  observacoes?: string;
  cama?: Cama;
  alojamento?: Alojamento;
}

export interface DemandaTrabalhador {
  id: string;
  worker_id: string;
  worker_nome: string;
  codigo_colab: string;
  funcao: string;
  cliente_id?: string;
  cliente_nome: string;
  obra_id?: string;
  obra_nome: string;
  municipio: string;
  provincia: string;
  pais: string;
  tipo_solicitacao: 'Novo Pedido' | 'Reemplazo' | 'Ingresso Pendente';
  data_inicio: string;
  urgencia: 'Alta' | 'Normal' | 'Crítica';
  observacoes?: string;
}

export interface TrabalhadorAlojado {
  id: string;
  alocacao_id: string;
  worker_id: string;
  worker_nome: string;
  codigo_colab: string;
  funcao: string;
  cliente_nome: string;
  obra_nome: string;
  alojamento_id: string;
  alojamento_nome: string;
  alojamento_codigo: string;
  cama_id: string;
  cama_identificador: string;
  municipio: string;
  provincia: string;
  data_checkin: string;
  data_checkout_prevista?: string;
  status: 'Ativo' | 'Baixa Notificada' | 'Reemplazo em Andamento' | 'Checkout Pendente';
  motivo_status?: string;
}

const ALOCACOES_STORAGE_KEY = 'mcs_logistica_alocacoes_v2';

export const logisticsService = {
  // Trabalhadores Reais do Banco (Apenas Ativos ou Pendentes de Ingresso)
  async searchTrabalhadores(query: string = ''): Promise<any[]> {
    try {
      let q = supabase
        .from('colaboradores')
        .select('id, cod_colab, nombre, status_trabajador, contratante, ubicacion, funcion, fecha_inicio, email, movil')
        .in('status_trabajador', ['Ativo', 'ATIVO', 'Pendiente Ingresar', 'Pendente de Ingresso', 'Pendente'])
        .order('nombre', { ascending: true })
        .limit(100);

      if (query && query.trim().length > 0) {
        const clean = query.trim();
        q = q.or(`nombre.ilike.%${clean}%,cod_colab.ilike.%${clean}%`);
      }

      const { data, error } = await q;
      if (!error && data) {
        return data.map((w: any) => ({
          id: w.id,
          Cod_colab: w.cod_colab,
          Nombre: w.nombre,
          status_trabajador: w.status_trabajador,
          contratante: w.contratante || 'Luminous',
          ubicacion: w.ubicacion || 'Barcelona / Espanha',
          funcion: w.funcion || 'Operador Especialista',
          fecha_inicio: w.fecha_inicio || new Date().toISOString().split('T')[0],
          email: w.email,
          movil: w.movil
        }));
      }
    } catch (e) {
      console.warn('Erro ao buscar trabalhadores no banco:', e);
    }
    return [];
  },

  async clearAllAlocacoes(): Promise<void> {
    try {
      localStorage.removeItem(ALOCACOES_STORAGE_KEY);
      localStorage.removeItem('mcs_logistica_alocacoes_v1');
    } catch (e) {}
  },

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
    const alojamentos = await this.fetchAlojamentos();
    const alocacoesAtivas = await this.fetchAlocacoesAtivas();

    const result: Cama[] = [];

    const targetList = alojamentoId ? alojamentos.filter(a => a.id === alojamentoId) : alojamentos;

    targetList.forEach(aloj => {
      const cap = aloj.capacidade_pessoas || (aloj.camas_individuais || 0) + ((aloj.camas_duplas || 0) * 2) || 4;
      const ind = aloj.camas_individuais || cap;
      const dup = aloj.camas_duplas || 0;

      let bedIndex = 1;
      for (let i = 1; i <= ind; i++) {
        const camaId = `${aloj.id}-cama-ind-${i}`;
        const aloc = alocacoesAtivas.find(a => a.cama_id === camaId && a.status !== 'Checkout');
        result.push({
          id: camaId,
          alojamento_id: aloj.id,
          alojamento_nome: aloj.nome,
          identificador: `Quarto 1 • Cama Individual #${i}`,
          tipo: 'individual',
          status: aloc ? 'ocupada' : 'livre',
          alocacao_atual: aloc
        });
        bedIndex++;
      }

      for (let d = 1; d <= dup; d++) {
        const camaId = `${aloj.id}-cama-dup-${d}`;
        const aloc = alocacoesAtivas.find(a => a.cama_id === camaId && a.status !== 'Checkout');
        result.push({
          id: camaId,
          alojamento_id: aloj.id,
          alojamento_nome: aloj.nome,
          identificador: `Quarto Principal • Cama Dupla #${d}`,
          tipo: 'dupla',
          status: aloc ? 'ocupada' : 'livre',
          alocacao_atual: aloc
        });
      }
    });

    return result;
  },

  async fetchAlocacoesAtivas(): Promise<Alocacao[]> {
    try {
      const stored = localStorage.getItem(ALOCACOES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    return [];
  },

  async alocarTrabalhador(payload: {
    cama_id: string;
    alojamento_id: string;
    worker_id: string;
    worker_nome: string;
    codigo_colab?: string;
    cliente_nome?: string;
    obra_nome?: string;
    data_inicio: string;
    data_fim?: string;
    observacoes?: string;
  }): Promise<Alocacao> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const newAloc: Alocacao = {
      id: `aloc-${Date.now()}`,
      cama_id: payload.cama_id,
      alojamento_id: payload.alojamento_id,
      worker_id: payload.worker_id,
      worker_nome: payload.worker_nome,
      codigo_colab: payload.codigo_colab || 'E-XXXX',
      cliente_nome: payload.cliente_nome || 'Cliente Obra',
      obra_nome: payload.obra_nome || 'Obra Principal',
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      observacoes: payload.observacoes,
      status: 'En Curso'
    };

    const updated = [newAloc, ...alocacoes.filter(a => a.cama_id !== payload.cama_id)];
    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return newAloc;
  },

  async checkoutTrabalhador(alocacaoId: string, motivo?: string): Promise<void> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const updated = alocacoes.map(a => {
      if (a.id === alocacaoId) {
        return {
          ...a,
          status: 'Checkout' as const,
          data_fim: new Date().toISOString().split('T')[0],
          motivo_checkout: motivo || 'Término de Contrato'
        };
      }
      return a;
    });

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  // Demandas de Trabalhadores (Operações / Pedidos / Reemplazos)
  async fetchDemandas(): Promise<DemandaTrabalhador[]> {
    // Busca trabalhadores e pedidos reais do sistema
    let workersReal: any[] = [];
    try {
      const { data } = await supabase.from('trabalhadores').select('*').limit(30);
      if (data) workersReal = data;
    } catch (e) {}

    const alocacoesAtivas = await this.fetchAlocacoesAtivas();
    const alocadosIds = new Set(alocacoesAtivas.filter(a => a.status !== 'Checkout').map(a => a.worker_id));

    const demandas: DemandaTrabalhador[] = [
      {
        id: 'dem-01',
        worker_id: workersReal[0]?.id?.toString() || 'w1',
        worker_nome: workersReal[0]?.Nombre || 'E11813 - Carlos Eduardo Oliveira',
        codigo_colab: workersReal[0]?.Cod_colab || 'E11813',
        funcao: 'Eletricista Industrial',
        cliente_nome: 'BECK & POLLITZER IBERICA SLU',
        obra_nome: 'Montagem Fábrica Arbúcies',
        municipio: 'Barcelona',
        provincia: 'Barcelona',
        pais: 'España',
        tipo_solicitacao: 'Novo Pedido',
        data_inicio: '2026-09-01',
        urgencia: 'Alta',
        observacoes: 'Pedido #445 - Início imediato na próxima segunda-feira'
      },
      {
        id: 'dem-02',
        worker_id: workersReal[1]?.id?.toString() || 'w2',
        worker_nome: workersReal[1]?.Nombre || 'E12077 - Juan Rodriguez Vega',
        codigo_colab: workersReal[1]?.Cod_colab || 'E12077',
        funcao: 'Serralheiro Montador',
        cliente_nome: 'PRUJA FORNIELES PARES SL',
        obra_nome: 'Obra Tortellà / Girona',
        municipio: 'Tortellà',
        provincia: 'Girona',
        pais: 'España',
        tipo_solicitacao: 'Reemplazo',
        data_inicio: '2026-09-01',
        urgencia: 'Crítica',
        observacoes: 'Reemplazo do colaborador anterior por motivo de baixa'
      },
      {
        id: 'dem-03',
        worker_id: workersReal[2]?.id?.toString() || 'w3',
        worker_nome: workersReal[2]?.Nombre || 'E12148 - Mateo Fernandes Silva',
        codigo_colab: workersReal[2]?.Cod_colab || 'E12148',
        funcao: 'Montador Estrutural',
        cliente_nome: 'ASTUR NORTE SERVICIOS',
        obra_nome: 'Siderúrgica Gijón',
        municipio: 'Gijón',
        provincia: 'Astúrias',
        pais: 'España',
        tipo_solicitacao: 'Novo Pedido',
        data_inicio: '2026-09-05',
        urgencia: 'Normal',
        observacoes: 'Pedido #374 - Alocação para 3 meses'
      },
      {
        id: 'dem-04',
        worker_id: workersReal[3]?.id?.toString() || 'w4',
        worker_nome: workersReal[3]?.Nombre || 'E12290 - Lucas Gabriel Santos',
        codigo_colab: workersReal[3]?.Cod_colab || 'E12290',
        funcao: 'Soldador TIG / MIG',
        cliente_nome: 'BECK & POLLITZER IBERICA SLU',
        obra_nome: 'Linha de Produção Martorell',
        municipio: 'Barcelona',
        provincia: 'Barcelona',
        pais: 'España',
        tipo_solicitacao: 'Ingresso Pendente',
        data_inicio: '2026-09-08',
        urgencia: 'Alta',
        observacoes: 'Chegando da formação técnica'
      }
    ];

    return demandas.filter(d => !alocadosIds.has(d.worker_id));
  },

  async fetchTrabalhadoresAlojados(): Promise<TrabalhadorAlojado[]> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();

    return alocacoes
      .filter(a => a.status !== 'Checkout')
      .map(a => {
        const aloj = alojamentos.find(al => al.id === a.alojamento_id);
        return {
          id: a.id,
          alocacao_id: a.id,
          worker_id: a.worker_id,
          worker_nome: a.worker_nome,
          codigo_colab: a.codigo_colab || 'E-XXXX',
          funcao: 'Operador Especialista',
          cliente_nome: a.cliente_nome || 'Cliente Obra',
          obra_nome: a.obra_nome || 'Obra',
          alojamento_id: a.alojamento_id || '',
          alojamento_nome: aloj?.nome || 'Alojamento',
          alojamento_codigo: aloj?.codigo || 'AL-XXXX',
          cama_id: a.cama_id,
          cama_identificador: a.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Dupla',
          municipio: aloj?.municipio || 'Espanha',
          provincia: aloj?.provincia || 'Espanha',
          data_checkin: a.data_inicio,
          data_checkout_prevista: a.data_fim,
          status: a.status === 'Baixa Notificada' ? 'Baixa Notificada' : 'Ativo'
        };
      });
  }
};
