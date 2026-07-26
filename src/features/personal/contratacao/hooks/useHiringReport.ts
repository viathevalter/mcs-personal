import { useMemo } from 'react';
import { useWorkerAssignments } from '@/features/operacoes/solicitudes/hooks/useWorkerAssignments';

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

export function useHiringReport(filters: HiringReportFilters) {
  // Leverage the core useWorkerAssignments hook which reliably fetches real & virtual worker allocations
  const assignmentsQuery = useWorkerAssignments({
    empresa_id: filters.empresa_id,
  });

  const processedData = useMemo(() => {
    const rawAssignments = assignmentsQuery.data || [];
    return processAssignments(rawAssignments, filters);
  }, [assignmentsQuery.data, filters]);

  return {
    ...assignmentsQuery,
    data: processedData,
  };
}

function processAssignments(assignments: any[], filters: HiringReportFilters) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map raw data into standardized HiringReportItem
  const allItems: HiringReportItem[] = assignments.map((a: any) => {
    const workerName = a.worker?.nome || a.worker?.name || 'Trabalhador sem nome';
    const workerDoc = a.worker?.nif || a.worker?.dni || a.worker?.cod_colab || '-';
    const contratante = a.worker?.contratante || a.empresa?.nome || 'Não informada';
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

    const isActive = ['active', 'planned', 'paused'].includes(a.status);

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

  // Filter by Date Range (if specified)
  let filtered = allItems;

  if (filters.startDate || filters.endDate) {
    filtered = filtered.filter(item => {
      // If no start date specified or worker is active, keep it
      if (item.is_active) return true;
      if (!item.start_date) return true;

      const itemStart = item.start_date;
      const itemEnd = item.end_date;

      if (filters.startDate && filters.endDate) {
        if (itemStart >= filters.startDate && itemStart <= filters.endDate) return true;
        if (itemEnd && itemEnd >= filters.startDate && itemEnd <= filters.endDate) return true;
      } else if (filters.startDate && itemStart >= filters.startDate) {
        return true;
      } else if (filters.endDate && itemStart <= filters.endDate) {
        return true;
      }

      return false;
    });
  }

  // Dropdown Filters
  if (filters.clientFilter && filters.clientFilter !== 'all') {
    filtered = filtered.filter(item => item.client_id === filters.clientFilter);
  }

  if (filters.contratanteFilter && filters.contratanteFilter !== 'all') {
    filtered = filtered.filter(item => item.contratante === filters.contratanteFilter);
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

  // Aggregate Metrics
  const totalHired = filtered.length;
  const totalActive = filtered.filter(i => i.is_active).length;
  const totalInactive = filtered.filter(i => !i.is_active).length;
  const retentionRate = totalHired > 0 ? (totalActive / totalHired) * 100 : 0;
  
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
