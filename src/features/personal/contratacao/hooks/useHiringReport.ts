import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { isHoldingId } from '@/shared/utils/empresaUtils';

export interface HiringReportFilters {
  empresa_id?: string | null;
  is_holding?: boolean;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  clientFilter?: string;
  contratanteFilter?: string;
  contratadorFilter?: string;
  pedidoFilter?: string;
  jobFunctionFilter?: string;
  statusFilter?: string;    // 'all' | 'active' | 'pending_entry' | 'withdrawn' | 'inactive'
  seguridadFilter?: string; // 'all' | 'alta' | 'regularizacao'
}

export type WorkerDisplayStatus = 'active' | 'pending_entry' | 'withdrawn' | 'inactive';

export interface CountryInfo {
  code: 'ES' | 'FR' | 'IT' | 'OTHER';
  name: string;
  flag: string;
}

export interface HiringReportItem {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_document: string;
  contratante: string; // Empresa do Grupo
  contratador: string; // Recrutador / Usuário que contratou (Wolmer / Contratação)
  vendedor: string;    // Comercial / Vendedor Responsável pelo Pedido
  client_id: string;
  client_name: string;
  client_site_name: string;
  country: string;      // 'Espanha' | 'França' | 'Itália'
  country_code: string; // 'ES' | 'FR' | 'IT'
  country_flag: string; // '🇪🇸' | '🇫🇷' | '🇮🇹'
  pedido_id: string;
  pedido_codigo: string;
  job_function_name: string;
  tarifa_acordada: number | null;
  start_date: string | null;
  end_date: string | null;
  planned_start_date: string | null;
  days_worked: number;
  status: string; // 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | 'replaced' | 'relocated'
  display_status: WorkerDisplayStatus; // 'active' | 'pending_entry' | 'withdrawn' | 'inactive'
  status_label: string; // 'Ativo' | 'Pendente Ingresso' | 'Desligado'
  is_active: boolean;
  assignment_type: string | null;
  notes: string | null;
  created_at: string;
  status_seguridad: string;
  is_seguridad_alta: boolean;
}

export interface FunctionBreakdown {
  functionName: string;
  total: number;
  active: number;
  inactive: number;
  withdrawn: number;
  retentionRate: number;
  pctOfTotal: number;
}

export interface CountryStat {
  countryCode: string;
  countryName: string;
  flag: string;
  total: number;
  active: number;
  withdrawn: number;
  inactive: number;
  pct: number;
}

export interface DailyTimelinePoint {
  day: number;
  dateStr: string;
  dayLabel: string;
  total: number;
  active: number;
  withdrawn: number;
  inactive: number;
}

export interface SellerStat {
  sellerName: string;
  totalHired: number;
  active: number;
  replaced: number;
  withdrawn: number;
  pedidosCount: number;
  pedidosCodes: string[];
  clientsCount: number;
  retentionRate: number;
}

export interface ClientStat {
  clientId: string;
  clientName: string;
  country: string;
  flag: string;
  totalHired: number;
  active: number;
  replaced: number;
  withdrawn: number;
  pedidosCodes: string[];
  retentionRate: number;
}

export interface ContratanteBreakdown {
  contratante: string;
  total: number;
  active: number;
  inactive: number;
}

export function resolveCountry(client?: any, site?: any): CountryInfo {
  const countryId = site?.country_id || client?.country_id;
  const taxId = (client?.tax_id || '').toUpperCase().trim();
  const province = (site?.province || client?.province || '').toLowerCase();
  const name = (client?.trade_name || client?.legal_name || '').toLowerCase();

  // 1. Direct known Country UUIDs
  if (countryId === 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd' || taxId.startsWith('FR')) {
    return { code: 'FR', name: 'França', flag: '🇫🇷' };
  }
  if (countryId === '3623ec00-42ae-4673-a842-c20b47da0e5e' || taxId.startsWith('IT')) {
    return { code: 'IT', name: 'Itália', flag: '🇮🇹' };
  }
  if (countryId === '2f487ab4-c7f5-4b70-9c37-995dc4cda125' || taxId.startsWith('ES')) {
    return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
  }

  // 2. Name or province indicators
  if (
    province.includes('occitanie') || 
    province.includes('paris') || 
    province.includes('lyon') || 
    name.includes('france') || 
    name.includes('delbeque') || 
    name.includes('etudes et fabrication')
  ) {
    return { code: 'FR', name: 'França', flag: '🇫🇷' };
  }
  if (
    province.includes('lucca') || 
    province.includes('milano') || 
    province.includes('roma') || 
    name.includes('italia') || 
    name.includes('italy') || 
    name.includes('srl') || 
    name.includes('stil montaggi') || 
    name.includes('giada')
  ) {
    return { code: 'IT', name: 'Itália', flag: '🇮🇹' };
  }

  // Default to Espanha (primary Iberian operation)
  return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
}

export function formatStandardContratante(rawName: string | null | undefined): string {
  if (!rawName) return 'Não informada';
  const clean = rawName.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('luminous')) return 'Luminous';
  if (lower.includes('wiseowe')) return 'Wiseowe';
  if (lower.includes('stocco')) return 'Stocco';
  if (lower.includes('triangulo')) return 'Triangulo';
  if (lower.includes('rosas') || lower.includes('kotrik')) return 'Kotrik & Rosas';

  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export const KNOWN_CONTRATADORES: Record<string, string> = {
  '83683c3d-06e9-423c-8e1c-1269f85657e1': 'Contratação',
  'contratacao@wolterscontratacao.com': 'Contratação',
  '5e02eed1-e0b2-4d88-9069-f01569b76785': 'Wolmer',
  'wolmer@gestaologinpro.com': 'Wolmer',
  'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb': 'Walter',
  'valter@gestaologinpro.com': 'Walter',
};

