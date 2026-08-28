import { supabase } from '@/shared/supabase/client';
import { registrosService } from './registrosService';
import importedAllocations from '../data/imported_allocations.json';

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
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  pedido_id?: string;
  pedido_codigo?: string;
  data_inicio: string;
  data_fim?: string;
  status: 'Programada' | 'En Curso' | 'Checkout' | 'Ativo' | 'Baixa Notificada' | 'Alojamiento Propio';
  motivo_checkout?: string;
  observacoes?: string;
  tipo_alojamento?: string;
  empresa_contratante?: string;
  custo_alojamento?: number;
  contacto_hospedaje?: string;
  worker_movil?: string;
  cama?: Cama;
  alojamento?: Alojamento;
}

export interface TrabalhadorDemandaItem {
  assignment_id?: string;
  worker_id: string;
  worker_nome: string;
  codigo_colab: string;
  nif?: string;
  movil?: string;
  funcao: string;
  data_inicio: string;
  data_fim?: string;
  status_alocacao: 'pendente' | 'alocado';
  alocacao_detalhe?: {
    alocacao_id: string;
    alojamento_id: string;
    alojamento_nome: string;
    alojamento_codigo?: string;
    cama_id: string;
    cama_identificador: string;
    data_inicio: string;
    data_fim?: string;
  };
}

export interface PedidoDemandaLogistica {
  pedido_id: string;
  pedido_codigo: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_contato?: string;
  empresa_id?: string;
  empresa_contratante: string;
  obra_nome: string;
  endereco_completo: string;
  cidade: string;
  provincia?: string;
  codigo_postal?: string;
  encarregado_nome?: string;
  encarregado_telefone?: string;
  encarregado_email?: string;
  data_inicio: string;
  data_inicio_diasemana?: string;
  data_fim?: string;
  data_fim_diasemana?: string;
  dias_restantes: number;
  duracao_texto: string;
  duracao_dias?: number;
  tipo_solicitacao: 'Nuevo Pedido' | 'Reemplazo';
  status_operacional?: string;
  observacoes?: string;
  total_vagas_pedido: number;
  total_contratados: number;
  total_alojados: number;
  total_pendentes_alojamento: number;
  trabalhadores: TrabalhadorDemandaItem[];
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
  pedido_codigo?: string;
  empresa_contratante?: string;
  alojamento_id: string;
  alojamento_nome: string;
  alojamento_codigo: string;
  cama_id: string;
  cama_identificador: string;
  municipio: string;
  provincia: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  data_checkin: string;
  data_checkout_prevista?: string;
  status: 'Ativo' | 'Baixa Notificada' | 'Reemplazo em Andamento' | 'Checkout Pendente' | 'Alojamiento Propio';
  tipo_alojamento?: string;
  custo_alojamento?: number;
  contacto_hospedaje?: string;
  worker_movil?: string;
  motivo_status?: string;
}

const ALOCACOES_STORAGE_KEY = 'mcs_logistica_alocacoes_v2';

function getWeekDayEs(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[date.getDay()] || '';
    }
  } catch (e) {}
  return '';
}

