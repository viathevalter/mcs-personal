import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface HiringReportFilters {
  empresa_id?: string | null;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  clientFilter?: string;
  contratanteFilter?: string;
  pedidoFilter?: string;
  jobFunctionFilter?: string;
  statusFilter?: string; // 'all' | 'active' | 'inactive'
}

export interface HiringReportItem {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_document: string;
  contratante: string;
  client_id: string;
  client_name: string;
  client_site_name: string;
  pedido_id: string;
  pedido_codigo: string;
  job_function_name: string;
  tarifa_acordada: number | null;
  start_date: string | null;
  end_date: string | null;
  planned_start_date: string | null;
  days_worked: number;
  status: string; // 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | 'replaced' | 'relocated'
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
}

export interface ContratanteBreakdown {
  contratante: string;
  total: number;
  active: number;
  inactive: number;
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
      if (!filters.empresa_id) {
        return emptyReport();
      }

      // 1. Try querying specifically for the selected empresa_id
      let result = await fetchReportDataForEmpresa(filters.empresa_id, filters);

      // 2. Fallback: If selected company returns 0 items (e.g. Holding company Login Pro with no direct assignments),
      // fetch across ALL companies in the group (empresaId = null)
      if (result.assignmentsData.length === 0 && result.activeWorkers.length === 0) {
        result = await fetchReportDataForEmpresa(null, filters);
      }

      return processAssignments(result.combined, filters, result.targetEmpresaNome);
    },
    enabled: !!filters.empresa_id,
  });
}