export function formatStandardContratador(
  rawName: string | null | undefined,
  userMap?: Map<string, string>
): string {
  if (!rawName) return 'Wolmer';
  const clean = rawName.trim();
  if (KNOWN_CONTRATADORES[clean]) return KNOWN_CONTRATADORES[clean];
  if (userMap?.has(clean)) return userMap.get(clean)!;

  const lower = clean.toLowerCase();

  if (lower.includes('contratacao') || lower.includes('wolters') || lower.includes('contratação')) return 'Contratação';
  if (lower.includes('wolmer')) return 'Wolmer';
  if (lower.includes('valter') || lower.includes('walter')) return 'Walter';

  if (clean.includes('@')) {
    const user = clean.split('@')[0];
    return user.charAt(0).toUpperCase() + user.slice(1);
  }

  return clean;
}

function parseLocalDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const dt = new Date(dateStr);
  return isNaN(dt.getTime()) ? null : dt;
}

const normalizeString = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export function useHiringReport(filters: HiringReportFilters) {
  return useQuery({
    queryKey: ['hiring_report', filters],
    queryFn: async () => {
      if (!filters.empresa_id && !filters.is_holding) {
        return emptyReport();
      }

      // If user selected Holding (e.g. LOGIN PRO) or is_holding is true,
      // query with empresaId = null so it aggregates all companies across the group!
      const isHolding = !!filters.is_holding || isHoldingId(filters.empresa_id);
      const queryEmpresaId = isHolding ? null : filters.empresa_id;

      // 1. Fetch report data for the selected empresa_id (or all companies if holding)
      let result = await fetchReportDataForEmpresa(queryEmpresaId, filters);

      // 2. Fallback / Holding Aggregation: If selected company returns 0 or 1 item while in holding or empty,
      // fetch across ALL companies in the group (empresaId = null) to ensure holding aggregates all child companies.
      if (queryEmpresaId && (result.combined.length <= 1 || (result.assignmentsData.length <= 1 && result.activeWorkers.length <= 5))) {
        const groupResult = await fetchReportDataForEmpresa(null, filters);
        if (groupResult.combined.length > result.combined.length) {
          result = groupResult;
        }
      }

      return processAssignments(result.combined, filters, result.targetEmpresaNome);
    },
    enabled: !!filters.empresa_id || !!filters.is_holding,
  });
}

function emptyReport() {
  return {
    items: [],
    totalHired: 0,
    totalActive: 0,
    totalPendingEntry: 0,
    totalWithdrawn: 0,
    totalInactive: 0,
    totalStarted: 0,
    retentionRate: 0,
    turnoverRate: 0,
    totalAlta: 0,
    totalRegularizacao: 0,
    pctAlta: 0,
    pctRegularizacao: 0,
    totalSeguridadeBase: 0,
    avgDaysWorked: 0,
    functionBreakdown: [],
    contratanteBreakdown: [],
    countryBreakdown: [],
    dailyTimeline: [],
    sellerBreakdown: [],
    clientBreakdown: [],
    uniqueClients: [],
    uniqueContratantes: [],
    uniqueContratadores: [],
    uniquePedidos: [],
    uniqueFunctions: [],
  };
}