function calculateDurationText(startStr: string, endStr?: string): string {
  if (!endStr) return 'Duración no definida';
  try {
    const pStart = startStr.split('-');
    const pEnd = endStr.split('-');
    if (pStart.length === 3 && pEnd.length === 3) {
      const dStart = new Date(parseInt(pStart[0]), parseInt(pStart[1]) - 1, parseInt(pStart[2]));
      const dEnd = new Date(parseInt(pEnd[0]), parseInt(pEnd[1]) - 1, parseInt(pEnd[2]));
      const diffMs = dEnd.getTime() - dStart.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return '1 día';
      if (diffDays < 30) return `${diffDays} días`;

      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;

      if (remainingDays === 0) {
        return `${months} ${months === 1 ? 'mes' : 'meses'}`;
      }
      return `${months} ${months === 1 ? 'mes' : 'meses'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`;
    }
  } catch (e) {}
  return 'Duración estimada';
}

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
    return (await registrosService.fetchAlojamentoById(id)) as Alojamento | null;
  },

  async deleteAlojamento(id: string): Promise<boolean> {
    return await registrosService.deleteAlojamento(id);
  },

  // Camas & Estrutura de Vagas Dinâmicas
  async fetchCamas(): Promise<Cama[]> {
    const alojamentos = await this.fetchAlojamentos();
    const alocacoesAtivas = await this.fetchAlocacoesAtivas();
    const result: Cama[] = [];

    alojamentos.forEach(aloj => {
      const cap = aloj.capacidade_pessoas || (aloj.camas_individuais || 0) + ((aloj.camas_duplas || 0) * 2) || 4;
      const ind = aloj.camas_individuais || cap;
      const dup = aloj.camas_duplas || 0;

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
      let localAlocs: Alocacao[] = [];
      if (stored) {
        localAlocs = JSON.parse(stored);
      }

      const localWorkerIds = new Set(localAlocs.map(a => a.worker_id));
      const initialFromSheet: Alocacao[] = (importedAllocations as any[]).filter(
        a => !localWorkerIds.has(a.worker_id)
      );

      return [...localAlocs, ...initialFromSheet];
    } catch (e) {
      return (importedAllocations as any[]) || [];
    }
  },

  async registrarAlojamentoPropio(payload: {
    worker_id: string;
    worker_nome: string;
    codigo_colab?: string;
    cliente_nome?: string;
    obra_nome?: string;
    pedido_id?: string;
    pedido_codigo?: string;
    data_inicio: string;
    data_fim?: string;
    observacoes?: string;
    empresa_contratante?: string;
    custo_alojamento?: number;
  }): Promise<Alocacao> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const newAloc: Alocacao = {
      id: `propio-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      cama_id: `propio-cama-${payload.worker_id}`,
      alojamento_id: 'propio',
      worker_id: payload.worker_id,
      worker_nome: payload.worker_nome,
      codigo_colab: payload.codigo_colab || 'E-XXXX',
      cliente_nome: payload.cliente_nome || 'Cliente Obra',
      obra_nome: payload.obra_nome || 'Obra Principal',
      pedido_id: payload.pedido_id,
      pedido_codigo: payload.pedido_codigo,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      observacoes: payload.observacoes || 'Alojamiento Propio / Por Cuenta Propia',
      status: 'Alojamiento Propio',
      tipo_alojamento: 'Propio',
      empresa_contratante: payload.empresa_contratante || 'LUMINOUS',
      custo_alojamento: payload.custo_alojamento || 0,
      alojamento: {
        id: 'propio',
        nome: 'Alojamiento Propio / Por Cuenta Propia',
        codigo: 'PROP-001',
        capacidade_pessoas: 1,
        dormitorios: 1,
        total_camas: 1,
        camas_individuais: 1,
        camas_duplas: 0,
        banheiros: 1,
        municipio: payload.obra_nome || 'España'
      }
    };

    const filtered = alocacoes.filter(a => a.worker_id !== payload.worker_id);
    const updated = [newAloc, ...filtered];

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return newAloc;
  },

  async alocarTrabalhador(payload: {
    cama_id: string;
    alojamento_id: string;
    worker_id: string;
    worker_nome: string;
    codigo_colab?: string;
    cliente_nome?: string;
    obra_nome?: string;
    pedido_id?: string;
    pedido_codigo?: string;
    data_inicio: string;
    data_fim?: string;
    observacoes?: string;
  }): Promise<Alocacao> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();
    const aloj = alojamentos.find(a => a.id === payload.alojamento_id);

    const newAloc: Alocacao = {
      id: `aloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      cama_id: payload.cama_id,
      alojamento_id: payload.alojamento_id,
      worker_id: payload.worker_id,
      worker_nome: payload.worker_nome,
      codigo_colab: payload.codigo_colab || 'E-XXXX',
      cliente_nome: payload.cliente_nome || 'Cliente Obra',
      obra_nome: payload.obra_nome || 'Obra Principal',
      pedido_id: payload.pedido_id,
      pedido_codigo: payload.pedido_codigo,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      observacoes: payload.observacoes,
      status: 'En Curso',
      alojamento: aloj
    };

    // Remove alocação prévia da mesma cama ou do mesmo trabalhador para evitar duplicidade
    const filtered = alocacoes.filter(a => a.cama_id !== payload.cama_id && a.worker_id !== payload.worker_id);
    const updated = [newAloc, ...filtered];
    
    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return newAloc;
  },

  // Alocação em Lote para Múltiplos Trabalhadores do mesmo Pedido
  async alocarGrupoEmAlojamento(
    items: Array<{
      worker_id: string;
      worker_nome: string;
      codigo_colab?: string;
      cama_id: string;
    }>,
    alojamento_id: string,
    pedidoContext: {
      pedido_id?: string;
      pedido_codigo?: string;
      cliente_nome?: string;
      obra_nome?: string;
      data_inicio: string;
      data_fim?: string;
      observacoes?: string;
    }
  ): Promise<Alocacao[]> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();
    const aloj = alojamentos.find(a => a.id === alojamento_id);

    const newAllocations: Alocacao[] = [];
    const usedCamaIds = new Set(items.map(i => i.cama_id));
    const usedWorkerIds = new Set(items.map(i => i.worker_id));

    items.forEach(item => {
      const newAloc: Alocacao = {
        id: `aloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        cama_id: item.cama_id,
        alojamento_id: alojamento_id,
        worker_id: item.worker_id,
        worker_nome: item.worker_nome,
        codigo_colab: item.codigo_colab || 'E-XXXX',
        cliente_nome: pedidoContext.cliente_nome || 'Cliente Obra',
        obra_nome: pedidoContext.obra_nome || 'Obra Principal',
        pedido_id: pedidoContext.pedido_id,
        pedido_codigo: pedidoContext.pedido_codigo,
        data_inicio: pedidoContext.data_inicio,
        data_fim: pedidoContext.data_fim,
        observacoes: pedidoContext.observacoes,
        status: 'En Curso',
        alojamento: aloj
      };
      newAllocations.push(newAloc);
    });

    const filtered = alocacoes.filter(a => !usedCamaIds.has(a.cama_id) && !usedWorkerIds.has(a.worker_id));
    const updated = [...newAllocations, ...filtered];

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return newAllocations;
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

  // Demandas de Logística Agrupadas por Pedido Comercial Real & Trabalhadores Contratados
  async fetchDemandasPorPedido(): Promise<PedidoDemandaLogistica[]> {
    try {
      // 1. Buscar Pedidos Comerciais Ativos
      const { data: pedidos, error: pedErr } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .neq('operational_status', 'cancelled')
        .order('created_at', { ascending: false });

      if (pedErr || !pedidos || pedidos.length === 0) {
        return [];
      }

      const pedidoIds = pedidos.map(p => p.id);
      const clientIds = [...new Set(pedidos.map(p => p.client_id).filter(Boolean))];
      const siteIds = [...new Set(pedidos.map(p => p.client_site_id).filter(Boolean))];
      const empresaIds = [...new Set(pedidos.map(p => p.empresa_id).filter(Boolean))];

      // 2. Buscar Clientes, Obras (Sites), Empresas e Itens dos Pedidos
      const [clientsRes, sitesRes, empresasRes, itemsRes, assignmentsRes, alocacoesAtivas, alojamentos] = await Promise.all([
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name, phone, email').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code, contact_name, contact_phone, contact_mobile, contact_email').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        empresaIds.length > 0
          ? supabase.schema('core_common').from('empresas').select('id, name, trade_name').in('id', empresaIds)
          : Promise.resolve({ data: [] }),
        supabase.schema('core_comercial').from('pedido_items').select('*').in('pedido_id', pedidoIds),
        supabase
          .schema('core_personal')
          .from('worker_assignments')
          .select(`
            id,
            pedido_id,
            status,
            planned_start_date,
            start_date,
            job_function_name_snapshot,
            worker:workers(
              id,
              nome,
              nif,
              movil,
              cod_colab
            )
          `)
          .in('status', ['planned', 'active', 'paused', 'replaced', 'relocated', 'terminated']),
        this.fetchAlocacoesAtivas(),
        this.fetchAlojamentos()
      ]);

      const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));
      const empresasMap = new Map((empresasRes.data || []).map((e: any) => [e.id, e]));
      const alojMap = new Map(alojamentos.map(a => [a.id, a]));

      // Agrupar alocações ativas da logística por worker_id
      const alocacoesLogisticaMap = new Map<string, Alocacao>();
      alocacoesAtivas
        .filter(a => a.status !== 'Checkout')
        .forEach(a => {
          alocacoesLogisticaMap.set(a.worker_id, a);
        });

      // 3. Montar Lista de Pedidos com seus Trabalhadores Contratados
      const result: PedidoDemandaLogistica[] = pedidos.map((ped: any) => {
        const client = clientsMap.get(ped.client_id) as any;
        const site = sitesMap.get(ped.client_site_id) as any;
        const empresa = empresasMap.get(ped.empresa_id) as any;

        const clienteNome = client?.trade_name || client?.legal_name || 'Cliente';
        const clienteTelefone = client?.phone || client?.mobile || '';
        const empresaNome = empresa?.trade_name || empresa?.name || ped.empresa_nome || 'LUMINOUS';
        const obraNome = site?.name || 'Obra Principal';
        const enderecoCompleto = site?.address_line || 'Dirección no informada';
        const cidade = site?.city || 'San Sebastián';
        const codigoPostal = site?.postal_code || '';
        const encarregadoNome = site?.contact_name || '';
        const encarregadoTelefone = site?.contact_phone || site?.contact_mobile || '';
        const encarregadoEmail = site?.contact_email || '';

        // Calcular dias restantes para início
        const dataInicioStr = ped.planned_start_date || new Date().toISOString().split('T')[0];
        const dataFimStr = ped.planned_end_date || '';
        const dataInicio = new Date(dataInicioStr);
        const hoje = new Date();
        const diffMs = dataInicio.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let duracaoDias: number | undefined;
        if (dataFimStr) {
          const dataFim = new Date(dataFimStr);
          duracaoDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
        }

        const duracaoTexto = calculateDurationText(dataInicioStr, dataFimStr);
        const diaSemanaInicio = getWeekDayEs(dataInicioStr);
        const diaSemanaFim = dataFimStr ? getWeekDayEs(dataFimStr) : '';

        // Itens e Vagas solicitadas no pedido
        const pedidoItems = (itemsRes.data || []).filter((it: any) => it.pedido_id === ped.id);
        const totalVagas = pedidoItems.reduce((acc: number, it: any) => acc + (it.quantity_requested || 1), 0);

        // Trabalhadores contratados vinculados a este pedido
        const pedAssignments = (assignmentsRes.data || []).filter((ass: any) => ass.pedido_id === ped.id);
        
        const trabalhadores: TrabalhadorDemandaItem[] = pedAssignments.map((ass: any) => {
          const w = ass.worker || {};
          const workerId = w.id || ass.id;
          const alocLog = alocacoesLogisticaMap.get(workerId);
          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;

          return {
            assignment_id: ass.id,
            worker_id: workerId,
            worker_nome: w.nome || 'Trabalhador',
            codigo_colab: w.cod_colab || 'E-XXXX',
            nif: w.nif,
            movil: w.movil,
            funcao: ass.job_function_name_snapshot || 'Operador Especialista',
            data_inicio: ass.planned_start_date || ass.start_date || dataInicioStr,
            data_fim: dataFimStr,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined
          };
        });

        const totalAlojados = trabalhadores.filter(t => t.status_alocacao === 'alocado').length;
        const totalPendentes = trabalhadores.filter(t => t.status_alocacao === 'pendente').length;

        return {
          pedido_id: ped.id,
          pedido_codigo: ped.codigo || `PED-${ped.id.slice(0, 6)}`,
          cliente_id: ped.client_id,
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone,
          empresa_id: ped.empresa_id,
          empresa_contratante: empresaNome,
          obra_nome: obraNome,
          endereco_completo: enderecoCompleto,
          cidade: cidade,
          provincia: site?.city || cidade,
          codigo_postal: codigoPostal,
          encarregado_nome: encarregadoNome,
          encarregado_telefone: encarregadoTelefone,
          encarregado_email: encarregadoEmail,
          data_inicio: dataInicioStr,
          data_inicio_diasemana: diaSemanaInicio,
          data_fim: dataFimStr,
          data_fim_diasemana: diaSemanaFim,
          dias_restantes: diasRestantes,
          duracao_texto: duracaoTexto,
          duracao_dias: duracaoDias,
          tipo_solicitacao: 'Nuevo Pedido',
          status_operacional: ped.operational_status || 'PARTIALLY_FULFILLED',
          observacoes: ped.notes || 'Sin observaciones generales.',
          total_vagas_pedido: Math.max(totalVagas || 0, trabalhadores.length, 1),
          total_contratados: trabalhadores.length,
          total_alojados: totalAlojados,
          total_pendentes_alojamento: totalPendentes,
          trabalhadores: trabalhadores
        };
      });

      return result;
    } catch (err) {
      console.error('Error fetching pedidos demanda logistica:', err);
      return [];
    }
  },

  async fetchDemandas(): Promise<DemandaTrabalhador[]> {
    return [];
  },

  async fetchTrabalhadoresAlojados(): Promise<TrabalhadorAlojado[]> {
    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();
    const alojMap = new Map(alojamentos.map(a => [a.id, a]));

    return alocacoes
      .filter(a => a.status !== 'Checkout')
      .map(a => {
        const aloj = alojMap.get(a.alojamento_id || '') || a.alojamento;
        const nomeAloj = (aloj?.nome || a.alojamento?.nome || '').toUpperCase();
        const tipoOrig = (a.tipo_alojamento || '').toUpperCase().trim();
        const obs = ((a.observacoes || '') + ' ' + (a.endereco_completo || '')).toUpperCase();

        const isCliente = a.tipo_alojamento === 'Cliente' || 
                          tipoOrig === 'CLIENTE' || 
                          nomeAloj.includes('CUENTA DEL CLIENTE') || 
                          nomeAloj.includes('HOTEL COGULLADA') ||
                          obs.includes('CUENTA DEL CLIENTE');

        const isPropio = !isCliente && (
          a.status === 'Alojamiento Propio' || 
          a.tipo_alojamento === 'Propio' || 
          tipoOrig === 'PROPIO' || 
          a.alojamento_id === 'propio' || 
          nomeAloj.includes('CUENTA PROPIA') ||
          obs.includes('CUENTA PROPIA')
        );

        let resolvedTipo: 'Empresa' | 'Propio' | 'Cliente' = 'Empresa';
        if (isPropio) resolvedTipo = 'Propio';
        else if (isCliente) resolvedTipo = 'Cliente';

        return {
          id: a.id,
          alocacao_id: a.id,
          worker_id: a.worker_id,
          worker_nome: a.worker_nome,
          codigo_colab: a.codigo_colab || 'E-XXXX',
          funcao: 'Operador Especialista',
          cliente_nome: a.cliente_nome || 'Cliente Obra',
          obra_nome: a.obra_nome || 'Obra',
          pedido_codigo: a.pedido_codigo,
          empresa_contratante: a.empresa_contratante || 'LUMINOUS',
          alojamento_id: isPropio ? 'propio' : isCliente ? 'cliente' : (a.alojamento_id || ''),
          alojamento_nome: isPropio 
            ? 'Alojamiento Propio / Por Cuenta Propia' 
            : isCliente 
            ? (aloj?.nome || 'Alojamiento Cedido por el Cliente') 
            : (aloj?.nome || a.obra_nome || 'Alojamiento'),
          alojamento_codigo: isPropio ? 'PROP-001' : isCliente ? 'CLI-001' : (aloj?.codigo || 'AL-XXXX'),
          cama_id: a.cama_id,
          cama_identificador: isPropio 
            ? 'Habitación Propia' 
            : isCliente 
            ? 'Habitación Cliente' 
            : (a.cama_id?.includes('ind') ? 'Cama Individual' : 'Cama Doble'),
          municipio: aloj?.municipio || a.obra_nome || 'España',
          provincia: aloj?.provincia || 'España',
          latitude: aloj?.latitude,
          longitude: aloj?.longitude,
          data_checkin: a.data_inicio,
          data_checkout_prevista: a.data_fim,
          status: isPropio 
            ? 'Alojamiento Propio' 
            : isCliente 
            ? 'Alojamiento Cliente' 
            : (a.status === 'Baixa Notificada' ? 'Baixa Notificada' : 'Ativo'),
          tipo_alojamento: resolvedTipo,
          custo_alojamento: a.custo_alojamento,
          contacto_hospedaje: a.contacto_hospedaje || aloj?.provedor?.telefone || '',
          worker_movil: a.worker_movil || ''
        };
      });
  }
};