function emptyReport() {
  return {
    items: [],
    totalHired: 0,
    totalActive: 0,
    totalInactive: 0,
    totalAlta: 0,
    totalRegularizacao: 0,
    pctAlta: 0,
    pctRegularizacao: 0,
    retentionRate: 0,
    avgDaysWorked: 0,
    functionBreakdown: [],
    contratanteBreakdown: [],
    uniqueClients: [],
    uniqueContratantes: [],
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
      worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante, status_seguridad),
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

  const now = new Date();
  const periodYear = filters.startDate ? Number(filters.startDate.split('-')[0]) || now.getFullYear() : now.getFullYear();
  const periodMonth = filters.startDate ? Number(filters.startDate.split('-')[1]) || (now.getMonth() + 1) : (now.getMonth() + 1);

  const [pedidosRes, allClientsRes, sitesRes, empresasRes, activeWorkersRes] = await Promise.all([
    pedidoIds.length > 0 
      ? supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', pedidoIds)
      : Promise.resolve({ data: [] }),
    supabase.schema('core_common').from('clients').select('id, trade_name, legal_name'),
    siteIds.length > 0
      ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
      : Promise.resolve({ data: [] }),
    empresaIds.length > 0
      ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
      : Promise.resolve({ data: [] }),
    Promise.resolve(
      supabase.schema('core_personal').rpc('get_hours_control_workers', {
        p_empresa_id: empresaId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_contratante: null,
        p_cliente_nombre: null
      })
    ).catch((err) => {
      console.error('Error in get_hours_control_workers:', err);
      return { data: [] };
    })
  ]);

  const pedidosMap = new Map((pedidosRes.data || []).map(p => [p.id, p]));
  const clientsMap = new Map((allClientsRes.data || []).map(c => [c.id, c]));
  const sitesMap = new Map((sitesRes.data || []).map(s => [s.id, s]));
  const empresasMap = new Map((empresasRes.data || []).map(e => [e.id, e]));

  const targetEmpresaNome = filters.empresa_id ? (empresasMap.get(filters.empresa_id)?.nome || '') : 'Grupo';

  const mappedRealAssignments = assignmentsData.map(a => ({
    ...a,
    pedido: pedidosMap.get(a.pedido_id) || null,
    client: clientsMap.get(a.client_id) || null,
    client_site: sitesMap.get(a.client_site_id) || null,
    empresa: empresasMap.get(a.empresa_id) || null,
    status_seguridad: a.worker?.status_seguridad || a.status_seguridad
  }));

  const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id));
  const allClients = allClientsRes.data || [];
  const activeWorkers = activeWorkersRes.data || [];

  // Fetch latest colaborador_por_pedido allocations for virtual assignments to get exact fechainiciopedido/reemplazo start dates
  const activeWorkerCodes = activeWorkers.map((w: any) => w.cod_colab).filter(Boolean);
  let cppMap = new Map<string, any>();

  if (activeWorkerCodes.length > 0) {
    const { data: cppList } = await supabase
      .from('colaborador_por_pedido')
      .select('cod_colab, fechainiciopedido, fechafinpedido, fechasalidatrabajador, cliente_nombre, codpedido, inserted_at, contratante, funcion')
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

      const matchedClient = allClients.find((c: any) => {
        const tradeNorm = normalizeString(c.trade_name);
        const legalNorm = normalizeString(c.legal_name);
        const workerClientNorm = normalizeString(w.cliente_nombre || cpp?.cliente_nombre);
        return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
      });

      const rawWorkerStatus = (w.status_trabajador || '').toLowerCase();
      const isInactive = rawWorkerStatus.includes('baja') || rawWorkerStatus.includes('inativo') || rawWorkerStatus.includes('desligado') || !!w.data_baixa || !!cpp?.fechasalidatrabajador;

      // Use allocation start date (fechainiciopedido or inserted_at) instead of worker profile creation date
      const allocationStartDate = cpp?.fechainiciopedido 
        || (cpp?.inserted_at ? cpp.inserted_at.split('T')[0] : null)
        || (w.created_at ? w.created_at.split('T')[0] : null);

      const endDate = w.data_baixa || cpp?.fechasalidatrabajador || cpp?.fechafinpedido || null;

      return {
        id: `virtual-${w.id}`,
        empresa_id: w.empresa_id || filters.empresa_id,
        worker_id: w.id,
        job_function_name_snapshot: w.funcion || cpp?.funcion,
        client_id: matchedClient?.id || null,
        client_site_id: null,
        pedido_id: null,
        pedido_item_id: null,
        status: isInactive ? 'completed' : 'active',
        start_date: allocationStartDate,
        end_date: endDate,
        status_seguridad: w.status_seguridad,
        worker: {
          id: w.id,
          nome: w.nome,
          cod_colab: w.cod_colab,
          nif: w.nif,
          dni: w.dni,
          email: w.email,
          movil: w.movil,
          funcion: w.funcion || cpp?.funcion,
          contratante: w.contratante || cpp?.contratante || targetEmpresaNome,
          status_seguridad: w.status_seguridad
        },
        client: matchedClient ? {
          id: matchedClient.id,
          trade_name: matchedClient.trade_name,
          legal_name: matchedClient.legal_name
        } : (w.cliente_nombre || cpp?.cliente_nombre ? { id: null, trade_name: w.cliente_nombre || cpp?.cliente_nombre, legal_name: w.cliente_nombre || cpp?.cliente_nombre } : null),
        client_site: null,
        pedido: cpp?.codpedido ? { id: null, codigo: cpp.codpedido } : null,
        empresa: {
          id: w.empresa_id || filters.empresa_id,
          nome: w.contratante || cpp?.contratante || targetEmpresaNome
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
  today.setHours(0, 0, 0, 0);

  // Map raw data into standardized HiringReportItem
  const allItems: HiringReportItem[] = assignments.map((a: any) => {
    const workerName = a.worker?.nome || a.worker?.name || 'Trabalhador sem nome';
    const workerDoc = a.worker?.nif || a.worker?.dni || a.worker?.cod_colab || '-';
    const contratante = a.worker?.contratante || a.empresa?.nome || empresaNome || 'Não informada';
    const clientName = a.client?.trade_name || a.client?.legal_name || a.worker?.cliente_nombre || (a.client_id ? 'Cliente' : 'Não especificado');
    const siteName = a.client_site?.name || '-';
    const pedidoCodigo = a.pedido?.codigo || 'S/N';
    const jobFuncName = a.job_function_name_snapshot || a.worker?.funcion || 'Geral';

    const startDateStr = a.start_date ? a.start_date.split('T')[0] 
      : a.planned_start_date ? a.planned_start_date.split('T')[0] 
      : (a.created_at ? a.created_at.split('T')[0] : null);

    const isInactiveStatus = ['completed', 'cancelled', 'replaced', 'relocated'].includes(a.status);
    const endDateStr = a.end_date ? a.end_date.split('T')[0]
      : (isInactiveStatus && a.planned_end_date ? a.planned_end_date.split('T')[0] : null);

    const rawWorkerStatus = (a.worker?.status_trabajador || a.status || '').toLowerCase();
    const isInactive = isInactiveStatus || rawWorkerStatus.includes('baja') || rawWorkerStatus.includes('inativo') || rawWorkerStatus.includes('desligado') || !!endDateStr;
    const isActive = !isInactive;

    // Social Security Status Mapping (Alta vs Regularização)
    const rawSeg = a.status_seguridad || a.worker?.status_seguridad || '';
    const normSeg = normalizeString(rawSeg);
    const isSeguridadAlta = (normSeg.includes('alta') && !normSeg.includes('pendent')) || normSeg === 'alta';
    const statusSeguridadDisplay = isSeguridadAlta ? 'Alta' : 'Em Regularização';

    // Calculate days worked
    let daysWorked = 0;
    const startDateObj = parseLocalDate(startDateStr);
    if (startDateObj) {
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = !isActive && endDateStr ? parseLocalDate(endDateStr) : new Date();
      if (endDateObj) {
        endDateObj.setHours(0, 0, 0, 0);
        const diffTime = endDateObj.getTime() - startDateObj.getTime();
        daysWorked = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      id: a.id,
      worker_id: a.worker_id,
      worker_name: workerName,
      worker_document: workerDoc,
      contratante,
      client_id: a.client_id,
      client_name: clientName,
      client_site_name: siteName,
      pedido_id: a.pedido_id,
      pedido_codigo: pedidoCodigo,
      job_function_name: jobFuncName,
      tarifa_acordada: a.tarifa_acordada ? Number(a.tarifa_acordada) : null,
      start_date: startDateStr,
      end_date: endDateStr,
      planned_start_date: a.planned_start_date || null,
      days_worked: daysWorked,
      status: a.status || 'planned',
      is_active: isActive,
      assignment_type: a.assignment_type || null,
      notes: a.notes || null,
      created_at: a.created_at,
      status_seguridad: statusSeguridadDisplay,
      is_seguridad_alta: isSeguridadAlta,
    };
  });

  // Extract unique filter dropdown values BEFORE date filtering so drop downs don't collapse
  const uniqueClientsMap = new Map<string, string>();
  const uniqueContratantesSet = new Set<string>();
  const uniquePedidosMap = new Map<string, string>();
  const uniqueFunctionsSet = new Set<string>();

  allItems.forEach(item => {
    if (item.client_id) uniqueClientsMap.set(item.client_id, item.client_name);
    if (item.contratante) uniqueContratantesSet.add(item.contratante);
    if (item.pedido_id) uniquePedidosMap.set(item.pedido_id, item.pedido_codigo);
    if (item.job_function_name) uniqueFunctionsSet.add(item.job_function_name);
  });

  const uniqueClients = Array.from(uniqueClientsMap.entries()).map(([id, name]) => ({ id, name }));
  const uniqueContratantes = Array.from(uniqueContratantesSet).sort();
  const uniquePedidos = Array.from(uniquePedidosMap.entries()).map(([id, code]) => ({ id, code }));
  const uniqueFunctions = Array.from(uniqueFunctionsSet).sort();

  // Filter by Date Range: Include workers who STARTED work within [startDate, endDate]
  let filtered = allItems;

  if (filters.startDate || filters.endDate) {
    filtered = filtered.filter(item => {
      const itemStart = item.start_date;

      if (!itemStart) return true;

      if (filters.startDate && filters.endDate) {
        return itemStart >= filters.startDate && itemStart <= filters.endDate;
      }
      if (filters.startDate) {
        return itemStart >= filters.startDate;
      }
      if (filters.endDate) {
        return itemStart <= filters.endDate;
      }

      return true;
    });
  }

  // Dropdown Filters (case-insensitive for contratante)
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

  if (filters.pedidoFilter && filters.pedidoFilter !== 'all') {
    filtered = filtered.filter(item => item.pedido_id === filters.pedidoFilter);
  }

  if (filters.jobFunctionFilter && filters.jobFunctionFilter !== 'all') {
    filtered = filtered.filter(item => item.job_function_name === filters.jobFunctionFilter);
  }

  if (filters.statusFilter && filters.statusFilter !== 'all') {
    if (filters.statusFilter === 'active') {
      filtered = filtered.filter(item => item.is_active);
    } else if (filters.statusFilter === 'inactive') {
      filtered = filtered.filter(item => !item.is_active);
    }
  }

  // Aggregate Metrics for filtered set
  const totalHired = filtered.length;
  const totalActive = filtered.filter(i => i.is_active).length;
  const totalInactive = filtered.filter(i => !i.is_active).length;
  
  // Social Security Metrics
  const totalAlta = filtered.filter(i => i.is_seguridad_alta).length;
  const totalRegularizacao = totalHired - totalAlta;
  const pctAlta = totalHired > 0 ? Math.round((totalAlta / totalHired) * 1000) / 10 : 0;
  const pctRegularizacao = totalHired > 0 ? Math.round((totalRegularizacao / totalHired) * 1000) / 10 : 0;

  const retentionRate = totalHired > 0 ? Math.round((totalActive / totalHired) * 1000) / 10 : 0;
  const sumDaysWorked = filtered.reduce((acc, curr) => acc + curr.days_worked, 0);
  const avgDaysWorked = totalHired > 0 ? Math.round(sumDaysWorked / totalHired) : 0;

  // Breakdown by Job Function
  const funcMap = new Map<string, { total: number; active: number; inactive: number }>();
  filtered.forEach(item => {
    const fn = item.job_function_name;
    const current = funcMap.get(fn) || { total: 0, active: 0, inactive: 0 };
    current.total += 1;
    if (item.is_active) current.active += 1;
    else current.inactive += 1;
    funcMap.set(fn, current);
  });

  const functionBreakdown: FunctionBreakdown[] = Array.from(funcMap.entries())
    .map(([functionName, stat]) => ({ functionName, ...stat }))
    .sort((a, b) => b.total - a.total);

  // Breakdown by Contratante
  const contrMap = new Map<string, { total: number; active: number; inactive: number }>();
  filtered.forEach(item => {
    const c = item.contratante;
    const current = contrMap.get(c) || { total: 0, active: 0, inactive: 0 };
    current.total += 1;
    if (item.is_active) current.active += 1;
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
    totalInactive,
    totalAlta,
    totalRegularizacao,
    pctAlta,
    pctRegularizacao,
    retentionRate,
    avgDaysWorked,
    functionBreakdown,
    contratanteBreakdown,
    uniqueClients,
    uniqueContratantes,
    uniquePedidos,
    uniqueFunctions,
  };
}