async function fetchReportDataForEmpresa(empresaId: string | null, filters: HiringReportFilters) {
  // 1. Query worker_assignments
  let assignmentsQuery = supabase
    .schema('core_personal')
    .from('worker_assignments')
    .select(`
      *,
      worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante, contractor, status_seguridad, status_trabajador, data_baixa),
      replaced_assignment:worker_assignments!replacement_of_assignment_id(
        id,
        worker:workers(id, nome)
      )
    `);

  if (empresaId) {
    assignmentsQuery = assignmentsQuery.eq('empresa_id', empresaId);
  }

  const { data: assignments, error: assignError } = await assignmentsQuery.order('start_date', { ascending: false });
  if (assignError) console.error('Error fetching worker_assignments:', assignError);

  const assignmentsData = assignments || [];

  // 2. Batch Lookups
  const pedidoIds = [...new Set(assignmentsData.map(a => a.pedido_id).filter(Boolean))];
  const siteIds = [...new Set(assignmentsData.map(a => a.client_site_id).filter(Boolean))];
  const empresaIds = [...new Set(assignmentsData.map(a => a.empresa_id).filter(Boolean))];

  if (filters.empresa_id && !empresaIds.includes(filters.empresa_id)) {
    empresaIds.push(filters.empresa_id);
  }

  // Calculate all months covered by startDate and endDate for multi-month queries
  const now = new Date();
  const startY = filters.startDate ? Number(filters.startDate.split('-')[0]) || now.getFullYear() : now.getFullYear();
  const startM = filters.startDate ? Number(filters.startDate.split('-')[1]) || (now.getMonth() + 1) : (now.getMonth() + 1);
  const endY = filters.endDate ? Number(filters.endDate.split('-')[0]) || startY : startY;
  const endM = filters.endDate ? Number(filters.endDate.split('-')[1]) || startM : startM;

  const monthsToFetch: { year: number; month: number }[] = [];
  if (startY === endY) {
    const minM = Math.min(startM, endM);
    const maxM = Math.max(startM, endM);
    for (let m = minM; m <= maxM; m++) {
      monthsToFetch.push({ year: startY, month: m });
    }
  } else {
    monthsToFetch.push({ year: startY, month: startM });
    monthsToFetch.push({ year: endY, month: endM });
  }

  // If fetching custom or all periods, also include adjacent months so cross-month workers are included
  if (monthsToFetch.length === 1 && startM > 1) {
    monthsToFetch.push({ year: startY, month: startM - 1 });
  }
  if (monthsToFetch.length === 1 && startM < 12) {
    monthsToFetch.push({ year: startY, month: startM + 1 });
  }

  const [pedidosRes, estimacionesRes, allClientsRes, sitesRes, empresasRes, usersRes] = await Promise.all([
    supabase.schema('core_comercial').from('pedidos').select('id, codigo, created_by, commercial_owner_id, responsible_id, client_id, client_site_id, source_estimacion_id'),
    supabase.schema('core_comercial').from('estimaciones').select('id, codigo, created_by, commercial_owner_id'),
    supabase.schema('core_common').from('clients').select('id, trade_name, legal_name, country_id, tax_id, province, city'),
    siteIds.length > 0
      ? supabase.schema('core_common').from('client_sites').select('id, name, country_id, province, city').in('id', siteIds)
      : Promise.resolve({ data: [] }),
    empresaIds.length > 0
      ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
      : Promise.resolve({ data: [] }),
    supabase.schema('core_operacoes').from('mcs_users').select('id, email, display_name'),
  ]);

  const userMap = new Map<string, string>();
  const sellerMap = new Map<string, string>();
  ((usersRes as any)?.data || []).forEach((u: any) => {
    const lowerEmail = (u.email || '').toLowerCase().trim();
    const lowerName = (u.display_name || '').toLowerCase().trim();
    let standard = '';
    if (lowerEmail.includes('contratacao') || lowerName.includes('contratacao') || lowerName.includes('wolters') || lowerEmail.includes('wolters')) {
      standard = 'Contratação';
    } else if (lowerEmail.includes('wolmer') || lowerName.includes('wolmer')) {
      standard = 'Wolmer';
    } else if (lowerEmail.includes('valter') || lowerName.includes('valter') || lowerName.includes('walter')) {
      standard = 'Walter';
    } else if (u.display_name) {
      standard = u.display_name;
    }
    if (standard) {
      if (u.id) userMap.set(u.id, standard);
      if (u.email) userMap.set(u.email, standard);
    }
    const cleanSellerName = u.display_name?.trim() || u.email?.split('@')[0]?.trim() || 'Comercial';
    if (u.id) {
      sellerMap.set(u.id, cleanSellerName);
      sellerMap.set(u.id.toLowerCase(), cleanSellerName);
    }
    if (u.email) {
      sellerMap.set(u.email, cleanSellerName);
      sellerMap.set(lowerEmail, cleanSellerName);
    }
  });

  const workerRecruiterMap = new Map<string, string>();
  assignmentsData.forEach((a: any) => {
    const raw = a.created_by || a.contractor || a.worker?.contractor || a.sp_created_by;
    if (a.worker_id && raw) {
      workerRecruiterMap.set(a.worker_id, formatStandardContratador(raw, userMap));
    }
  });

  // Fetch RPC get_hours_control_workers across all target months to get all active workers
  const activeWorkersMap = new Map<string, any>();
  await Promise.all(
    monthsToFetch.map(async ({ year, month }) => {
      try {
        const { data } = await supabase.schema('core_personal').rpc('get_hours_control_workers', {
          p_empresa_id: empresaId,
          p_period_year: year,
          p_period_month: month,
          p_contratante: null,
          p_cliente_nombre: null
        });
        (data || []).forEach((w: any) => activeWorkersMap.set(w.id, w));
      } catch (err) {
        console.error('Error fetching RPC for month:', year, month, err);
      }
    })
  );

  const activeWorkers = Array.from(activeWorkersMap.values());
  const pedidosList = (pedidosRes.data || []) as any[];
  const pedidosMapById = new Map<string, any>();
  const pedidosMapByCodigo = new Map<string, any>();
  const pedidosMapByNum = new Map<string, any>();

  function extractNumericPart(str: string | null | undefined): string {
    if (!str) return '';
    const m = String(str).match(/(\d+)/g);
    if (!m || m.length === 0) return '';
    return m[m.length - 1].replace(/^0+/, '') || '0';
  }

  pedidosList.forEach(p => {
    if (p.id) pedidosMapById.set(p.id, p);
    if (p.codigo) {
      const raw = String(p.codigo).toLowerCase().trim();
      pedidosMapByCodigo.set(raw, p);
      const num = extractNumericPart(raw);
      if (num) pedidosMapByNum.set(num, p);
    }
  });

  const estimacionesList = ((estimacionesRes as any)?.data || []) as any[];
  const estimacionesMapById = new Map<string, any>();
  const estimacionesMapByCodigo = new Map<string, any>();
  const estimacionesMapByNum = new Map<string, any>();

  estimacionesList.forEach(e => {
    if (e.id) estimacionesMapById.set(e.id, e);
    if (e.codigo) {
      const raw = String(e.codigo).toLowerCase().trim();
      estimacionesMapByCodigo.set(raw, e);
      const num = extractNumericPart(raw);
      if (num) estimacionesMapByNum.set(num, e);
    }
  });

  function findPedido(codeOrId: string | null | undefined): any | null {
    if (!codeOrId) return null;
    const str = String(codeOrId).trim();
    if (pedidosMapById.has(str)) return pedidosMapById.get(str);
    const lower = str.toLowerCase();
    if (pedidosMapByCodigo.has(lower)) return pedidosMapByCodigo.get(lower);
    const num = extractNumericPart(str);
    if (num && pedidosMapByNum.has(num)) return pedidosMapByNum.get(num);
    return null;
  }

  function findEstimacion(codeOrId: string | null | undefined): any | null {
    if (!codeOrId) return null;
    const str = String(codeOrId).trim();
    if (estimacionesMapById.has(str)) return estimacionesMapById.get(str);
    const lower = str.toLowerCase();
    if (estimacionesMapByCodigo.has(lower)) return estimacionesMapByCodigo.get(lower);
    const num = extractNumericPart(str);
    if (num && estimacionesMapByNum.has(num)) return estimacionesMapByNum.get(num);
    return null;
  }

  function resolveSeller(
    matchedPedido: any,
    rawEntity: any,
    fallbackContractor?: string | null
  ): string {
    const matchedEstimacion = matchedPedido?.source_estimacion_id
      ? estimacionesMapById.get(matchedPedido.source_estimacion_id)
      : (matchedPedido?.codigo ? findEstimacion(matchedPedido.codigo) : (findEstimacion(rawEntity?.pedido_id) || findEstimacion(rawEntity?.codpedido)));

    // Usuário: "O comercial nós podemos pegar através do usuário que criou o pedido. Aí você vai ter todos os Alex, todos os Omar, pegando pelo usuário que criou o pedido daquela contratação."
    const sellerId = matchedPedido?.created_by 
      || matchedPedido?.commercial_owner_id 
      || matchedPedido?.responsible_id
      || matchedEstimacion?.created_by
      || matchedEstimacion?.commercial_owner_id
      || rawEntity?.created_by
      || rawEntity?.sp_created_by;

    if (sellerId) {
      const strId = String(sellerId).trim();
      if (sellerMap.has(strId)) return sellerMap.get(strId)!;
      if (sellerMap.has(strId.toLowerCase())) return sellerMap.get(strId.toLowerCase())!;
      if (userMap.has(strId)) return userMap.get(strId)!;
    }

    if (fallbackContractor) {
      return formatStandardContratador(fallbackContractor, userMap);
    }

    return 'Comercial Geral';
  }

  const clientsMap = new Map(((allClientsRes as any).data || []).map((c: any) => [c.id, c]));
  const sitesMap = new Map(((sitesRes as any).data || []).map((s: any) => [s.id, s]));
  const empresasMap = new Map(((empresasRes as any).data || []).map((e: any) => [e.id, e]));

  const targetEmpresaNome = filters.empresa_id ? (empresasMap.get(filters.empresa_id)?.nome || '') : 'Grupo';

  const mappedRealAssignments = assignmentsData.map(a => {
    const validWorkerDataBaixa = (a.worker?.data_baixa && (!a.start_date || a.worker.data_baixa.split('T')[0] >= a.start_date.split('T')[0]))
      ? a.worker.data_baixa
      : null;

    const matchedPedido = findPedido(a.pedido_id) || (a.pedido?.codigo ? findPedido(a.pedido.codigo) : null);
    const matchedClient = clientsMap.get(a.client_id) || (matchedPedido?.client_id ? clientsMap.get(matchedPedido.client_id) : null);
    const matchedSite = sitesMap.get(a.client_site_id) || (matchedPedido?.client_site_id ? sitesMap.get(matchedPedido.client_site_id) : null);
    const countryInfo = resolveCountry(matchedClient, matchedSite);
    const vendedor = resolveSeller(matchedPedido, a, a.worker?.contractor);

    return {
      ...a,
      pedido: matchedPedido || a.pedido || null,
      client: matchedClient,
      client_site: matchedSite,
      empresa: empresasMap.get(a.empresa_id) || null,
      status_seguridad: a.worker?.status_seguridad || a.status_seguridad,
      status_trabajador: a.worker?.status_trabajador || a.status_trabajador,
      end_date: a.end_date || validWorkerDataBaixa || null,
      contratante: formatStandardContratante(a.worker?.contratante || a.empresa?.nome || targetEmpresaNome),
      contratador: formatStandardContratador(a.created_by || a.contractor || a.worker?.contractor || a.sp_created_by, userMap),
      vendedor,
      country: countryInfo.name,
      country_code: countryInfo.code,
      country_flag: countryInfo.flag,
    };
  });

  const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id));
  const allClients = (allClientsRes.data || []) as any[];

  // Fetch latest colaborador_por_pedido allocations for virtual assignments to get exact fechainiciopedido/reemplazo start dates and exit dates
  const activeWorkerCodes = activeWorkers.map((w: any) => w.cod_colab).filter(Boolean);
  let cppMap = new Map<string, any>();

  if (activeWorkerCodes.length > 0) {
    const { data: cppList } = await supabase
      .from('colaborador_por_pedido')
      .select('cod_colab, fechainiciopedido, fechafinpedido, fechasalidatrabajador, cliente_nombre, codpedido, inserted_at, contratante, funcion, sp_created_by')
      .in('cod_colab', activeWorkerCodes);

    (cppList || []).forEach((cpp: any) => {
      const existing = cppMap.get(cpp.cod_colab);
      if (!existing || (cpp.fechainiciopedido && (!existing.fechainiciopedido || cpp.fechainiciopedido > existing.fechainiciopedido))) {
        cppMap.set(cpp.cod_colab, cpp);
      }
    });
  }

  const virtualAssignments = activeWorkers
    .filter((w: any) => !existingWorkerIds.has(w.id))
    .map((w: any) => {
      const cpp = cppMap.get(w.cod_colab);

      const matchedPedido = cpp?.codpedido ? findPedido(cpp.codpedido) : null;
      const matchedClient = allClients.find((c: any) => {
        const tradeNorm = normalizeString(c.trade_name);
        const legalNorm = normalizeString(c.legal_name);
        const workerClientNorm = normalizeString(w.cliente_nombre || cpp?.cliente_nombre);
        return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
      }) || (matchedPedido?.client_id ? clientsMap.get(matchedPedido.client_id) : null);

      const countryInfo = resolveCountry(matchedClient, null);
      const vendedor = resolveSeller(matchedPedido, cpp, w.contractor);

      const rawWorkerStatus = (w.status_trabajador || '').toLowerCase();
      const isInactive = rawWorkerStatus.includes('baja') || rawWorkerStatus.includes('inativo') || rawWorkerStatus.includes('desligado') || !!w.data_baixa || !!cpp?.fechasalidatrabajador;

      // Use allocation start date (fechainiciopedido or inserted_at) instead of worker profile creation date
      const allocationStartDate = cpp?.fechainiciopedido 
        || (cpp?.inserted_at ? cpp.inserted_at.split('T')[0] : null)
        || (w.created_at ? w.created_at.split('T')[0] : null);

      const validWorkerDataBaixa = (w.data_baixa && (!allocationStartDate || w.data_baixa.split('T')[0] >= allocationStartDate))
        ? w.data_baixa
        : null;

      const endDate = validWorkerDataBaixa || cpp?.fechasalidatrabajador || cpp?.fechafinpedido || null;

      const stdContratante = formatStandardContratante(w.contratante || cpp?.contratante || targetEmpresaNome);
      const stdContratador = workerRecruiterMap.get(w.id) || formatStandardContratador(w.contractor || cpp?.sp_created_by, userMap);

      return {
        id: `virtual-${w.id}`,
        empresa_id: w.empresa_id || filters.empresa_id,
        worker_id: w.id,
        job_function_name_snapshot: w.funcion || cpp?.funcion,
        client_id: matchedClient?.id || null,
        client_site_id: null,
        pedido_id: matchedPedido?.id || null,
        pedido_item_id: null,
        status: isInactive ? 'completed' : 'active',
        start_date: allocationStartDate,
        end_date: endDate,
        status_seguridad: w.status_seguridad,
        status_trabajador: w.status_trabajador,
        contratante: stdContratante,
        contratador: stdContratador,
        vendedor,
        country: countryInfo.name,
        country_code: countryInfo.code,
        country_flag: countryInfo.flag,
        worker: {
          id: w.id,
          nome: w.nome,
          cod_colab: w.cod_colab,
          nif: w.nif,
          dni: w.dni,
          email: w.email,
          movil: w.movil,
          funcion: w.funcion || cpp?.funcion,
          contratante: stdContratante,
          contractor: stdContratador,
          status_seguridad: w.status_seguridad,
          status_trabajador: w.status_trabajador,
          data_baixa: w.data_baixa
        },
        client: matchedClient ? {
          id: matchedClient.id,
          trade_name: matchedClient.trade_name,
          legal_name: matchedClient.legal_name
        } : (w.cliente_nombre || cpp?.cliente_nombre ? { id: null, trade_name: w.cliente_nombre || cpp?.cliente_nombre, legal_name: w.cliente_nombre || cpp?.cliente_nombre } : null),
        client_site: null,
        pedido: matchedPedido || (cpp?.codpedido ? { id: null, codigo: cpp.codpedido } : null),
        empresa: {
          id: w.empresa_id || filters.empresa_id,
          nome: stdContratante
        },
        replaced_assignment: null
      };
    });

  const combined = [...mappedRealAssignments, ...virtualAssignments];

  return {
    assignmentsData,
    activeWorkers,
    combined,
    targetEmpresaNome,
  };
}

