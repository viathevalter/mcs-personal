import { supabase } from '@/shared/supabase/client';
import { normalizeEmpresaName } from '@/shared/utils/empresaNormalizer';

function normalizeLogisticaEmpresa(raw?: string | null, workerContratante?: string | null): string {
  const candidate = workerContratante || raw || 'LUMINOUS';
  const norm = normalizeEmpresaName(candidate);
  if (!norm || norm.includes('KOTRIK')) {
    const fallbackWorker = normalizeEmpresaName(workerContratante);
    if (fallbackWorker && !fallbackWorker.includes('KOTRIK')) return fallbackWorker;
    return 'TRIANGULO';
  }
  return norm;
}
import { registrosService, fetchAllTableRows } from './registrosService';
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
  croquis_planta?: any;
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

export const checkWorkerInativoRH = (statusTrabajador?: string, statusSeguridad?: string) => {
  const st = (statusTrabajador || '').toUpperCase();
  const ss = (statusSeguridad || '').toUpperCase();

  const isAfastado =
    st.includes('AFAST') ||
    st.includes('LICEN') ||
    st.includes('INVALIDEZ') ||
    st.includes('BAJA MEDICA') ||
    st.includes('BAJA MÉDICA') ||
    st.includes('ENFERM');

  if (isAfastado) {
    return {
      isInativo: false,
      isAfastado: true,
      motivo: 'Licencia Salud / Afastado (Sigue Alojado)'
    };
  }

  const isBaja = ss.includes('BAIX') || ss.includes('BAJA');
  const isInactive = st.includes('INATIV') || st.includes('DESIST') || st.includes('DESLIG');

  if (isInactive || isBaja) {
    let motivo = 'Inactivo en Personal';
    if (isBaja && isInactive) motivo = 'Dado de Baja / Inactivo';
    else if (isBaja) motivo = `Baja Seguridad Social (${statusSeguridad})`;
    else if (isInactive) motivo = `Inactivo Personal (${statusTrabajador})`;

    return {
      isInativo: true,
      isAfastado: false,
      motivo
    };
  }

  return {
    isInativo: false,
    isAfastado: false,
    motivo: ''
  };
};

export interface Alocacao {
  id: string;
  cama_id: string;
  cama_identificador?: string;
  alojamento_id?: string;
  alojamento_nome?: string;
  alojamento_codigo?: string;
  worker_id: string;
  worker_nome: string;
  codigo_colab?: string;
  cliente_nome?: string;
  obra_nome?: string;
  municipio?: string;
  endereco?: string;
  pedido_id?: string;
  pedido_codigo?: string;
  data_inicio: string;
  data_fim?: string;
  data_checkin?: string;
  data_checkout_prevista?: string;
  status: 'Programada' | 'En Curso' | 'Checkout' | 'Ativo' | 'Baixa Notificada' | 'Alojamiento Propio' | 'Alojamiento Cliente' | 'checkin_feito';
  motivo_checkout?: string;
  observacoes?: string;
  tipo_alojamento?: string;
  empresa_contratante?: string;
  custo_alojamento?: number;
  contacto_hospedaje?: string;
  worker_movil?: string;
  cama?: Cama;
  alojamento?: Alojamento;
  status_trabajador?: string;
  status_seguridad?: string;
  is_inativo_rh?: boolean;
  is_afastado_rh?: boolean;
  alerta_inativo_rh?: string;
  data_baixa?: string;
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
  // Reemplazo e histórico
  assignment_status?: string;
  is_substituido?: boolean;
  substituido_por_nome?: string;
  substituto_de_nome?: string;
  solicitud_id?: string;
  solicitud_codigo?: string;
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
  status_trabajador?: string;
  status_seguridad?: string;
  is_inativo_rh?: boolean;
  is_afastado_rh?: boolean;
  alerta_inativo_rh?: string;
  data_baixa?: string;
}

export interface VagaPerfilItem {
  item_id: string;
  funcao: string;
  total_solicitado: number;
  contratados: number;
  faltam_contratar: number;
}

export interface SolicitudReemplazoResumo {
  id: string;
  codigo: string;
  title?: string;
  motivo?: string;
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
  data_inicio_formatada?: string;
  data_inicio_diasemana?: string;
  data_fim?: string;
  data_fim_formatada?: string;
  data_fim_diasemana?: string;
  dias_restantes: number;
  duracao_texto: string;
  duracao_dias?: number;
  tipo_solicitacao: 'Nuevo Pedido' | 'Reemplazo';
  solicitudes_reemplazo?: SolicitudReemplazoResumo[];
  status_operacional?: string;
  commercial_status?: string;
  is_finalizado?: boolean;
  observacoes?: string;
  total_vagas_pedido: number;
  total_contratados: number;
  total_faltam_contratar: number;
  total_alojados: number;
  total_pendentes_alojamento: number;
  vagas_perfil?: VagaPerfilItem[];
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
  status: 'Ativo' | 'Baixa Notificada' | 'Reemplazo em Andamento' | 'Checkout Pendente' | 'Alojamiento Propio' | 'Alojamiento Cliente' | 'Checkout';
  data_fim?: string;
  motivo_checkout?: string;
  tipo_alojamento?: string;
  custo_alojamento?: number;
  contacto_hospedaje?: string;
  worker_movil?: string;
  motivo_status?: string;
  status_trabajador?: string;
  status_seguridad?: string;
  is_inativo_rh?: boolean;
  is_afastado_rh?: boolean;
  alerta_inativo_rh?: string;
  data_baixa?: string;
}

const ALOCACOES_STORAGE_KEY = 'mcs_logistica_alocacoes_v5';

function formatToLocalDate(val?: string | Date | null): string {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).split('T')[0];
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function formatDisplayDate(val?: string | Date | null): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  try {
    return d.toLocaleDateString('pt-PT', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return d.toLocaleDateString('pt-PT');
  }
}

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
  // Trabalhadores Reais do Banco (Quando há busca textual, inclui também inativos para permitir lançamentos retroativos de histórico/alojamento próprio)
  async searchTrabalhadores(query: string = ''): Promise<any[]> {
    try {
      let q = supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, status_trabajador, status_seguridad, data_baixa, data_baixa_seguridad, contratante, location, cliente, funcion, email, movil')
        .order('nome', { ascending: true })
        .limit(100);

      if (query && query.trim().length > 0) {
        const clean = query.trim();
        q = q.or(`nome.ilike.%${clean}%,cod_colab.ilike.%${clean}%`);
      } else {
        q = q.in('status_trabajador', ['Ativo', 'ATIVO', 'Pendente Ingresso', 'PENDENTE INGRESSO', 'Pendente de Ingresso', 'Pendiente Ingresar', 'Pendente', 'Em Regularização', 'EM REGULARIZACAO']);
      }

      const { data, error } = await q;
      if (!error && data) {
        return data.map((w: any) => ({
          id: w.id,
          Cod_colab: w.cod_colab,
          cod_colab: w.cod_colab,
          Nombre: w.nome,
          nombre: w.nome,
          status_trabajador: w.status_trabajador,
          status_seguridad: w.status_seguridad,
          data_baixa: w.data_baixa ? formatToLocalDate(w.data_baixa) : (w.data_baixa_seguridad ? formatToLocalDate(w.data_baixa_seguridad) : undefined),
          contratante: normalizeLogisticaEmpresa(w.contratante),
          empresa_interna: normalizeLogisticaEmpresa(w.contratante),
          ubicacion: w.location || 'Espanha',
          cliente: w.cliente || 'Cliente Principal',
          funcion: w.funcion || 'Operador Especialista',
          email: w.email,
          movil: w.movil
        }));
      }
    } catch (e) {
      console.warn('Erro ao buscar trabalhadores no banco:', e);
    }
    return [];
  },

  async buscarTrabalhadoresParaAlocacao(query: string = ''): Promise<any[]> {
    return this.searchTrabalhadores(query);
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
      const cap = aloj.capacidade_pessoas || (aloj.camas_individuais || 0) + (aloj.camas_duplas || 0) || 4;
      const croquis = aloj.croquis_planta || aloj.comodidades?.__croquis_planta;
      const habitaciones = Array.isArray(croquis?.habitaciones) ? croquis.habitaciones : [];
      const alojBeds: Cama[] = [];

      if (habitaciones.length > 0) {
        let bedCounter = 0;
        habitaciones.forEach((hab: any, idx: number) => {
          const numHab = hab.numero || idx + 1;
          const habLabel = hab.nome || `Hab Nº ${numHab}`;
          const qtdCamas = Math.max(1, Number(hab.camas) || 1);
          for (let c = 1; c <= qtdCamas; c++) {
            bedCounter++;
            const camaId = `${aloj.id}-cama-ind-${bedCounter}`;
            alojBeds.push({
              id: camaId,
              alojamento_id: aloj.id,
              alojamento_nome: aloj.nome,
              identificador: `${habLabel} • Cama #${c}${hab.observacao ? ` (${hab.observacao})` : ''}`,
              tipo: 'individual',
              status: 'livre'
            });
          }
        });
      } else {
        const ind = aloj.camas_individuais || cap;
        const dup = aloj.camas_duplas || 0;

        for (let i = 1; i <= ind; i++) {
          const camaId = `${aloj.id}-cama-ind-${i}`;
          alojBeds.push({
            id: camaId,
            alojamento_id: aloj.id,
            alojamento_nome: aloj.nome,
            identificador: `Hab Nº 1 • Cama Individual #${i}`,
            tipo: 'individual',
            status: 'livre'
          });
        }

        for (let d = 1; d <= dup; d++) {
          const camaId = `${aloj.id}-cama-dup-${d}`;
          alojBeds.push({
            id: camaId,
            alojamento_id: aloj.id,
            alojamento_nome: aloj.nome,
            identificador: `Hab Principal • Cama Matrimonio/Doble #${d} (1 plaza)`,
            tipo: 'dupla',
            status: 'livre'
          });
        }
      }

      // Associar alocações ativas deste alojamento às camas (por cama_id exato ou sequencialmente quando cama_id for nulo no banco)
      const alojAlocs = alocacoesAtivas.filter(a => a.alojamento_id === aloj.id && a.status !== 'Checkout');
      const matchedAlocIds = new Set<string>();

      alojBeds.forEach(bed => {
        const exact = alojAlocs.find(a => a.cama_id === bed.id && !matchedAlocIds.has(a.id));
        if (exact) {
          bed.status = 'ocupada';
          bed.alocacao_atual = exact;
          matchedAlocIds.add(exact.id);
        }
      });

      alojAlocs.forEach(aloc => {
        if (matchedAlocIds.has(aloc.id)) return;
        const nextFreeBed = alojBeds.find(b => b.status === 'livre');
        if (nextFreeBed) {
          nextFreeBed.status = 'ocupada';
          nextFreeBed.alocacao_atual = aloc;
          matchedAlocIds.add(aloc.id);
        }
      });

      result.push(...alojBeds);
    });

    return result;
  },

  async fetchAlocacoesAtivas(): Promise<Alocacao[]> {
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    try {
      const dbAlocs = await fetchAllTableRows('alocacoes');

      if (!dbAlocs || dbAlocs.length === 0) {
        const stored = localStorage.getItem(ALOCACOES_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        return (importedAllocations as any[]) || [];
      }

      // Mapear dados estáticos importados para metadados ricos (nomes, códigos, cliente, obra)
      const importedMap = new Map<string, any>();
      (importedAllocations as any[]).forEach(a => {
        if (a.worker_id) importedMap.set(a.worker_id, a);
        if (a.id) importedMap.set(a.id, a);
      });

      // Buscar em paralelo no banco core_personal.workers e core_logistics.alojamentos
      const allWorkerIds = Array.from(new Set(
        dbAlocs
          .map((r: any) => r.worker_id)
          .filter((wId: string) => isUuid(wId))
      ));

      const allCodColabs = Array.from(new Set(
        dbAlocs
          .map((r: any) => {
            const base = importedMap.get(r.worker_id) || importedMap.get(r.id) || {};
            return base.codigo_colab || r.codigo_colab;
          })
          .filter((c: any) => Boolean(c && c !== 'E-XXXX' && String(c).toUpperCase() !== 'NO'))
      ));

      const safeQuery = async (promise: any) => {
        try {
          const res = await promise;
          return res || { data: [] };
        } catch {
          return { data: [] };
        }
      };

      const [
        workersRes,
        workersByCodeRes,
        alojamentosRes,
        seguridadeBaixasRes,
        statusHistRes,
        assignmentsEndRes,
        colabPorPedidoRes
      ] = await Promise.all([
        allWorkerIds.length > 0
          ? safeQuery(
              supabase
                .schema('core_personal')
                .from('workers')
                .select('id, cod_colab, nome, movil, nif, contratante, status_trabajador, status_seguridad, data_baixa, data_baixa_seguridad')
                .in('id', allWorkerIds)
            )
          : Promise.resolve({ data: [] }),
        allCodColabs.length > 0
          ? safeQuery(
              supabase
                .schema('core_personal')
                .from('workers')
                .select('id, cod_colab, nome, movil, nif, contratante, status_trabajador, status_seguridad, data_baixa, data_baixa_seguridad')
                .in('cod_colab', allCodColabs)
            )
          : Promise.resolve({ data: [] }),
        fetchAllTableRows('alojamentos').then(rows => ({ data: rows })).catch(() => ({ data: [] })),
        allWorkerIds.length > 0
          ? safeQuery(
              supabase
                .schema('core_personal')
                .from('seguridade_status')
                .select('worker_id, tipo_evento, data_efetiva, data_alvo_execucao, data_solicitacao')
                .eq('tipo_evento', 'baixa')
                .in('worker_id', allWorkerIds)
                .order('data_solicitacao', { ascending: false })
            )
          : Promise.resolve({ data: [] }),
        allWorkerIds.length > 0
          ? safeQuery(
              supabase
                .schema('core_personal')
                .from('worker_status_history')
                .select('worker_id, change_type, new_value, effective_date, created_at')
                .in('worker_id', allWorkerIds)
                .order('created_at', { ascending: false })
            )
          : Promise.resolve({ data: [] }),
        allWorkerIds.length > 0
          ? safeQuery(
              supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select('worker_id, end_date, status')
                .in('worker_id', allWorkerIds)
                .not('end_date', 'is', null)
                .order('end_date', { ascending: false })
            )
          : Promise.resolve({ data: [] }),
        allCodColabs.length > 0
          ? safeQuery(
              supabase
                .from('colaborador_por_pedido')
                .select('cod_colab, fechasalidatrabajador')
                .in('cod_colab', allCodColabs)
                .not('fechasalidatrabajador', 'is', null)
                .order('fechasalidatrabajador', { ascending: false })
            )
          : Promise.resolve({ data: [] })
      ]);

      const dbWorkersMap = new Map<string, any>();
      const dbWorkersByCodeMap = new Map<string, any>();
      [...(workersByCodeRes.data || []), ...(workersRes.data || [])].forEach((w: any) => {
        if (w.id) dbWorkersMap.set(w.id, w);
        if (w.cod_colab) dbWorkersByCodeMap.set(String(w.cod_colab).toUpperCase().trim(), w);
      });

      // Mapear datas de baixa complementares por worker_id / cod_colab
      const segBaixaMap = new Map<string, string>();
      (seguridadeBaixasRes.data || []).forEach((s: any) => {
        if (s.worker_id && !segBaixaMap.has(s.worker_id)) {
          const dt = s.data_efetiva || s.data_alvo_execucao || s.data_solicitacao;
          if (dt) segBaixaMap.set(s.worker_id, formatToLocalDate(dt));
        }
      });

      const histBaixaMap = new Map<string, string>();
      const histSeenWorker = new Set<string>();
      (statusHistRes.data || []).forEach((h: any) => {
        if (!h.worker_id || histSeenWorker.has(h.worker_id)) return;
        const ct = String(h.change_type || '').toUpperCase();
        const nv = String(h.new_value || '').toUpperCase();
        if (ct === 'TRABALHADOR') {
          histSeenWorker.add(h.worker_id);
          if (nv.includes('INATIV') || nv.includes('BAIX') || nv.includes('BAJA') || nv.includes('DESLIG') || nv.includes('DESIST')) {
            const dt = h.effective_date || h.created_at;
            if (dt) histBaixaMap.set(h.worker_id, formatToLocalDate(dt));
          }
        }
      });

      const assEndMap = new Map<string, string>();
      (assignmentsEndRes.data || []).forEach((a: any) => {
        if (a.worker_id && a.end_date && !assEndMap.has(a.worker_id)) {
          assEndMap.set(a.worker_id, formatToLocalDate(a.end_date));
        }
      });

      const colabSalidaMap = new Map<string, string>();
      (colabPorPedidoRes.data || []).forEach((c: any) => {
        if (c.cod_colab && c.fechasalidatrabajador) {
          const codeKey = String(c.cod_colab).toUpperCase().trim();
          if (!colabSalidaMap.has(codeKey)) {
            colabSalidaMap.set(codeKey, formatToLocalDate(c.fechasalidatrabajador));
          }
        }
      });

      const dbAlojMap = new Map<string, any>();
      if (alojamentosRes.data) {
        alojamentosRes.data.forEach((al: any) => {
          dbAlojMap.set(al.id, al);
          if (al.codigo) dbAlojMap.set(al.codigo, al);
        });
      }

      // Formatar cada linha do banco em Alocacao unificada
      const rawMerged: Array<Alocacao & { _created_at?: string }> = dbAlocs.map((row: any) => {
        const workerBase = importedMap.get(row.worker_id) || importedMap.get(row.id) || {};
        // Somente herda metadados de estadia/imóvel do JSON importado se for a MESMA alocação ou o MESMO alojamento;
        // se o trabalhador fez check-out e foi alocado em outro imóvel (ex: saiu de AL-1032 Huelva para AL-1054 León),
        // nunca deve herdar o alojamento, cama ou datas antigas da planilha importada!
        const isSameAllocationOrAloj = Boolean(
          workerBase.id && (
            row.id === workerBase.id ||
            (row.alojamento_id && workerBase.alojamento_id && String(row.alojamento_id) === String(workerBase.alojamento_id)) ||
            (!row.alojamento_id && !workerBase.alojamento_id)
          )
        );
        const base = isSameAllocationOrAloj ? workerBase : {};

        const rawCode = String(workerBase.codigo_colab || row.codigo_colab || '').toUpperCase().trim();
        const workerInfo = dbWorkersMap.get(row.worker_id) || (rawCode ? dbWorkersByCodeMap.get(rawCode) : undefined) || {};
        const alojInfo = dbAlojMap.get(row.alojamento_id) || {};

        const resolvedWorkerId = workerInfo.id || row.worker_id || workerBase.worker_id;
        const workerNome = workerInfo.nome || workerBase.worker_nome || row.observacoes || 'Trabalhador';
        const codColab = workerInfo.cod_colab || workerBase.codigo_colab || 'E-XXXX';
        const codColabKey = String(codColab).toUpperCase().trim();
        const alojCodigo = alojInfo.codigo || base.alojamento_codigo;
        const alojNome = alojInfo.nome || base.alojamento_nome || row.cliente_obra_nome || 'Alojamiento';

        let statusNormalized: any = row.status || base.status || 'En Curso';
        if (String(statusNormalized).toLowerCase() === 'checkout') {
          statusNormalized = 'Checkout';
        }

        const statusTrabajador = workerInfo.status_trabajador || workerBase.status_trabajador;
        const statusSeguridad = workerInfo.status_seguridad || workerBase.status_seguridad;
        const rhCheck = checkWorkerInativoRH(statusTrabajador, statusSeguridad);

        // Somente exibe data de baixa RRHH quando o trabalhador está efetivamente Inativo no RH/Seguridade
        const rawDataBaixa = (!rhCheck.isInativo || rhCheck.isAfastado)
          ? undefined
          : (
              workerInfo.data_baixa ||
              workerInfo.data_baixa_seguridad ||
              histBaixaMap.get(resolvedWorkerId) ||
              segBaixaMap.get(resolvedWorkerId) ||
              assEndMap.get(resolvedWorkerId) ||
              (codColabKey ? colabSalidaMap.get(codColabKey) : undefined) ||
              workerBase.data_baixa
            );

        const dataBaixaFormatted = rawDataBaixa ? formatToLocalDate(rawDataBaixa) : undefined;

        const resolvedAlojamentoObj = alojInfo.id
          ? {
              id: alojInfo.id,
              nome: alojInfo.nome || alojNome,
              codigo: alojInfo.codigo || alojCodigo,
              municipio: alojInfo.cidade || alojInfo.municipio || base.municipio || 'España',
              endereco: alojInfo.endereco_completo || alojInfo.endereco || base.endereco || '',
              capacidade_pessoas: Number(alojInfo.capacidade_total || alojInfo.capacidade_pessoas || 1),
              dormitorios: Number(alojInfo.dormitorios || 1),
              total_camas: Number(alojInfo.total_camas || 1),
              camas_individuais: Number(alojInfo.camas_individuais || 0),
              camas_duplas: Number(alojInfo.camas_duplas || 0),
              banheiros: Number(alojInfo.banheiros || 1)
            }
          : base.alojamento;

        return {
          id: row.id,
          cama_id: row.cama_id || base.cama_id || `cama-${row.id}`,
          cama_identificador: base.cama_identificador || (row.cama_id ? 'Cama Alojamiento' : 'Habitación'),
          alojamento_id: row.alojamento_id || base.alojamento_id,
          alojamento_codigo: alojCodigo,
          alojamento_nome: alojNome,
          worker_id: resolvedWorkerId,
          worker_nome: workerNome,
          codigo_colab: codColab,
          worker_movil: workerInfo.movil || workerBase.worker_movil || '',
          empresa_contratante: normalizeLogisticaEmpresa(row.empresa_id || workerBase.empresa_contratante, workerInfo.contratante),
          cliente_nome: row.cliente_obra_nome || row.project_name || base.cliente_nome || workerBase.cliente_nome || workerInfo.cliente || 'Cliente Obra',
          obra_nome: row.project_name || row.cliente_obra_nome || base.obra_nome || workerBase.obra_nome || 'Obra Principal',
          municipio: alojInfo.cidade || alojInfo.municipio || base.municipio || workerBase.municipio || 'España',
          endereco: alojInfo.endereco_completo || alojInfo.endereco || base.endereco || '',
          pedido_id: row.pedido_id || base.pedido_id || workerBase.pedido_id,
          pedido_codigo: base.pedido_codigo || workerBase.pedido_codigo,
          data_inicio: row.data_inicio ? formatToLocalDate(row.data_inicio) : (base.data_inicio || formatToLocalDate(new Date())),
          data_fim: row.data_fim ? formatToLocalDate(row.data_fim) : base.data_fim,
          data_checkin: row.data_inicio ? formatToLocalDate(row.data_inicio) : base.data_checkin,
          data_checkout_prevista: row.data_fim ? formatToLocalDate(row.data_fim) : base.data_checkout_prevista,
          status: statusNormalized,
          motivo_checkout: row.motivo_checkout || base.motivo_checkout,
          observacoes: row.observacoes || base.observacoes || '',
          tipo_alojamento: row.tipo_alojamento || base.tipo_alojamento || 'FIJO',
          custo_alojamento: Number(row.valor_ajuda_moradia || base.custo_alojamento || 0),
          alojamento: resolvedAlojamentoObj,
          status_trabajador: statusTrabajador,
          status_seguridad: statusSeguridad,
          is_inativo_rh: rhCheck.isInativo,
          is_afastado_rh: rhCheck.isAfastado,
          alerta_inativo_rh: rhCheck.motivo,
          data_baixa: dataBaixaFormatted,
          _created_at: row.created_at ? String(row.created_at) : ''
        };
      });

      // Regra de unicidade: cada trabalhador só pode ter 1 alocação ativa por vez (a mais recente por data_inicio / created_at)
      const seenActiveWorkerIds = new Set<string>();
      const sortedForDedup = [...rawMerged].sort((a, b) => {
        if (a.status === 'Checkout' && b.status !== 'Checkout') return 1;
        if (a.status !== 'Checkout' && b.status === 'Checkout') return -1;
        const dateComp = String(b.data_inicio || '').localeCompare(String(a.data_inicio || ''));
        if (dateComp !== 0) return dateComp;
        return String(b._created_at || '').localeCompare(String(a._created_at || ''));
      });
      const merged: Alocacao[] = [];
      for (const item of sortedForDedup) {
        if (item.status !== 'Checkout' && item.worker_id) {
          if (seenActiveWorkerIds.has(item.worker_id)) {
            continue;
          }
          seenActiveWorkerIds.add(item.worker_id);
        }
        const { _created_at, ...cleanItem } = item;
        merged.push(cleanItem);
      }

      try {
        localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}

      return merged;
    } catch (e) {
      console.warn('Erro em fetchAlocacoesAtivas:', e);
      const stored = localStorage.getItem(ALOCACOES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
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
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    let newId = `propio-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    try {
      if (isUuid(payload.worker_id)) {
        await client
          .from('alocacoes')
          .update({
            status: 'Checkout',
            data_fim: payload.data_inicio,
            motivo_checkout: 'Cambio a Alojamiento Propio'
          })
          .eq('worker_id', payload.worker_id)
          .neq('status', 'Checkout');
      }

      const todayStr = formatToLocalDate(new Date());
      const isFinishedPropio = Boolean(payload.data_fim && payload.data_fim <= todayStr);

      const { data: inserted, error } = await client
        .from('alocacoes')
        .insert({
          cama_id: null,
          alojamento_id: null,
          worker_id: isUuid(payload.worker_id) ? payload.worker_id : null,
          pedido_id: isUuid(payload.pedido_id) ? payload.pedido_id : null,
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim || null,
          status: isFinishedPropio ? 'Checkout' : 'Alojamiento Propio',
          motivo_checkout: isFinishedPropio ? 'Fin de Período / Salida Registrada' : null,
          tipo_alojamento: 'Propio',
          gerou_auxilio_moradia: true,
          observacoes: payload.observacoes || 'Alojamiento Propio / Por Cuenta Propia',
          cliente_obra_nome: payload.cliente_nome || payload.obra_nome || null,
          project_name: payload.obra_nome || payload.cliente_nome || null,
          valor_ajuda_moradia: payload.custo_alojamento || 300
        })
        .select()
        .single();

      if (!error && inserted?.id) {
        newId = inserted.id;
      }
    } catch (e) {
      console.warn('Erro ao inserir alojamento próprio no Supabase:', e);
    }

    const alocacoes = await this.fetchAlocacoesAtivas();
    const todayStr = formatToLocalDate(new Date());
    const isFinishedPropio = Boolean(payload.data_fim && payload.data_fim <= todayStr);
    const newAloc: Alocacao = {
      id: newId,
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
      status: isFinishedPropio ? 'Checkout' : 'Alojamiento Propio',
      motivo_checkout: isFinishedPropio ? 'Fin de Período / Salida Registrada' : undefined,
      tipo_alojamento: 'Propio',
      empresa_contratante: normalizeLogisticaEmpresa(payload.empresa_contratante),
      custo_alojamento: payload.custo_alojamento || 300,
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

    const filtered = alocacoes.filter(a => a.id !== newId && (a.worker_id !== payload.worker_id || a.status === 'Checkout'));
    const updated = [newAloc, ...filtered];

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    return newAloc;
  },

  async registrarAlojamentoCliente(payload: {
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
    alojamento_nome?: string;
    municipio?: string;
  }): Promise<Alocacao> {
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    let newId = `cliente-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    try {
      if (isUuid(payload.worker_id)) {
        await client
          .from('alocacoes')
          .update({
            status: 'Checkout',
            data_fim: payload.data_inicio,
            motivo_checkout: 'Cambio a Alojamiento por Cliente'
          })
          .eq('worker_id', payload.worker_id)
          .neq('status', 'Checkout');
      }

      const { data: inserted, error } = await client
        .from('alocacoes')
        .insert({
          cama_id: null,
          alojamento_id: null,
          worker_id: isUuid(payload.worker_id) ? payload.worker_id : null,
          pedido_id: isUuid(payload.pedido_id) ? payload.pedido_id : null,
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim || null,
          status: 'Alojamiento Cliente',
          tipo_alojamento: 'Cliente',
          observacoes: payload.observacoes || `Alojamiento Cedido por ${payload.cliente_nome || 'el Cliente'}`,
          cliente_obra_nome: payload.cliente_nome || payload.obra_nome || null,
          project_name: payload.obra_nome || payload.cliente_nome || null,
          valor_ajuda_moradia: 0
        })
        .select()
        .single();

      if (!error && inserted?.id) {
        newId = inserted.id;
      }
    } catch (e) {
      console.warn('Erro ao inserir alojamento por cliente no Supabase:', e);
    }

    const alocacoes = await this.fetchAlocacoesAtivas();
    const newAloc: Alocacao = {
      id: newId,
      cama_id: `cliente-cama-${payload.worker_id}`,
      alojamento_id: 'cliente',
      alojamento_codigo: 'CLI-ALOJ',
      alojamento_nome: payload.alojamento_nome || `Alojamiento Cedido por ${payload.cliente_nome || 'el Cliente'}`,
      worker_id: payload.worker_id,
      worker_nome: payload.worker_nome,
      codigo_colab: payload.codigo_colab || 'E-XXXX',
      cliente_nome: payload.cliente_nome || 'Cliente Obra',
      obra_nome: payload.obra_nome || 'Obra Principal',
      municipio: payload.municipio || payload.obra_nome || 'España',
      pedido_id: payload.pedido_id,
      pedido_codigo: payload.pedido_codigo,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      data_checkin: payload.data_inicio,
      data_checkout_prevista: payload.data_fim,
      observacoes: payload.observacoes || 'Alojamiento por cuenta del cliente (Sin coste MCS)',
      status: 'Alojamiento Cliente',
      tipo_alojamento: 'Cliente',
      empresa_contratante: normalizeLogisticaEmpresa(payload.empresa_contratante),
      custo_alojamento: 0,
      alojamento: {
        id: 'cliente',
        nome: payload.alojamento_nome || `Alojamiento Cedido por ${payload.cliente_nome || 'el Cliente'}`,
        codigo: 'CLI-ALOJ',
        capacidade_pessoas: 1,
        dormitorios: 1,
        total_camas: 1,
        camas_individuais: 1,
        camas_duplas: 0,
        banheiros: 1,
        municipio: payload.municipio || payload.obra_nome || 'España'
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
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    let newId = `aloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    try {
      // 1. Atualizar alocação anterior do trabalhador para Checkout se houver
      if (isUuid(payload.worker_id)) {
        await client
          .from('alocacoes')
          .update({
            status: 'Checkout',
            data_fim: payload.data_inicio,
            motivo_checkout: 'Reasignación a otro alojamiento'
          })
          .eq('worker_id', payload.worker_id)
          .neq('status', 'Checkout');
      }

      // 2. Inserir no Supabase
      const { data: inserted, error } = await client
        .from('alocacoes')
        .insert({
          cama_id: isUuid(payload.cama_id) ? payload.cama_id : null,
          alojamento_id: isUuid(payload.alojamento_id) ? payload.alojamento_id : null,
          worker_id: isUuid(payload.worker_id) ? payload.worker_id : null,
          pedido_id: isUuid(payload.pedido_id) ? payload.pedido_id : null,
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim || null,
          status: 'checkin_feito',
          observacoes: payload.observacoes || null,
          cliente_obra_nome: payload.cliente_nome || payload.obra_nome || null,
          project_name: payload.obra_nome || payload.cliente_nome || null,
          tipo_alojamento: 'TEMPORAL'
        })
        .select()
        .single();

      if (!error && inserted?.id) {
        newId = inserted.id;
      }

      // 3. Atualizar status da cama para ocupada se cama_id for UUID
      if (isUuid(payload.cama_id)) {
        await client.from('camas').update({ status: 'ocupada', disponivel: false }).eq('id', payload.cama_id);
      }
    } catch (e) {
      console.warn('Erro ao persistir alocação no Supabase:', e);
    }

    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();
    const aloj = alojamentos.find(a => a.id === payload.alojamento_id);

    const newAloc: Alocacao = {
      id: newId,
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
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;

    try {
      const validWorkerUuids = items.map(i => i.worker_id).filter(isUuid);
      if (validWorkerUuids.length > 0) {
        await client
          .from('alocacoes')
          .update({
            status: 'Checkout',
            data_fim: pedidoContext.data_inicio,
            motivo_checkout: 'Reasignación en lote a otro alojamiento'
          })
          .in('worker_id', validWorkerUuids)
          .neq('status', 'Checkout');
      }

      const rowsToInsert = items.map(item => ({
        cama_id: isUuid(item.cama_id) ? item.cama_id : null,
        alojamento_id: isUuid(alojamento_id) ? alojamento_id : null,
        worker_id: isUuid(item.worker_id) ? item.worker_id : null,
        pedido_id: isUuid(pedidoContext.pedido_id) ? pedidoContext.pedido_id : null,
        data_inicio: pedidoContext.data_inicio,
        data_fim: pedidoContext.data_fim || null,
        status: 'checkin_feito',
        observacoes: pedidoContext.observacoes || null,
        cliente_obra_nome: pedidoContext.cliente_nome || pedidoContext.obra_nome || null,
        project_name: pedidoContext.obra_nome || pedidoContext.cliente_nome || null,
        tipo_alojamento: 'TEMPORAL'
      }));

      const { data: insertedRows } = await client.from('alocacoes').insert(rowsToInsert).select('id, worker_id');
      if (Array.isArray(insertedRows)) {
        insertedRows.forEach((r: any, idx: number) => {
          if (r?.id && items[idx]) {
            (items[idx] as any)._dbId = r.id;
          }
        });
      }

      const validCamaIds = items.map(i => i.cama_id).filter(isUuid);
      if (validCamaIds.length > 0) {
        await client.from('camas').update({ status: 'ocupada', disponivel: false }).in('id', validCamaIds);
      }
    } catch (e) {
      console.warn('Erro ao inserir grupo no Supabase:', e);
    }

    const alocacoes = await this.fetchAlocacoesAtivas();
    const alojamentos = await this.fetchAlojamentos();
    const aloj = alojamentos.find(a => a.id === alojamento_id);

    const newAllocations: Alocacao[] = [];
    const usedCamaIds = new Set(items.map(i => i.cama_id));
    const usedWorkerIds = new Set(items.map(i => i.worker_id));

    items.forEach(item => {
      const dbMatch = alocacoes.find(a => a.worker_id === item.worker_id && a.alojamento_id === alojamento_id && a.status !== 'Checkout');
      const newAloc: Alocacao = {
        id: (item as any)._dbId || dbMatch?.id || `aloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

  async atualizarDatasAlocacao(
    alocacaoIds: string[],
    params: {
      data_inicio: string;
      data_fim?: string;
      observacoes?: string;
      workerIds?: string[];
    }
  ): Promise<void> {
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const idsSet = new Set(alocacaoIds);
    const workerIdsSet = new Set(params.workerIds || []);

    let cachedLocalAlocs: Alocacao[] = [];
    try {
      const rawLocal = localStorage.getItem(ALOCACOES_STORAGE_KEY);
      if (rawLocal) cachedLocalAlocs = JSON.parse(rawLocal) || [];
    } catch (e) {}

    const alocacoes = await this.fetchAlocacoesAtivas();
    const combinedAlocs = [...alocacoes, ...cachedLocalAlocs];
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;

    try {
      const validAlocUuids = alocacaoIds.filter(isUuid);
      const validWorkerUuids = [
        ...(params.workerIds || []),
        ...combinedAlocs
          .filter(a => idsSet.has(a.id) || workerIdsSet.has(a.worker_id))
          .map(a => a.worker_id)
      ].filter(isUuid);

      const updatePayload: any = {
        data_inicio: params.data_inicio,
        data_fim: params.data_fim ? params.data_fim : null,
        updated_at: new Date().toISOString()
      };
      if (params.observacoes !== undefined) {
        updatePayload.observacoes = params.observacoes || null;
      }

      if (validAlocUuids.length > 0) {
        await client
          .from('alocacoes')
          .update(updatePayload)
          .in('id', validAlocUuids);
      } else if (validWorkerUuids.length > 0) {
        await client
          .from('alocacoes')
          .update(updatePayload)
          .in('worker_id', validWorkerUuids)
          .neq('status', 'Checkout');
      }

      if (validAlocUuids.length > 0) {
        await client
          .from('termos_responsabilidade_alojamento')
          .update({ data_checkin: params.data_inicio, updated_at: new Date().toISOString() })
          .in('alocacao_id', validAlocUuids);
      }
    } catch (e) {
      console.warn('Erro ao atualizar datas da alocação no Supabase:', e);
    }

    const updated = alocacoes.map(a => {
      if (idsSet.has(a.id) || (a.worker_id && workerIdsSet.has(a.worker_id) && a.status !== 'Checkout')) {
        return {
          ...a,
          data_inicio: params.data_inicio,
          data_fim: params.data_fim !== undefined ? (params.data_fim || undefined) : a.data_fim,
          observacoes: params.observacoes !== undefined ? params.observacoes : a.observacoes
        };
      }
      return a;
    });

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  async checkoutTrabalhador(alocacaoId: string, motivo?: string, dataSaida?: string, desativarAlojamentoId?: string): Promise<void> {
    return this.checkoutGrupoTrabalhadores([alocacaoId], motivo, dataSaida, desativarAlojamentoId);
  },

  async checkoutGrupoTrabalhadores(
    alocacaoIds: string[],
    motivo?: string,
    dataSaida?: string,
    desativarAlojamentoId?: string,
    perWorkerDates?: Record<string, string>
  ): Promise<void> {
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const idsSet = new Set(alocacaoIds);

    // Capturar também qualquer alocação em cache local caso o ID passado seja temporário (aloc-...)
    let cachedLocalAlocs: Alocacao[] = [];
    try {
      const rawLocal = localStorage.getItem(ALOCACOES_STORAGE_KEY);
      if (rawLocal) cachedLocalAlocs = JSON.parse(rawLocal) || [];
    } catch (e) {}

    const alocacoes = await this.fetchAlocacoesAtivas();
    const combinedAlocs = [...alocacoes, ...cachedLocalAlocs];
    const effectiveDate = dataSaida || new Date().toISOString().split('T')[0];
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;

    // 1. Atualizar no Supabase
    try {
      const hasCustomDates = perWorkerDates && Object.keys(perWorkerDates).length > 0;

      if (hasCustomDates) {
        // Atualizar individualmente quando cada trabalhador tem sua própria data de baixa
        for (const alocId of alocacaoIds) {
          const alocObj = combinedAlocs.find(a => a.id === alocId || a.worker_id === alocId);
          const customDate = perWorkerDates![alocId] || effectiveDate;
          const targetAlocUuid = isUuid(alocId) ? alocId : (isUuid(alocObj?.id) ? alocObj!.id : undefined);
          if (targetAlocUuid) {
            await client
              .from('alocacoes')
              .update({
                status: 'Checkout',
                data_fim: customDate,
                motivo_checkout: motivo || 'Fin de Pedido / Obra',
                updated_at: new Date().toISOString()
              })
              .eq('id', targetAlocUuid);
          } else if (isUuid(alocObj?.worker_id)) {
            await client
              .from('alocacoes')
              .update({
                status: 'Checkout',
                data_fim: customDate,
                motivo_checkout: motivo || 'Fin de Pedido / Obra',
                updated_at: new Date().toISOString()
              })
              .eq('worker_id', alocObj!.worker_id)
              .neq('status', 'Checkout');
          }
        }
      } else {
        const validAlocUuids = [
          ...alocacaoIds.filter(isUuid),
          ...combinedAlocs
            .filter(a => idsSet.has(a.id))
            .map(a => a.id)
            .filter(isUuid)
        ];
        const uniqueAlocUuids = [...new Set(validAlocUuids)];

        if (uniqueAlocUuids.length > 0) {
          await client
            .from('alocacoes')
            .update({
              status: 'Checkout',
              data_fim: effectiveDate,
              motivo_checkout: motivo || 'Fin de Pedido / Obra',
              updated_at: new Date().toISOString()
            })
            .in('id', uniqueAlocUuids);
        } else {
          const fallbackWorkerUuids = combinedAlocs
            .filter(a => idsSet.has(a.id) || idsSet.has(a.worker_id))
            .map(a => a.worker_id)
            .filter(isUuid);
          const uniqueWorkerUuids = [...new Set(fallbackWorkerUuids)];
          if (uniqueWorkerUuids.length > 0) {
            await client
              .from('alocacoes')
              .update({
                status: 'Checkout',
                data_fim: effectiveDate,
                motivo_checkout: motivo || 'Fin de Pedido / Obra',
                updated_at: new Date().toISOString()
              })
              .in('worker_id', uniqueWorkerUuids)
              .neq('status', 'Checkout');
          }
        }
      }

      // Liberar camas no core_logistics.camas
      const targetCamaIds = alocacoes
        .filter(a => idsSet.has(a.id) && isUuid(a.cama_id))
        .map(a => a.cama_id);

      if (targetCamaIds.length > 0) {
        await client
          .from('camas')
          .update({ status: 'livre', disponivel: true, updated_at: new Date().toISOString() })
          .in('id', targetCamaIds);
      }
    } catch (e) {
      console.warn('Erro ao registrar checkout no Supabase:', e);
    }

    // 2. Atualizar no cache local
    const updated = alocacoes.map(a => {
      if (idsSet.has(a.id)) {
        const customDate = perWorkerDates?.[a.id] || effectiveDate;
        return {
          ...a,
          status: 'Checkout' as const,
          data_fim: customDate,
          motivo_checkout: motivo || 'Fin de Pedido / Obra'
        };
      }
      return a;
    });

    try {
      localStorage.setItem(ALOCACOES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    // 3. Se solicitado desativar / inativar o alojamento
    if (desativarAlojamentoId && desativarAlojamentoId !== 'propio' && desativarAlojamentoId !== 'cliente') {
      try {
        await registrosService.updateAlojamento(desativarAlojamentoId, {
          status: 'inativo',
          ativo: false
        });
      } catch (e) {
        console.warn('Erro ao inativar alojamento no checkout:', e);
      }
    }
  },

  // Demandas de Logística Agrupadas por Pedido Comercial Real, Reemplazos & Trabalhadores Contratados
  async fetchDemandasPorPedido(): Promise<PedidoDemandaLogistica[]> {
    try {
      // 1. Buscar Pedidos Comerciais Ativos
      const { data: pedidosData, error: pedErr } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .neq('operational_status', 'cancelled')
        .order('created_at', { ascending: false });

      const pedidos = (!pedErr && pedidosData) ? pedidosData : [];
      const pedidoIds = pedidos.map(p => p.id);
      const pedidoIdsSet = new Set(pedidoIds.map(id => String(id).trim()));

      // 2. Buscar Itens, Funções, Atribuições, Solicitudes Operativas, Targets de Reemplazo e Alocações
      const [itemsRes, jobsRes, assignmentsRes, solicitudesRes, targetsRes, alocacoesAtivas, alojamentos] = await Promise.all([
        pedidoIds.length > 0
          ? supabase.schema('core_comercial').from('pedido_items').select('*').in('pedido_id', pedidoIds)
          : Promise.resolve({ data: [] }),
        supabase.schema('core_comercial').from('job_functions').select('id, name'),
        supabase
          .schema('core_personal')
          .from('worker_assignments')
          .select(`
            id,
            empresa_id,
            client_id,
            client_site_id,
            pedido_id,
            solicitud_id,
            replacement_of_assignment_id,
            status,
            planned_start_date,
            start_date,
            end_date,
            job_function_id,
            job_function_name_snapshot,
            worker:workers(
              id,
              nome,
              nif,
              movil,
              cod_colab,
              status_trabajador,
              status_seguridad,
              data_baixa,
              data_baixa_seguridad
            )
          `)
          .in('status', ['planned', 'active', 'paused', 'completed', 'replaced', 'relocated', 'terminated']),
        supabase
          .schema('core_operacoes')
          .from('solicitudes_operativas')
          .select('id, empresa_id, pedido_id, client_id, client_site_id, codigo, title, description, tipo, status, due_date, created_at, pergunta_respuesta'),
        supabase
          .schema('core_operacoes')
          .from('solicitud_targets')
          .select(`
            id,
            empresa_id,
            solicitud_id,
            source_assignment_id,
            source_pedido_id,
            source_pedido_item_id,
            source_worker_id,
            source_client_id,
            source_client_site_id,
            target_job_function_id,
            target_job_function_name,
            target_assignment_id,
            target_worker_id,
            status,
            action_type,
            requires_replacement,
            reason,
            notes
          `)
          .in('action_type', ['replace', 'offboard'])
          .in('status', ['pending', 'in_progress', 'completed']),
        this.fetchAlocacoesAtivas(),
        this.fetchAlojamentos()
      ]);

      const allSolicitudes = solicitudesRes.data || [];
      const solicitudesMap = new Map(allSolicitudes.map((s: any) => [s.id, s]));

      const allReplacementTargets = (targetsRes.data || []).filter((t: any) => {
        const sol = solicitudesMap.get(t.solicitud_id);
        return (
          (t.action_type === 'replace' || (t.action_type === 'offboard' && t.requires_replacement === true)) &&
          sol &&
          sol.status !== 'cancelled' &&
          (!sol.tipo || sol.tipo === 'replacement' || sol.tipo === 'offboarding')
        );
      });

      const clientIds = [...new Set([
        ...pedidos.map(p => p.client_id),
        ...allSolicitudes.map((s: any) => s.client_id),
        ...allReplacementTargets.map((t: any) => t.source_client_id),
        ...(assignmentsRes.data || []).map((a: any) => a.client_id)
      ].filter(Boolean))];

      const siteIds = [...new Set([
        ...pedidos.map(p => p.client_site_id),
        ...allSolicitudes.map((s: any) => s.client_site_id),
        ...allReplacementTargets.map((t: any) => t.source_client_site_id),
        ...(assignmentsRes.data || []).map((a: any) => a.client_site_id)
      ].filter(Boolean))];

      const empresaIds = [...new Set([
        ...pedidos.map(p => p.empresa_id),
        ...allSolicitudes.map((s: any) => s.empresa_id),
        ...allReplacementTargets.map((t: any) => t.empresa_id),
        ...(assignmentsRes.data || []).map((a: any) => a.empresa_id)
      ].filter(Boolean))];

      const extraWorkerIds = [...new Set([
        ...allReplacementTargets.map((t: any) => t.source_worker_id),
        ...allReplacementTargets.map((t: any) => t.target_worker_id)
      ].filter(Boolean))];

      const [clientsRes, sitesRes, empresasRes, extraWorkersRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name, phone, email').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code, contact_name, contact_phone, contact_email, notes').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        empresaIds.length > 0
          ? supabase.schema('core_common').from('empresas').select('id, name, trade_name').in('id', empresaIds)
          : Promise.resolve({ data: [] }),
        extraWorkerIds.length > 0
          ? supabase
              .schema('core_personal')
              .from('workers')
              .select('id, nome, nif, movil, cod_colab, funcion, status_trabajador, status_seguridad, data_baixa, data_baixa_seguridad')
              .in('id', extraWorkerIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));
      const empresasMap = new Map((empresasRes.data || []).map((e: any) => [e.id, e]));
      const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j.name]));
      const alojMap = new Map(alojamentos.map(a => [a.id, a]));
      const allAssignmentsMap = new Map((assignmentsRes.data || []).map((a: any) => [a.id, a]));
      const extraWorkersMap = new Map((extraWorkersRes.data || []).map((w: any) => [w.id, w]));

      // Agrupar alocações ativas da logística por worker_id, codigo_colab e nome normalizado
      const alocacoesLogisticaMap = new Map<string, Alocacao>();
      const alocacoesByCodeMap = new Map<string, Alocacao>();
      const alocacoesByNameMap = new Map<string, Alocacao>();

      const normalizeWName = (s?: string) => (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      alocacoesAtivas
        .filter(a => a.status !== 'Checkout')
        .forEach(a => {
          if (a.worker_id) alocacoesLogisticaMap.set(a.worker_id, a);
          if (a.codigo_colab && a.codigo_colab !== 'E-XXXX' && a.codigo_colab.toUpperCase() !== 'NO') {
            alocacoesByCodeMap.set(a.codigo_colab.toUpperCase().trim(), a);
          }
          if (a.worker_nome) {
            const norm = normalizeWName(a.worker_nome);
            if (norm) alocacoesByNameMap.set(norm, a);
          }
        });

      // Mapear em quais pedidos/solicitações cada trabalhador possui atribuição ATIVA / PLANEJADA / PAUSADA no momento
      const activeAssignmentOrdersByWorker = new Map<string, Set<string>>();
      (assignmentsRes.data || []).forEach((ass: any) => {
        const st = (ass.status || '').toLowerCase().trim();
        if (st === 'active' || st === 'planned' || st === 'paused') {
          const rawW = Array.isArray(ass.worker) ? ass.worker[0] : (ass.worker || {});
          const wId = rawW.id || ass.worker_id;
          const pId = ass.pedido_id ? String(ass.pedido_id).trim() : (ass.solicitud_id ? String(ass.solicitud_id).trim() : '');
          if (wId && pId) {
            if (!activeAssignmentOrdersByWorker.has(wId)) {
              activeAssignmentOrdersByWorker.set(wId, new Set());
            }
            activeAssignmentOrdersByWorker.get(wId)!.add(pId);
          }
        }
      });

      const todayIso = new Date().toISOString().split('T')[0];

      // 3. Montar Lista de Pedidos Comerciais com seus Trabalhadores Contratados e Reemplazos vinculados
      const commercialResult: PedidoDemandaLogistica[] = pedidos.map((ped: any) => {
        const client = clientsMap.get(ped.client_id) as any;
        const site = sitesMap.get(ped.client_site_id) as any;
        const empresa = empresasMap.get(ped.empresa_id) as any;

        const clienteNome = client?.trade_name || client?.legal_name || 'Cliente';
        const clienteTelefone = client?.phone || client?.mobile || '';
        const empresaNome = normalizeLogisticaEmpresa(empresa?.trade_name || empresa?.name || ped.empresa_nome || 'LUMINOUS');
        const obraNome = site?.name?.trim() || 'Obra Principal';
        const enderecoCompleto = site?.address_line?.trim() || 'Dirección no informada';
        const cidade = site?.city?.trim() || '';
        const codigoPostal = site?.postal_code?.trim() || '';
        const encarregadoNome = site?.contact_name?.trim() || '';
        const encarregadoTelefone = site?.contact_phone?.trim() || '';
        const encarregadoEmail = site?.contact_email?.trim() || '';

        // Datas do Pedido no Fuso Horário Correto
        const rawInicio = ped.expected_start_date || ped.planned_start_date || ped.start_date;
        const rawFim = ped.expected_end_date || ped.planned_end_date || ped.end_date;

        const dataInicioStr = formatToLocalDate(rawInicio) || todayIso;
        const dataInicioFormatada = formatDisplayDate(rawInicio) || dataInicioStr;

        const dataFimStr = formatToLocalDate(rawFim);
        const dataFimFormatada = formatDisplayDate(rawFim);

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
        const totalVagasPedido = pedidoItems.reduce((acc: number, it: any) => acc + Number(it.quantity_requested || 0), 0);

        const vagasPerfil: VagaPerfilItem[] = pedidoItems.map((it: any) => {
          const funcaoNome = it.job_function_name_snapshot || jobsMap.get(it.job_function_id) || 'Función / Perfil';
          const solicitado = Number(it.quantity_requested || 0);
          const cumprido = Number(it.quantity_fulfilled || 0);
          return {
            item_id: it.id,
            funcao: funcaoNome,
            total_solicitado: solicitado,
            contratados: cumprido,
            faltam_contratar: Math.max(0, solicitado - cumprido)
          };
        });

        const pedIdStr = String(ped.id || '').trim();

        // Identificar targets e solicitações de reemplazo vinculados a este pedido
        const pedTargets = allReplacementTargets.filter((t: any) => {
          const sol = solicitudesMap.get(t.solicitud_id);
          return (
            (t.source_pedido_id && String(t.source_pedido_id).trim() === pedIdStr) ||
            (sol?.pedido_id && String(sol.pedido_id).trim() === pedIdStr)
          );
        });

        const pedSolIds = new Set<string>();
        pedTargets.forEach((t: any) => {
          if (t.solicitud_id) pedSolIds.add(String(t.solicitud_id).trim());
        });
        allSolicitudes.forEach((s: any) => {
          if (s.pedido_id && String(s.pedido_id).trim() === pedIdStr && (s.tipo === 'replacement' || s.tipo === 'offboarding') && s.status !== 'cancelled') {
            pedSolIds.add(String(s.id).trim());
          }
        });

        // Trabalhadores contratados vinculados a este pedido (por pedido_id direto ou via solicitud_id de reemplazo deste pedido)
        const pedAssignments = (assignmentsRes.data || []).filter((ass: any) => {
          if (ass.pedido_id && String(ass.pedido_id).trim() === pedIdStr) return true;
          if (!ass.pedido_id && ass.solicitud_id && pedSolIds.has(String(ass.solicitud_id).trim())) return true;
          return false;
        });

        // Identificar todas as solicitações de reemplazo que afetam este pedido
        const solSet = new Set<string>(pedSolIds);
        pedAssignments.forEach((ass: any) => {
          if (ass.solicitud_id) solSet.add(ass.solicitud_id);
          if (ass.replacement_of_assignment_id) {
            const prevAss = allAssignmentsMap.get(ass.replacement_of_assignment_id);
            if (prevAss?.solicitud_id) solSet.add(prevAss.solicitud_id);
          }
        });

        const solicitudesReemplazo: SolicitudReemplazoResumo[] = Array.from(solSet)
          .map(id => solicitudesMap.get(id))
          .filter((s: any) => Boolean(s && (s.tipo === 'replacement' || s.codigo?.startsWith('R-') || pedTargets.some((t: any) => t.solicitud_id === s.id))))
          .map((s: any) => {
            const matchingTarget = pedTargets.find((t: any) => t.solicitud_id === s.id);
            return {
              id: s.id,
              codigo: s.codigo,
              title: s.title,
              motivo: matchingTarget?.reason || s.description
            };
          });
        
        const seenWorkerIds = new Set<string>();
        const trabalhadores: TrabalhadorDemandaItem[] = [];

        const isPedidoCompleted = (ped.operational_status || '').toLowerCase() === 'completed' || (ped.commercial_status || '').toLowerCase() === 'completed';
        const hasOngoingAssignmentsInPedido = pedAssignments.some((a: any) => {
          const st = (a.status || '').toLowerCase().trim();
          return st === 'active' || st === 'planned' || st === 'paused';
        });

        // Helper para vincular a alocação de alojamento apenas ao pedido vigente do trabalhador,
        // evitando que o alojamento atual de um novo pedido (ex: Zaragoza) apareça em um pedido anterior já encerrado para esse trabalhador (ex: Huelva)
        const resolveAlocLogForPedido = (workerId: string, wCode: string, normName: string, assStatus: string): Alocacao | undefined => {
          const candidate = alocacoesLogisticaMap.get(workerId) ||
                            (wCode ? alocacoesByCodeMap.get(wCode) : undefined) ||
                            (normName ? alocacoesByNameMap.get(normName) : undefined);
          if (!candidate) return undefined;

          const isActiveInThisOrder = assStatus === 'active' || assStatus === 'planned' || assStatus === 'paused';
          const workerActiveOrders = activeAssignmentOrdersByWorker.get(workerId);
          const isActiveInAnotherOrder = Boolean(
            workerActiveOrders && Array.from(workerActiveOrders).some(oid => oid !== pedIdStr && !pedSolIds.has(oid))
          );

          // Se o trabalhador já saiu deste pedido (completed/replaced/relocated/terminated) e está ativo em outro pedido,
          // o alojamento atual dele pertence ao pedido novo, não a este pedido antigo.
          if (!isActiveInThisOrder && isActiveInAnotherOrder) {
            return undefined;
          }

          const candPedidoId = candidate.pedido_id ? String(candidate.pedido_id).trim() : '';
          const isCandPedidoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candPedidoId);
          if (isCandPedidoUuid && candPedidoId !== pedIdStr && !pedSolIds.has(candPedidoId)) {
            // Se o alojamento está vinculado explicitamente a outro pedido e o trabalhador não está ativo neste pedido (ou está ativo no outro pedido)
            if (!isActiveInThisOrder || workerActiveOrders?.has(candPedidoId)) {
              return undefined;
            }
          }

          return candidate;
        };

        // 1. Processar primeiro as atribuições ATIVAS, PLANEJADAS, PAUSADAS ou CONCLUÍDAS (somente quando o pedido inteiro encerrou e o trabalhador não saiu antes)
        for (const ass of pedAssignments) {
          const assStatus = (ass.status || '').toLowerCase().trim();
          if (assStatus !== 'active' && assStatus !== 'planned' && assStatus !== 'paused' && assStatus !== 'completed') {
            continue;
          }

          const rawWorker = Array.isArray(ass.worker) ? ass.worker[0] : (ass.worker || {});
          const workerId = rawWorker.id || ass.worker_id || ass.id;
          
          if (!workerId || seenWorkerIds.has(workerId)) {
            continue;
          }

          // Se o status da atribuição for 'completed', mas o pedido ainda está em andamento com outros trabalhadores ativos
          // (ou se este trabalhador foi substituído neste pedido ou já está ativo em outro pedido),
          // significa que ele encerrou seu ciclo antecipadamente neste pedido (ex: realocado/baixa) e deve ser tratado no bloco histórico (bloco 2).
          if (assStatus === 'completed') {
            const wasReplacedHere = pedAssignments.some((other: any) => other.replacement_of_assignment_id === ass.id) ||
                                    pedTargets.some((t: any) => t.source_worker_id === workerId && t.target_worker_id);
            const workerActiveOrders = activeAssignmentOrdersByWorker.get(workerId);
            const isActiveElsewhere = Boolean(workerActiveOrders && Array.from(workerActiveOrders).some(oid => oid !== pedIdStr && !pedSolIds.has(oid)));
            if ((!isPedidoCompleted && hasOngoingAssignmentsInPedido) || wasReplacedHere || isActiveElsewhere) {
              continue;
            }
          }

          seenWorkerIds.add(workerId);

          // Verificar se este trabalhador é um reemplazo de alguém
          let substitutoDeNome: string | undefined;
          let solCodigo: string | undefined;

          if (ass.replacement_of_assignment_id) {
            const replacedAss = allAssignmentsMap.get(ass.replacement_of_assignment_id);
            if (replacedAss) {
              const repW = Array.isArray(replacedAss.worker) ? replacedAss.worker[0] : replacedAss.worker;
              substitutoDeNome = repW?.nome;
            }
          }

          const matchedTargetAsIncoming = pedTargets.find((t: any) => t.target_assignment_id === ass.id || t.target_worker_id === workerId);
          if (!substitutoDeNome && matchedTargetAsIncoming?.source_worker_id) {
            substitutoDeNome = extraWorkersMap.get(matchedTargetAsIncoming.source_worker_id)?.nome;
          }

          const resolvedSolId = ass.solicitud_id || matchedTargetAsIncoming?.solicitud_id;
          if (resolvedSolId) {
            solCodigo = solicitudesMap.get(resolvedSolId)?.codigo;
          }

          const normName = normalizeWName(rawWorker.nome);
          const wCode = (rawWorker.cod_colab || '').toUpperCase().trim();

          const alocLog = resolveAlocLogForPedido(workerId, wCode, normName, assStatus);

          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;

          const rhCheck = checkWorkerInativoRH(rawWorker.status_trabajador, rawWorker.status_seguridad);
          const rawBaixa = (!rhCheck.isInativo || rhCheck.isAfastado)
            ? undefined
            : (rawWorker.data_baixa || rawWorker.data_baixa_seguridad || alocLog?.data_baixa || ass.end_date);

          trabalhadores.push({
            assignment_id: ass.id,
            worker_id: workerId,
            worker_nome: rawWorker.nome || 'Trabalhador',
            codigo_colab: rawWorker.cod_colab || 'E-XXXX',
            nif: rawWorker.nif,
            movil: rawWorker.movil,
            funcao: ass.job_function_name_snapshot || matchedTargetAsIncoming?.target_job_function_name || 'Operador Especialista',
            data_inicio: formatToLocalDate(ass.planned_start_date || ass.start_date) || dataInicioStr,
            data_fim: dataFimStr,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            assignment_status: ass.status,
            is_substituido: false,
            substituto_de_nome: substitutoDeNome,
            solicitud_id: resolvedSolId,
            solicitud_codigo: solCodigo,
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined,
            status_trabajador: rawWorker.status_trabajador,
            status_seguridad: rawWorker.status_seguridad,
            is_inativo_rh: rhCheck.isInativo,
            is_afastado_rh: rhCheck.isAfastado,
            alerta_inativo_rh: rhCheck.motivo,
            data_baixa: rawBaixa ? formatToLocalDate(rawBaixa) : undefined
          });
        }

        // 2. Processar atribuições SUBSTITUÍDAS / HISTÓRICAS / ENCERRADAS ANTECIPADAMENTE deste pedido
        for (const ass of pedAssignments) {
          const assStatus = (ass.status || '').toLowerCase().trim();
          if (assStatus !== 'replaced' && assStatus !== 'relocated' && assStatus !== 'terminated' && assStatus !== 'completed') {
            continue;
          }

          const rawWorker = Array.isArray(ass.worker) ? ass.worker[0] : (ass.worker || {});
          const workerId = rawWorker.id || ass.worker_id || ass.id;
          if (!workerId || seenWorkerIds.has(workerId)) continue;

          const normName = normalizeWName(rawWorker.nome);
          const wCode = (rawWorker.cod_colab || '').toUpperCase().trim();

          const alocLog = resolveAlocLogForPedido(workerId, wCode, normName, assStatus);

          // Verificar se foi substituído por alguém neste pedido
          const incomingReplacement = pedAssignments.find((other: any) => other.replacement_of_assignment_id === ass.id);
          const matchedTargetAsOutgoing = pedTargets.find((t: any) => t.source_assignment_id === ass.id || t.source_worker_id === workerId);
          
          // Se não estiver alojado neste pedido E não tiver relação de substituição ativa neste pedido, ignora
          if (!alocLog && !incomingReplacement && !matchedTargetAsOutgoing) {
            continue;
          }

          seenWorkerIds.add(workerId);

          let substituidoPorNome: string | undefined;
          if (incomingReplacement) {
            const incW = Array.isArray(incomingReplacement.worker) ? incomingReplacement.worker[0] : incomingReplacement.worker;
            substituidoPorNome = incW?.nome;
          } else if (matchedTargetAsOutgoing?.target_worker_id) {
            substituidoPorNome = extraWorkersMap.get(matchedTargetAsOutgoing.target_worker_id)?.nome;
          }

          const solId = incomingReplacement?.solicitud_id || matchedTargetAsOutgoing?.solicitud_id || ass.solicitud_id;
          const solCodigo = solId ? solicitudesMap.get(solId)?.codigo : undefined;
          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;
          const rhCheckHist = checkWorkerInativoRH(rawWorker.status_trabajador, rawWorker.status_seguridad);
          const rawBaixaHist = rhCheckHist.isAfastado ? undefined : ((rhCheckHist.isInativo ? (rawWorker.data_baixa || rawWorker.data_baixa_seguridad || alocLog?.data_baixa) : undefined) || ass.end_date);

          trabalhadores.push({
            assignment_id: ass.id,
            worker_id: workerId,
            worker_nome: rawWorker.nome || 'Trabalhador',
            codigo_colab: rawWorker.cod_colab || 'E-XXXX',
            nif: rawWorker.nif,
            movil: rawWorker.movil,
            funcao: ass.job_function_name_snapshot || 'Operador Especialista',
            data_inicio: formatToLocalDate(ass.planned_start_date || ass.start_date) || dataInicioStr,
            data_fim: dataFimStr,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            assignment_status: ass.status,
            is_substituido: true,
            substituido_por_nome: substituidoPorNome,
            solicitud_id: solId,
            solicitud_codigo: solCodigo,
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined,
            status_trabajador: rawWorker.status_trabajador,
            status_seguridad: rawWorker.status_seguridad,
            is_inativo_rh: rhCheckHist.isInativo,
            is_afastado_rh: rhCheckHist.isAfastado,
            alerta_inativo_rh: rhCheckHist.motivo,
            data_baixa: rawBaixaHist ? formatToLocalDate(rawBaixaHist) : undefined
          });
        }

        const trabalhadoresAtivos = trabalhadores.filter(t => !t.is_substituido);
        const allWorkersCompletedCycle = trabalhadoresAtivos.length > 0 && trabalhadoresAtivos.every(t => (t.assignment_status || '').toLowerCase() === 'completed');
        const isEndDatePast = Boolean(dataFimStr && dataFimStr < todayIso);
        const isPedidoFinalizado = isPedidoCompleted || (allWorkersCompletedCycle && isEndDatePast);

        const totalAlojados = trabalhadoresAtivos.filter(t => t.status_alocacao === 'alocado').length;
        const totalPendentes = isPedidoFinalizado
          ? 0
          : trabalhadoresAtivos.filter(t => t.status_alocacao === 'pendente' && (t.assignment_status || '').toLowerCase() !== 'completed').length;
        const totalVagasFinal = Math.max(totalVagasPedido || 0, trabalhadoresAtivos.length, 1);
        const totalFaltamContratar = isPedidoFinalizado ? 0 : Math.max(0, totalVagasFinal - trabalhadoresAtivos.length);

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
          data_inicio_formatada: dataInicioFormatada,
          data_inicio_diasemana: diaSemanaInicio,
          data_fim: dataFimStr,
          data_fim_formatada: dataFimFormatada,
          data_fim_diasemana: diaSemanaFim,
          dias_restantes: diasRestantes,
          duracao_texto: duracaoTexto,
          duracao_dias: duracaoDias,
          tipo_solicitacao: solicitudesReemplazo.length > 0 ? 'Reemplazo' : 'Nuevo Pedido',
          solicitudes_reemplazo: solicitudesReemplazo,
          status_operacional: ped.operational_status || 'PARTIALLY_FULFILLED',
          commercial_status: ped.commercial_status || 'active',
          is_finalizado: isPedidoFinalizado,
          observacoes: ped.notes || 'Sin observaciones generales.',
          total_vagas_pedido: totalVagasFinal,
          total_contratados: trabalhadoresAtivos.length,
          total_faltam_contratar: totalFaltamContratar,
          total_alojados: totalAlojados,
          total_pendentes_alojamento: totalPendentes,
          vagas_perfil: vagasPerfil,
          trabalhadores: trabalhadores
        };
      });

      // 4. Montar Solicitudes de Reemplazo Operativo Autônomas (sem pedido_id comercial vinculado, ex: R-2026-000258)
      const standaloneSolIds = new Set<string>();
      allReplacementTargets.forEach((t: any) => {
        const sol = solicitudesMap.get(t.solicitud_id);
        const linkedPedId = t.source_pedido_id || sol?.pedido_id;
        if (!linkedPedId || !pedidoIdsSet.has(String(linkedPedId).trim())) {
          if (t.solicitud_id) standaloneSolIds.add(t.solicitud_id);
        }
      });

      (assignmentsRes.data || []).forEach((ass: any) => {
        if (!ass.pedido_id && ass.solicitud_id) {
          const sol = solicitudesMap.get(ass.solicitud_id);
          if (sol && sol.status !== 'cancelled' && (!sol.pedido_id || !pedidoIdsSet.has(String(sol.pedido_id).trim()))) {
            standaloneSolIds.add(sol.id);
          }
        }
      });

      const standaloneResult: PedidoDemandaLogistica[] = [];

      for (const solId of Array.from(standaloneSolIds)) {
        const sol = solicitudesMap.get(solId) as any;
        if (!sol || sol.status === 'cancelled') continue;

        const solTargets = allReplacementTargets.filter((t: any) => t.solicitud_id === solId);
        const solAssignments = (assignmentsRes.data || []).filter(
          (a: any) => a.solicitud_id === solId && (a.status || '').toLowerCase() !== 'cancelled'
        );

        // Ignorar se não houver nenhum trabalhador contratado nem vaga de reemplazo
        if (solTargets.length === 0 && solAssignments.length === 0) continue;

        const clientId = sol.client_id || solTargets[0]?.source_client_id || solAssignments[0]?.client_id;
        const siteId = sol.client_site_id || solTargets[0]?.source_client_site_id || solAssignments[0]?.client_site_id;
        const empresaId = sol.empresa_id || solTargets[0]?.empresa_id || solAssignments[0]?.empresa_id;

        const client = clientsMap.get(clientId) as any;
        const site = sitesMap.get(siteId) as any;
        const empresa = empresasMap.get(empresaId) as any;

        const clienteNome = client?.trade_name || client?.legal_name || 'Cliente';
        const clienteTelefone = client?.phone || client?.mobile || '';
        const empresaNome = normalizeLogisticaEmpresa(empresa?.trade_name || empresa?.name || 'LUMINOUS');
        const obraNome = site?.name?.trim() || clienteNome || 'Obra Principal';
        const enderecoCompleto = site?.address_line?.trim() || 'Dirección no informada';
        const cidade = site?.city?.trim() || '';
        const codigoPostal = site?.postal_code?.trim() || '';
        const encarregadoNome = site?.contact_name?.trim() || '';
        const encarregadoTelefone = site?.contact_phone?.trim() || '';
        const encarregadoEmail = site?.contact_email?.trim() || '';

        const rawInicio = sol.due_date || solAssignments[0]?.planned_start_date || solAssignments[0]?.start_date || sol.created_at;
        const dataInicioStr = formatToLocalDate(rawInicio) || todayIso;
        const dataInicioFormatada = formatDisplayDate(rawInicio) || dataInicioStr;
        const dataInicio = new Date(dataInicioStr);
        const hoje = new Date();
        const diasRestantes = Math.ceil((dataInicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const duracaoTexto = calculateDurationText(dataInicioStr, undefined);
        const diaSemanaInicio = getWeekDayEs(dataInicioStr);

        const seenWorkerIds = new Set<string>();
        const trabalhadores: TrabalhadorDemandaItem[] = [];
        const solIdStr = String(sol.id).trim();

        const resolveAlocLogForStandalone = (workerId: string, wCode: string, normName: string, isIncomingHired: boolean, assEndDate?: string): Alocacao | undefined => {
          const candidate = alocacoesLogisticaMap.get(workerId) ||
                            (wCode ? alocacoesByCodeMap.get(wCode) : undefined) ||
                            (normName ? alocacoesByNameMap.get(normName) : undefined);
          if (!candidate) return undefined;

          const workerActiveOrders = activeAssignmentOrdersByWorker.get(workerId);
          const isActiveInAnotherOrder = Boolean(
            workerActiveOrders && Array.from(workerActiveOrders).some(oid => oid !== solIdStr)
          );

          const isEndedPast = Boolean(assEndDate && formatToLocalDate(assEndDate) < todayIso);
          if ((!isIncomingHired || isEndedPast) && isActiveInAnotherOrder) {
            return undefined;
          }

          const candPedidoId = candidate.pedido_id ? String(candidate.pedido_id).trim() : '';
          const isCandPedidoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candPedidoId);
          if (isCandPedidoUuid && candPedidoId !== solIdStr && workerActiveOrders?.has(candPedidoId)) {
            return undefined;
          }

          return candidate;
        };

        // 4.1 Trabalhadores Contratados para este Reemplazo (Substitutos que entram)
        for (const ass of solAssignments) {
          const rawWorker = Array.isArray(ass.worker) ? ass.worker[0] : (ass.worker || {});
          const workerId = rawWorker.id || ass.worker_id || ass.id;
          if (!workerId || seenWorkerIds.has(workerId)) continue;

          // Verificar se foi substituído dentro da MESMA solicitud
          const wasReplacedInsideSameSol = solAssignments.some((other: any) => other.replacement_of_assignment_id === ass.id);
          if (wasReplacedInsideSameSol) continue;

          seenWorkerIds.add(workerId);

          const matchedTarget = solTargets.find(
            (t: any) => t.target_assignment_id === ass.id || t.target_worker_id === workerId
          ) || solTargets[0];

          let substitutoDeNome: string | undefined;
          if (matchedTarget?.source_worker_id) {
            substitutoDeNome = extraWorkersMap.get(matchedTarget.source_worker_id)?.nome;
          } else if (ass.replacement_of_assignment_id) {
            const repAss = allAssignmentsMap.get(ass.replacement_of_assignment_id);
            const repW = Array.isArray(repAss?.worker) ? repAss.worker[0] : repAss?.worker;
            substitutoDeNome = repW?.nome;
          }

          const normName = normalizeWName(rawWorker.nome);
          const wCode = (rawWorker.cod_colab || '').toUpperCase().trim();
          const alocLog = resolveAlocLogForStandalone(workerId, wCode, normName, true, ass.end_date);
          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;

          const rhCheck = checkWorkerInativoRH(rawWorker.status_trabajador, rawWorker.status_seguridad);
          const rawBaixa = (!rhCheck.isInativo || rhCheck.isAfastado)
            ? undefined
            : (rawWorker.data_baixa || rawWorker.data_baixa_seguridad || alocLog?.data_baixa || ass.end_date);

          // Se o trabalhador foi contratado para este reemplazo (ex: R-2026-000258) e depois teve um novo reemplazo futuro (ex: R-2026-000264),
          // no contexto deste reemplazo (R-2026-000258) ele continua sendo o trabalhador contratado que necessita alojamento!
          const rawAssStatus = (ass.status || 'active').toLowerCase().trim();
          const effectiveStatus = rawAssStatus === 'replaced' ? 'active' : ass.status;

          trabalhadores.push({
            assignment_id: ass.id,
            worker_id: workerId,
            worker_nome: rawWorker.nome || 'Trabalhador',
            codigo_colab: rawWorker.cod_colab || 'E-XXXX',
            nif: rawWorker.nif,
            movil: rawWorker.movil,
            funcao: ass.job_function_name_snapshot || matchedTarget?.target_job_function_name || 'Operador Especialista',
            data_inicio: formatToLocalDate(ass.planned_start_date || ass.start_date) || dataInicioStr,
            data_fim: ass.end_date ? formatToLocalDate(ass.end_date) : undefined,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            assignment_status: effectiveStatus,
            is_substituido: false,
            substituto_de_nome: substitutoDeNome,
            solicitud_id: sol.id,
            solicitud_codigo: sol.codigo,
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined,
            status_trabajador: rawWorker.status_trabajador,
            status_seguridad: rawWorker.status_seguridad,
            is_inativo_rh: rhCheck.isInativo,
            is_afastado_rh: rhCheck.isAfastado,
            alerta_inativo_rh: rhCheck.motivo,
            data_baixa: rawBaixa ? formatToLocalDate(rawBaixa) : undefined
          });
        }

        // Caso algum target tenha target_worker_id preenchido sem linha correspondente em solAssignments
        for (const t of solTargets) {
          if (!t.target_worker_id || seenWorkerIds.has(t.target_worker_id)) continue;
          const tw = extraWorkersMap.get(t.target_worker_id);
          if (!tw) continue;

          seenWorkerIds.add(tw.id);
          const sw = t.source_worker_id ? extraWorkersMap.get(t.source_worker_id) : undefined;
          const normName = normalizeWName(tw.nome);
          const wCode = (tw.cod_colab || '').toUpperCase().trim();
          const alocLog = resolveAlocLogForStandalone(tw.id, wCode, normName, true);
          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;
          const rhCheck = checkWorkerInativoRH(tw.status_trabajador, tw.status_seguridad);
          const rawBaixa = (!rhCheck.isInativo || rhCheck.isAfastado)
            ? undefined
            : (tw.data_baixa || tw.data_baixa_seguridad || alocLog?.data_baixa);

          trabalhadores.push({
            assignment_id: t.target_assignment_id || `target-${t.id}`,
            worker_id: tw.id,
            worker_nome: tw.nome || 'Trabalhador',
            codigo_colab: tw.cod_colab || 'E-XXXX',
            nif: tw.nif,
            movil: tw.movil,
            funcao: t.target_job_function_name || tw.funcion || 'Operador Especialista',
            data_inicio: dataInicioStr,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            assignment_status: 'active',
            is_substituido: false,
            substituto_de_nome: sw?.nome,
            solicitud_id: sol.id,
            solicitud_codigo: sol.codigo,
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined,
            status_trabajador: tw.status_trabajador,
            status_seguridad: tw.status_seguridad,
            is_inativo_rh: rhCheck.isInativo,
            is_afastado_rh: rhCheck.isAfastado,
            alerta_inativo_rh: rhCheck.motivo,
            data_baixa: rawBaixa ? formatToLocalDate(rawBaixa) : undefined
          });
        }

        // 4.2 Trabalhadores Substituídos / Salientes deste Reemplazo (source_worker_id)
        for (const t of solTargets) {
          if (!t.source_worker_id || seenWorkerIds.has(t.source_worker_id)) continue;
          const sw = extraWorkersMap.get(t.source_worker_id);
          if (!sw) continue;

          seenWorkerIds.add(sw.id);
          const tw = t.target_worker_id ? extraWorkersMap.get(t.target_worker_id) : undefined;
          const fallbackIncoming = trabalhadores.find(w => !w.is_substituido);
          const substituidoPorNome = tw?.nome || fallbackIncoming?.worker_nome;

          const normName = normalizeWName(sw.nome);
          const wCode = (sw.cod_colab || '').toUpperCase().trim();
          const alocLog = resolveAlocLogForStandalone(sw.id, wCode, normName, false);
          const aloj = alocLog?.alojamento_id ? alojMap.get(alocLog.alojamento_id) : undefined;
          const rhCheckHist = checkWorkerInativoRH(sw.status_trabajador, sw.status_seguridad);
          const rawBaixaHist = rhCheckHist.isAfastado
            ? undefined
            : (rhCheckHist.isInativo ? (sw.data_baixa || sw.data_baixa_seguridad || alocLog?.data_baixa) : undefined);

          trabalhadores.push({
            assignment_id: t.source_assignment_id || `source-${t.id}`,
            worker_id: sw.id,
            worker_nome: sw.nome || 'Trabalhador',
            codigo_colab: sw.cod_colab || 'E-XXXX',
            nif: sw.nif,
            movil: sw.movil,
            funcao: t.target_job_function_name || sw.funcion || 'Operador Especialista',
            data_inicio: alocLog?.data_inicio || dataInicioStr,
            status_alocacao: alocLog ? 'alocado' : 'pendente',
            assignment_status: 'replaced',
            is_substituido: true,
            substituido_por_nome: substituidoPorNome,
            solicitud_id: sol.id,
            solicitud_codigo: sol.codigo,
            alocacao_detalhe: alocLog ? {
              alocacao_id: alocLog.id,
              alojamento_id: alocLog.alojamento_id || '',
              alojamento_nome: aloj?.nome || alocLog.obra_nome || 'Alojamiento',
              alojamento_codigo: aloj?.codigo || 'AL-XXXX',
              cama_id: alocLog.cama_id,
              cama_identificador: alocLog.cama_id.includes('ind') ? 'Cama Individual' : 'Cama Doble',
              data_inicio: alocLog.data_inicio,
              data_fim: alocLog.data_fim
            } : undefined,
            status_trabajador: sw.status_trabajador,
            status_seguridad: sw.status_seguridad,
            is_inativo_rh: rhCheckHist.isInativo,
            is_afastado_rh: rhCheckHist.isAfastado,
            alerta_inativo_rh: rhCheckHist.motivo,
            data_baixa: rawBaixaHist ? formatToLocalDate(rawBaixaHist) : undefined
          });
        }

        const trabalhadoresAtivos = trabalhadores.filter(t => !t.is_substituido);
        const totalSolicitado = Math.max(solTargets.length, trabalhadoresAtivos.length, 1);

        const vagasPerfil: VagaPerfilItem[] = solTargets.length > 0
          ? solTargets.map((t: any) => {
              const isFulfilled = Boolean(t.status === 'completed' || t.target_worker_id || t.target_assignment_id);
              return {
                item_id: t.id,
                funcao: t.target_job_function_name || jobsMap.get(t.target_job_function_id) || 'Función / Perfil',
                total_solicitado: 1,
                contratados: isFulfilled ? 1 : 0,
                faltam_contratar: isFulfilled ? 0 : 1
              };
            })
          : [{
              item_id: sol.id,
              funcao: trabalhadoresAtivos[0]?.funcao || 'Operador Especialista',
              total_solicitado: totalSolicitado,
              contratados: trabalhadoresAtivos.length,
              faltam_contratar: Math.max(0, totalSolicitado - trabalhadoresAtivos.length)
            }];

        const manualCompletedFlag = sol.pergunta_respuesta?.__logistica_completed;
        const allWorkersCompletedCycle = trabalhadoresAtivos.length > 0 && trabalhadoresAtivos.every(
          t => (t.assignment_status || '').toLowerCase() === 'completed'
        );
        const isPedidoFinalizado = manualCompletedFlag === true
          ? true
          : manualCompletedFlag === false
          ? false
          : allWorkersCompletedCycle;

        const totalAlojados = trabalhadoresAtivos.filter(t => t.status_alocacao === 'alocado').length;
        const totalPendentes = isPedidoFinalizado
          ? 0
          : trabalhadoresAtivos.filter(
              t => t.status_alocacao === 'pendente' && (t.assignment_status || '').toLowerCase() !== 'completed'
            ).length;
        const totalFaltamContratar = isPedidoFinalizado ? 0 : Math.max(0, totalSolicitado - trabalhadoresAtivos.length);

        standaloneResult.push({
          pedido_id: sol.id,
          pedido_codigo: sol.codigo || `R-${sol.id.slice(0, 6)}`,
          cliente_id: clientId,
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone,
          empresa_id: empresaId,
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
          data_inicio_formatada: dataInicioFormatada,
          data_inicio_diasemana: diaSemanaInicio,
          dias_restantes: diasRestantes,
          duracao_texto: duracaoTexto,
          tipo_solicitacao: 'Reemplazo',
          solicitudes_reemplazo: [{
            id: sol.id,
            codigo: sol.codigo,
            title: sol.title,
            motivo: solTargets[0]?.reason || sol.description
          }],
          status_operacional: sol.status === 'completed' ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
          commercial_status: isPedidoFinalizado ? 'completed' : 'active',
          is_finalizado: isPedidoFinalizado,
          observacoes: sol.description || solTargets[0]?.notes || 'Sustitución operativa (Reemplazo).',
          total_vagas_pedido: totalSolicitado,
          total_contratados: trabalhadoresAtivos.length,
          total_faltam_contratar: totalFaltamContratar,
          total_alojados: totalAlojados,
          total_pendentes_alojamento: totalPendentes,
          vagas_perfil: vagasPerfil,
          trabalhadores: trabalhadores
        });
      }

      return [...commercialResult, ...standaloneResult];
    } catch (err) {
      console.error('Error fetching pedidos demanda logistica:', err);
      return [];
    }
  },

  async finalizarPedido(pedidoId: string): Promise<void> {
    const cleanId = pedidoId.replace(/^reemplazo-/, '');
    const { data: pedUpdated, error: pedErr } = await supabase
      .schema('core_comercial')
      .from('pedidos')
      .update({ commercial_status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', cleanId)
      .select('id');
    if (pedErr) throw pedErr;

    if (!pedUpdated || pedUpdated.length === 0) {
      const { data: solRow } = await supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('id, pergunta_respuesta')
        .eq('id', cleanId)
        .maybeSingle();
      if (solRow) {
        const nextPr = { ...(solRow.pergunta_respuesta || {}), __logistica_completed: true };
        await supabase
          .schema('core_operacoes')
          .from('solicitudes_operativas')
          .update({ pergunta_respuesta: nextPr, updated_at: new Date().toISOString() })
          .eq('id', cleanId);
      }
    }
  },

  async reabrirPedido(pedidoId: string): Promise<void> {
    const cleanId = pedidoId.replace(/^reemplazo-/, '');
    const { data: pedUpdated, error: pedErr } = await supabase
      .schema('core_comercial')
      .from('pedidos')
      .update({ commercial_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', cleanId)
      .select('id');
    if (pedErr) throw pedErr;

    if (!pedUpdated || pedUpdated.length === 0) {
      const { data: solRow } = await supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('id, pergunta_respuesta')
        .eq('id', cleanId)
        .maybeSingle();
      if (solRow) {
        const nextPr = { ...(solRow.pergunta_respuesta || {}), __logistica_completed: false };
        await supabase
          .schema('core_operacoes')
          .from('solicitudes_operativas')
          .update({ pergunta_respuesta: nextPr, updated_at: new Date().toISOString() })
          .eq('id', cleanId);
      }
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
      .map(a => {
        const aloj = alojMap.get(a.alojamento_id || '') || a.alojamento;
        const nomeAloj = (aloj?.nome || a.alojamento?.nome || '').toUpperCase();
        const tipoOrig = (a.tipo_alojamento || '').toUpperCase().trim();
        const obs = ((a.observacoes || '') + ' ' + (a.endereco || '')).toUpperCase();

        // Se o registro possui um alojamento_id real de imóvel da empresa ou tipo_alojamento FIJO/TEMPORAL,
        // nunca deve ser reclassificado como Propio/Cliente apenas por texto nas observações
        const hasRealCompanyAlojamento = Boolean(
          a.alojamento_id &&
          a.alojamento_id !== 'propio' &&
          a.alojamento_id !== 'cliente' &&
          alojMap.has(a.alojamento_id)
        );
        const isFijoOrTemporal = tipoOrig === 'FIJO' || tipoOrig === 'TEMPORAL';

        const isCliente = !hasRealCompanyAlojamento && (
          a.status === 'Alojamiento Cliente' ||
          a.tipo_alojamento === 'Cliente' ||
          tipoOrig === 'CLIENTE' ||
          a.alojamento_id === 'cliente' ||
          (!isFijoOrTemporal && (
            nomeAloj.includes('CUENTA DEL CLIENTE') ||
            nomeAloj.includes('HOTEL COGULLADA') ||
            obs.includes('CUENTA DEL CLIENTE')
          ))
        );

        const isPropio = !hasRealCompanyAlojamento && !isCliente && (
          a.status === 'Alojamiento Propio' ||
          a.tipo_alojamento === 'Propio' ||
          tipoOrig === 'PROPIO' ||
          a.alojamento_id === 'propio' ||
          (!isFijoOrTemporal && (
            nomeAloj.includes('CUENTA PROPIA') ||
            obs.includes('CUENTA PROPIA')
          ))
        );

        // Para alojamentos da empresa ou cliente, ignora os que já realizaram check-out.
        // Para Alojamiento Propio, mantém os finalizados (Checkout) para cálculo proporcional no mês de saída!
        if (!isPropio && a.status === 'Checkout') {
          return null;
        }

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
          empresa_contratante: normalizeLogisticaEmpresa(a.empresa_contratante),
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
          data_fim: a.data_fim,
          motivo_checkout: a.motivo_checkout,
          status: isPropio 
            ? (a.status === 'Checkout' ? 'Checkout' : 'Alojamiento Propio')
            : isCliente 
            ? 'Alojamiento Cliente' 
            : (a.status === 'Baixa Notificada' ? 'Baixa Notificada' : 'Ativo'),
          tipo_alojamento: resolvedTipo,
          custo_alojamento: a.custo_alojamento,
          contacto_hospedaje: a.contacto_hospedaje || aloj?.provedor?.telefone || '',
          worker_movil: a.worker_movil || '',
          status_trabajador: a.status_trabajador,
          status_seguridad: a.status_seguridad,
          is_inativo_rh: a.is_inativo_rh,
          is_afastado_rh: a.is_afastado_rh,
          alerta_inativo_rh: a.alerta_inativo_rh,
          data_baixa: a.data_baixa
        } as TrabalhadorAlojado;
      })
      .filter((item): item is TrabalhadorAlojado => item !== null);
  },

  async fetchHistoricoAlojamentosTrabalhador(params: {
    workerId?: string;
    codigoColab?: string;
    workerNome?: string;
  }): Promise<Alocacao[]> {
    const allAlocacoes = await this.fetchAlocacoesAtivas();
    const codeKey = (params.codigoColab || '').toUpperCase().trim();
    const nameKey = (params.workerNome || '').toUpperCase().trim();

    return allAlocacoes
      .filter(a => {
        if (params.workerId && a.worker_id === params.workerId) return true;
        if (codeKey && a.codigo_colab && a.codigo_colab.toUpperCase().trim() === codeKey) return true;
        if (nameKey && nameKey.length > 4 && a.worker_nome && a.worker_nome.toUpperCase().trim() === nameKey) return true;
        return false;
      })
      .sort((a, b) => String(b.data_inicio || '').localeCompare(String(a.data_inicio || '')));
  }
};