function processAssignments(assignments: any[], filters: HiringReportFilters, empresaNome: string) {
  const today = new Date();
  const todayYMD = today.toISOString().split('T')[0];
  today.setHours(0, 0, 0, 0);

  // Map raw data into standardized HiringReportItem
  const allItems: HiringReportItem[] = assignments.map((a: any) => {
    const workerName = a.worker?.nome || a.worker?.name || 'Trabalhador sem nome';
    const workerDoc = a.worker?.nif || a.worker?.dni || a.worker?.cod_colab || '-';
    const rawContratante = a.contratante || a.worker?.contratante || a.empresa?.nome || empresaNome;
    const contratante = formatStandardContratante(rawContratante);
    
    // Contratador / Recrutador responsável (Wolmer / Contratação)
    const rawContratador = a.contratador || a.created_by || a.contractor || a.worker?.contractor || a.sp_created_by;
    const contratador = formatStandardContratador(rawContratador);

    const clientName = a.client?.trade_name || a.client?.legal_name || a.worker?.cliente_nombre || (a.client_id ? 'Cliente' : 'Não especificado');
    const siteName = a.client_site?.name || '-';
    const pedidoCodigo = a.pedido?.codigo || 'S/N';
    const jobFuncName = a.job_function_name_snapshot || a.worker?.funcion || 'Geral';

    const startDateStr = a.start_date ? a.start_date.split('T')[0] 
      : a.planned_start_date ? a.planned_start_date.split('T')[0] 
      : (a.created_at ? a.created_at.split('T')[0] : null);

    const isInactiveStatus = ['completed', 'cancelled', 'replaced', 'relocated'].includes(a.status);
    
    // Only accept worker.data_baixa if it is on or after startDateStr (avoids past historical bajas from prior contracts)
    const validWorkerDataBaixa = (a.worker?.data_baixa && (!startDateStr || a.worker.data_baixa.split('T')[0] >= startDateStr))
      ? a.worker.data_baixa.split('T')[0]
      : null;

    // Accurately capture end date from assignment end_date or valid worker data_baixa
    const endDateStr = a.end_date ? a.end_date.split('T')[0]
      : (validWorkerDataBaixa || (isInactiveStatus && a.planned_end_date ? a.planned_end_date.split('T')[0] : null));

    const rawWorkerStatus = (a.worker?.status_trabajador || a.status_trabajador || a.status || '').toLowerCase();
    
    // Check if worker is pending entry (future start date and not cancelled/replaced)
    const isPendingEntry = !isInactiveStatus && (
      a.status === 'planned' || 
      rawWorkerStatus.includes('pendiente') || 
      rawWorkerStatus.includes('pendente') || 
      (!!startDateStr && startDateStr > todayYMD)
    );

    // Check if worker was cancelled / withdrew BEFORE starting to work
    const isCancelled = a.status === 'cancelled' || rawWorkerStatus.includes('desist');
    const isWithdrawnPreStart = isCancelled && (
      !startDateStr || 
      startDateStr > todayYMD || 
      !endDateStr || 
      endDateStr === startDateStr || 
      (a.notes || '').toLowerCase().includes('cancelado em')
    );

    // Check if turnover in operation (started work and then replaced, completed, or left)
    const isTurnoverInOperation = !isPendingEntry && !isWithdrawnPreStart && (
      a.status === 'replaced' ||
      a.status === 'completed' ||
      isInactiveStatus ||
      rawWorkerStatus.includes('baja') || 
      rawWorkerStatus.includes('inativo') || 
      rawWorkerStatus.includes('desligado') || 
      (!!endDateStr && endDateStr <= todayYMD)
    );

    const isActive = !isPendingEntry && !isWithdrawnPreStart && !isTurnoverInOperation;

    let display_status: WorkerDisplayStatus = 'active';
    let status_label = 'Ativo';

    if (isPendingEntry) {
      display_status = 'pending_entry';
      status_label = 'Pendente Ingresso';
    } else if (isWithdrawnPreStart) {
      display_status = 'withdrawn';
      status_label = 'Desistência (Não Iniciou)';
    } else if (isTurnoverInOperation) {
      display_status = 'inactive';
      if (a.status === 'replaced') {
        status_label = 'Substituído';
      } else if (a.status === 'completed') {
        status_label = 'Concluído';
      } else {
        status_label = 'Desligado';
      }
    } else {
      display_status = 'active';
      status_label = 'Ativo';
    }

    // Social Security Status Mapping (Alta vs Regularização)
    const rawSeg = a.status_seguridad || a.worker?.status_seguridad || '';
    const normSeg = normalizeString(rawSeg);
    const isPendenteAlta = normSeg.includes('alta') && normSeg.includes('pendent');
    const isSeguridadAlta = (normSeg.includes('alta') && !normSeg.includes('baixa')) || normSeg === 'alta';
    const statusSeguridadDisplay = isPendenteAlta ? 'Pendente Alta' : isSeguridadAlta ? 'Alta' : 'Em Regularização';

    // Calculate days worked (only for active or turnover in operation)
    let daysWorked = 0;
    if (isActive) {
      const startDateObj = parseLocalDate(startDateStr);
      if (startDateObj) {
        startDateObj.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - startDateObj.getTime();
        daysWorked = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    } else if (isTurnoverInOperation) {
      const startDateObj = parseLocalDate(startDateStr);
      const endDateObj = parseLocalDate(endDateStr);
      if (startDateObj && endDateObj) {
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(0, 0, 0, 0);
        const diffTime = endDateObj.getTime() - startDateObj.getTime();
        daysWorked = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    const country = a.country || 'Espanha';
    const country_code = a.country_code || 'ES';
    const country_flag = a.country_flag || '🇪🇸';
    const vendedor = a.vendedor || 'Comercial Geral';

    return {
      id: a.id,
      worker_id: a.worker_id,
      worker_name: workerName,
      worker_document: workerDoc,
      contratante,
      contratador,
      vendedor,
      client_id: a.client_id,
      client_name: clientName,
      client_site_name: siteName,
      country,
      country_code,
      country_flag,
      pedido_id: a.pedido_id,
      pedido_codigo: pedidoCodigo,
      job_function_name: jobFuncName,
      tarifa_acordada: a.tarifa_acordada ? Number(a.tarifa_acordada) : null,
      start_date: startDateStr,
      end_date: endDateStr,
      planned_start_date: a.planned_start_date || null,
      days_worked: daysWorked,
      status: a.status || 'planned',
      display_status,
      status_label,
      is_active: isActive,
      assignment_type: a.assignment_type || null,
      notes: a.notes || null,
      created_at: a.created_at,
      status_seguridad: statusSeguridadDisplay,
      is_seguridad_alta: isSeguridadAlta,
    };
  });

  // 1. Filter by Hiring Date Range: Include workers whose WORK START DATE is within [startDate, endDate]
  let dateFilteredItems = allItems;

  if (filters.startDate || filters.endDate) {
    dateFilteredItems = dateFilteredItems.filter(item => {
      const start = item.start_date;

      if (!start) return true;

      if (filters.startDate && filters.endDate) {
        return start >= filters.startDate && start <= filters.endDate;
      }
      if (filters.startDate) {
        return start >= filters.startDate;
      }
      if (filters.endDate) {
        return start <= filters.endDate;
      }

      return true;
    });
  }

  // 2. Extract unique filter dropdown values strictly from the selected period (dateFilteredItems)
  // so that Pedidos, Clientes, Contratadores reflect the orders being served in the period.
  const uniqueClientsMap = new Map<string, string>();
  const uniqueContratantesSet = new Set<string>();
  const uniqueContratadoresSet = new Set<string>();
  const uniquePedidosMap = new Map<string, string>();
  const uniqueFunctionsSet = new Set<string>();

  dateFilteredItems.forEach(item => {
    if (item.client_id) uniqueClientsMap.set(item.client_id, item.client_name);
    if (item.contratante) uniqueContratantesSet.add(item.contratante);
    if (item.contratador) uniqueContratadoresSet.add(item.contratador);
    if (item.pedido_id) {
      uniquePedidosMap.set(item.pedido_id, item.pedido_codigo);
    } else if (item.pedido_codigo && item.pedido_codigo !== 'S/N') {
      uniquePedidosMap.set(item.pedido_codigo, item.pedido_codigo);
    }
    if (item.job_function_name) uniqueFunctionsSet.add(item.job_function_name);
  });

  // Preserve any currently active filter in dropdowns so it doesn't vanish if already selected
  if (filters.pedidoFilter && filters.pedidoFilter !== 'all' && !uniquePedidosMap.has(filters.pedidoFilter)) {
    const existing = allItems.find(i => i.pedido_id === filters.pedidoFilter || i.pedido_codigo === filters.pedidoFilter);
    if (existing) {
      uniquePedidosMap.set(existing.pedido_id || existing.pedido_codigo, existing.pedido_codigo);
    }
  }
  if (filters.clientFilter && filters.clientFilter !== 'all' && !uniqueClientsMap.has(filters.clientFilter)) {
    const existing = allItems.find(i => i.client_id === filters.clientFilter);
    if (existing) {
      uniqueClientsMap.set(existing.client_id, existing.client_name);
    }
  }

  const uniqueClients = Array.from(uniqueClientsMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueContratantes = Array.from(uniqueContratantesSet).sort();
  const uniqueContratadores = Array.from(uniqueContratadoresSet).sort();

  const uniquePedidos = Array.from(uniquePedidosMap.entries())
    .map(([id, code]) => ({ id, code }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const uniqueFunctions = Array.from(uniqueFunctionsSet).sort();

  // 3. Apply secondary dropdown filters on top of dateFilteredItems
  let filtered = dateFilteredItems;

  if (filters.clientFilter && filters.clientFilter !== 'all') {
    filtered = filtered.filter(item => item.client_id === filters.clientFilter);
  }

  if (filters.contratanteFilter && filters.contratanteFilter !== 'all') {
    const targetContr = normalizeString(filters.contratanteFilter);
    filtered = filtered.filter(item => {
      const itemContr = normalizeString(item.contratante);
      return itemContr.includes(targetContr) || targetContr.includes(itemContr);
    });
  }

  if (filters.contratadorFilter && filters.contratadorFilter !== 'all') {
    filtered = filtered.filter(item => item.contratador === filters.contratadorFilter);
  }

  if (filters.pedidoFilter && filters.pedidoFilter !== 'all') {
    filtered = filtered.filter(item => item.pedido_id === filters.pedidoFilter || item.pedido_codigo === filters.pedidoFilter);
  }

  if (filters.jobFunctionFilter && filters.jobFunctionFilter !== 'all') {
    filtered = filtered.filter(item => item.job_function_name === filters.jobFunctionFilter);
  }

  if (filters.statusFilter && filters.statusFilter !== 'all') {
    if (filters.statusFilter === 'active') {
      filtered = filtered.filter(item => item.display_status === 'active');
    } else if (filters.statusFilter === 'pending_entry') {
      filtered = filtered.filter(item => item.display_status === 'pending_entry');
    } else if (filters.statusFilter === 'withdrawn') {
      filtered = filtered.filter(item => item.display_status === 'withdrawn');
    } else if (filters.statusFilter === 'inactive') {
      filtered = filtered.filter(item => item.display_status === 'inactive');
    }
  }

  if (filters.seguridadFilter && filters.seguridadFilter !== 'all') {
    if (filters.seguridadFilter === 'alta') {
      filtered = filtered.filter(item => {
        if (!filters.statusFilter || filters.statusFilter === 'all') {
          return item.is_seguridad_alta && (item.display_status === 'active' || item.display_status === 'pending_entry');
        }
        return item.is_seguridad_alta;
      });
    } else if (filters.seguridadFilter === 'regularizacao') {
      filtered = filtered.filter(item => {
        if (!filters.statusFilter || filters.statusFilter === 'all') {
          return !item.is_seguridad_alta && (item.display_status === 'active' || item.display_status === 'pending_entry');
        }
        return !item.is_seguridad_alta;
      });
    }
  }

  // Aggregate Metrics for filtered set
  const totalHired = filtered.length;
  const totalActive = filtered.filter(i => i.display_status === 'active').length;
  const totalPendingEntry = filtered.filter(i => i.display_status === 'pending_entry').length;
  const totalWithdrawn = filtered.filter(i => i.display_status === 'withdrawn').length;
  const totalInactive = filtered.filter(i => i.display_status === 'inactive').length;
  
  // Real retention rate: calculated strictly on those who actually started in operation
  const totalStarted = totalActive + totalInactive;
  const retentionRate = totalStarted > 0 
    ? Math.round((totalActive / totalStarted) * 1000) / 10 
    : (totalHired > 0 ? 100 : 0);
  const turnoverRate = totalStarted > 0 
    ? Math.round((totalInactive / totalStarted) * 1000) / 10 
    : 0;

  // Social Security Metrics
  // Base: calculate strictly on active workforce (active + pending_entry) when viewing all,
  // excluding pre-start withdrawals and inactive/discharged workers,
  // unless user explicitly selected inactive or withdrawn in statusFilter.
  const seguridadeBaseItems = (filters.statusFilter === 'withdrawn' || filters.statusFilter === 'inactive')
    ? filtered
    : filtered.filter(i => i.display_status === 'active' || i.display_status === 'pending_entry');

  const totalSeguridadeBase = seguridadeBaseItems.length;
  const totalAlta = seguridadeBaseItems.filter(i => i.is_seguridad_alta).length;
  const totalRegularizacao = totalSeguridadeBase - totalAlta;
  const pctAlta = totalSeguridadeBase > 0 ? Math.round((totalAlta / totalSeguridadeBase) * 1000) / 10 : 0;
  const pctRegularizacao = totalSeguridadeBase > 0 ? Math.round((totalRegularizacao / totalSeguridadeBase) * 1000) / 10 : 0;

  // Average days worked only for those who actually entered operation
  const operationalItems = filtered.filter(i => i.display_status === 'active' || i.display_status === 'inactive');
  const sumDaysWorked = operationalItems.reduce((acc, curr) => acc + curr.days_worked, 0);
  const avgDaysWorked = operationalItems.length > 0 ? Math.round(sumDaysWorked / operationalItems.length) : 0;

  // 1. Breakdown by Job Function (Rich Analytics)
  const funcMap = new Map<string, { total: number; active: number; inactive: number; withdrawn: number }>();
  filtered.forEach(item => {
    const fn = item.job_function_name || 'Geral / Operacional';
    const current = funcMap.get(fn) || { total: 0, active: 0, inactive: 0, withdrawn: 0 };
    current.total += 1;
    if (item.display_status === 'active') current.active += 1;
    else if (item.display_status === 'withdrawn') current.withdrawn += 1;
    else current.inactive += 1;
    funcMap.set(fn, current);
  });

  const totalFilteredCount = filtered.length;
  const functionBreakdown: FunctionBreakdown[] = Array.from(funcMap.entries())
    .map(([functionName, stat]) => ({
      functionName,
      total: stat.total,
      active: stat.active,
      inactive: stat.inactive,
      withdrawn: stat.withdrawn,
      retentionRate: stat.total > 0 ? Math.round((stat.active / stat.total) * 1000) / 10 : 0,
      pctOfTotal: totalFilteredCount > 0 ? Math.round((stat.total / totalFilteredCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 2. Breakdown by Country (ES, FR, IT, etc.)
  const countryMap = new Map<string, { countryCode: string; countryName: string; flag: string; total: number; active: number; withdrawn: number; inactive: number }>();
  // Pre-seed known countries so they always appear cleanly in the dashboard
  countryMap.set('ES', { countryCode: 'ES', countryName: 'Espanha', flag: '🇪🇸', total: 0, active: 0, withdrawn: 0, inactive: 0 });
  countryMap.set('FR', { countryCode: 'FR', countryName: 'França', flag: '🇫🇷', total: 0, active: 0, withdrawn: 0, inactive: 0 });
  countryMap.set('IT', { countryCode: 'IT', countryName: 'Itália', flag: '🇮🇹', total: 0, active: 0, withdrawn: 0, inactive: 0 });

  filtered.forEach(item => {
    const code = item.country_code || 'ES';
    const current = countryMap.get(code) || {
      countryCode: code,
      countryName: item.country || 'Outro',
      flag: item.country_flag || '🌐',
      total: 0,
      active: 0,
      withdrawn: 0,
      inactive: 0,
    };
    current.total += 1;
    if (item.display_status === 'active') current.active += 1;
    else if (item.display_status === 'withdrawn') current.withdrawn += 1;
    else current.inactive += 1;
    countryMap.set(code, current);
  });

  const countryBreakdown: CountryStat[] = Array.from(countryMap.values())
    .map(c => ({
      ...c,
      pct: totalFilteredCount > 0 ? Math.round((c.total / totalFilteredCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 3. Daily Timeline of Hirings (Peaks across the month/period 1 to 31)
  const dailyMap = new Map<string, { day: number; dateStr: string; dayLabel: string; total: number; active: number; withdrawn: number; inactive: number }>();
  
  // Build days in period if range provided, or default 1..31
  let rangeStart = parseLocalDate(filters.startDate);
  let rangeEnd = parseLocalDate(filters.endDate);
  if (!rangeStart || !rangeEnd) {
    const now = new Date();
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Cap timeline days to max 31 points for clean rendering
  const cur = new Date(rangeStart);
  let dayIndex = 1;
  while (cur <= rangeEnd && dayIndex <= 31) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    dailyMap.set(dateStr, {
      day: cur.getDate(),
      dateStr,
      dayLabel: `${d}/${m}`,
      total: 0,
      active: 0,
      withdrawn: 0,
      inactive: 0,
    });
    cur.setDate(cur.getDate() + 1);
    dayIndex++;
  }

  filtered.forEach(item => {
    if (!item.start_date) return;
    const dateKey = item.start_date.split('T')[0];
    const point = dailyMap.get(dateKey);
    if (point) {
      point.total += 1;
      if (item.display_status === 'active') point.active += 1;
      else if (item.display_status === 'withdrawn') point.withdrawn += 1;
      else point.inactive += 1;
    }
  });

  const dailyTimeline: DailyTimelinePoint[] = Array.from(dailyMap.values());

  // 4. Commercial Intelligence: Sellers / Vendedores Breakdown (Comissionamento)
  const sellerMap = new Map<string, {
    sellerName: string;
    totalHired: number;
    active: number;
    replaced: number;
    withdrawn: number;
    pedidosSet: Set<string>;
    clientsSet: Set<string>;
  }>();

  filtered.forEach(item => {
    const seller = item.vendedor || 'Comercial Geral';
    const cur = sellerMap.get(seller) || {
      sellerName: seller,
      totalHired: 0,
      active: 0,
      replaced: 0,
      withdrawn: 0,
      pedidosSet: new Set<string>(),
      clientsSet: new Set<string>(),
    };
    cur.totalHired += 1;
    if (item.display_status === 'active') cur.active += 1;
    if (item.replacement_of_worker_name || item.status === 'replaced') cur.replaced += 1;
    if (item.display_status === 'withdrawn') cur.withdrawn += 1;
    if (item.pedido_codigo && item.pedido_codigo !== 'Sem Pedido') cur.pedidosSet.add(item.pedido_codigo);
    if (item.client_name && item.client_name !== 'Sem Cliente') cur.clientsSet.add(item.client_name);
    sellerMap.set(seller, cur);
  });

  const sellerBreakdown: SellerStat[] = Array.from(sellerMap.values())
    .map(s => ({
      sellerName: s.sellerName,
      totalHired: s.totalHired,
      active: s.active,
      replaced: s.replaced,
      withdrawn: s.withdrawn,
      pedidosCount: s.pedidosSet.size,
      pedidosCodes: Array.from(s.pedidosSet),
      clientsCount: s.clientsSet.size,
      retentionRate: s.totalHired > 0 ? Math.round((s.active / s.totalHired) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalHired - a.totalHired);

  // 5. Commercial Intelligence: Client Breakdown
  const clientMap = new Map<string, {
    clientId: string;
    clientName: string;
    country: string;
    flag: string;
    totalHired: number;
    active: number;
    replaced: number;
    withdrawn: number;
    pedidosSet: Set<string>;
  }>();

  filtered.forEach(item => {
    const cName = item.client_name || 'Sem Cliente';
    const cKey = item.client_id || cName;
    const cur = clientMap.get(cKey) || {
      clientId: item.client_id || cName,
      clientName: cName,
      country: item.country,
      flag: item.country_flag,
      totalHired: 0,
      active: 0,
      replaced: 0,
      withdrawn: 0,
      pedidosSet: new Set<string>(),
    };
    cur.totalHired += 1;
    if (item.display_status === 'active') cur.active += 1;
    if (item.replacement_of_worker_name || item.status === 'replaced') cur.replaced += 1;
    if (item.display_status === 'withdrawn') cur.withdrawn += 1;
    if (item.pedido_codigo && item.pedido_codigo !== 'Sem Pedido') cur.pedidosSet.add(item.pedido_codigo);
    clientMap.set(cKey, cur);
  });

  const clientBreakdown: ClientStat[] = Array.from(clientMap.values())
    .map(c => ({
      clientId: c.clientId,
      clientName: c.clientName,
      country: c.country,
      flag: c.flag,
      totalHired: c.totalHired,
      active: c.active,
      replaced: c.replaced,
      withdrawn: c.withdrawn,
      pedidosCodes: Array.from(c.pedidosSet),
      retentionRate: c.totalHired > 0 ? Math.round((c.active / c.totalHired) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalHired - a.totalHired);

  // Breakdown by Contratante (Standardized Name Grouping)
  const contrMap = new Map<string, { total: number; active: number; inactive: number }>();
  filtered.forEach(item => {
    const c = formatStandardContratante(item.contratante);
    const current = contrMap.get(c) || { total: 0, active: 0, inactive: 0 };
    current.total += 1;
    if (item.display_status === 'active') current.active += 1;
    else current.inactive += 1;
    contrMap.set(c, current);
  });

  const contratanteBreakdown: ContratanteBreakdown[] = Array.from(contrMap.entries())
    .map(([contratante, stat]) => ({ contratante, ...stat }))
    .sort((a, b) => b.total - a.total);

  return {
    items: filtered,
    totalHired,
    totalActive,
    totalPendingEntry,
    totalWithdrawn,
    totalInactive,
    totalStarted,
    retentionRate,
    turnoverRate,
    totalAlta,
    totalRegularizacao,
    pctAlta,
    pctRegularizacao,
    totalSeguridadeBase,
    avgDaysWorked,
    functionBreakdown,
    contratanteBreakdown,
    countryBreakdown,
    dailyTimeline,
    sellerBreakdown,
    clientBreakdown,
    uniqueClients,
    uniqueContratantes,
    uniqueContratadores,
    uniquePedidos,
    uniqueFunctions,
  };
}
