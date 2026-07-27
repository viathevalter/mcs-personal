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
        return {
          items: [],
          totalHired: 0,
          totalActive: 0,
          totalInactive: 0,
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

      // 1. Fetch details of the selected company
      const { data: targetEmpresa } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('id, nome, trade_name, legal_name, codigo')
        .eq('id', filters.empresa_id)
        .maybeSingle();

      const empName = (targetEmpresa?.trade_name || targetEmpresa?.legal_name || targetEmpresa?.nome || '').toLowerCase();

      // Individual operating subsidiaries vs Holding / Group (Login Pro, GRP Login Pro, Mastercorp, etc.)
      const isIndividualCompany = ['stocco', 'triangulo', 'luminous', 'wiseowe', 'rosas'].some(c => empName.includes(c));
      const companyIdFilter = isIndividualCompany ? filters.empresa_id : null;

      // 2. Query worker_assignments
      let assignmentsQuery = supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select(`
          *,
          worker:workers(id, nome, nif, dni, email, movil, funcion, cod_colab, contratante),
          replaced_assignment:worker_assignments!replacement_of_assignment_id(
            id,
            worker:workers(id, nome)
          )
        `);

      if (companyIdFilter) {
        assignmentsQuery = assignmentsQuery.eq('empresa_id', companyIdFilter);
      }

      const { data: assignments, error: assignError } = await assignmentsQuery.order('start_date', { ascending: false });
      if (assignError) console.error('Error fetching worker_assignments:', assignError);

      const assignmentsData = assignments || [];

      // 3. Batch Lookups
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
        supabase.schema('core_personal').rpc('get_hours_control_workers', {
          p_empresa_id: companyIdFilter, // null for Login Pro (holding), company UUID for subsidiaries
          p_period_year: periodYear,
          p_period_month: periodMonth,
          p_contratante: null,
          p_cliente_nombre: null
        }).catch((err) => {
          console.error('Error in get_hours_control_workers:', err);
          return { data: [] };
        })
      ]);

      const pedidosMap = new Map((pedidosRes.data || []).map(p => [p.id, p]));
      const clientsMap = new Map((allClientsRes.data || []).map(c => [c.id, c]));
      const sitesMap = new Map((sitesRes.data || []).map(s => [s.id, s]));
      const empresasMap = new Map((empresasRes.data || []).map(e => [e.id, e]));

      const targetEmpresaNome = empresasMap.get(filters.empresa_id)?.nome || targetEmpresa?.nome || '';

      const mappedRealAssignments = assignmentsData.map(a => ({
        ...a,
        pedido: pedidosMap.get(a.pedido_id) || null,
        client: clientsMap.get(a.client_id) || null,
        client_site: sitesMap.get(a.client_site_id) || null,
        empresa: empresasMap.get(a.empresa_id) || null,
      }));

      const existingWorkerIds = new Set(mappedRealAssignments.map(a => a.worker_id));
      const allClients = allClientsRes.data || [];
      const activeWorkers = activeWorkersRes.data || [];

      const virtualAssignments = activeWorkers
        .filter((w: any) => !existingWorkerIds.has(w.id))
        .map((w: any) => {
          const matchedClient = allClients.find((c: any) => {
            const tradeNorm = normalizeString(c.trade_name);
            const legalNorm = normalizeString(c.legal_name);
            const workerClientNorm = normalizeString(w.cliente_nombre);
            return (tradeNorm && tradeNorm === workerClientNorm) || (legalNorm && legalNorm === workerClientNorm);
          });

          return {
            id: `virtual-${w.id}`,
            empresa_id: w.empresa_id || filters.empresa_id,
            worker_id: w.id,
            job_function_name_snapshot: w.funcion,
            client_id: matchedClient?.id || null,
            client_site_id: null,
            pedido_id: null,
            pedido_item_id: null,
            status: w.status_trabajador === 'Baja' ? 'completed' : 'active',
            start_date: w.created_at || new Date().toISOString(),
            end_date: w.data_baixa || null,
            worker: {
              id: w.id,
              nome: w.nome,
              cod_colab: w.cod_colab,
              nif: w.nif,
              dni: w.dni,
              email: w.email,
              movil: w.movil,
              funcion: w.funcion,
              contratante: w.contratante || targetEmpresaNome
            },
            client: matchedClient ? {
              id: matchedClient.id,
              trade_name: matchedClient.trade_name,
              legal_name: matchedClient.legal_name
            } : null,
            client_site: null,
            pedido: null,
            empresa: {
              id: w.empresa_id || filters.empresa_id,
              nome: w.contratante || targetEmpresaNome
            },
            replaced_assignment: null
          };
        });

      const combined = [...mappedRealAssignments, ...virtualAssignments];
      return processAssignments(combined, filters, targetEmpresaNome);
    },
    enabled: !!filters.empresa_id,
    staleTime: 1000 * 60 * 5,
  });
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

  // Filter by Date Range (Active allocation during selected period)
  let filtered = allItems;

  if (filters.startDate || filters.endDate) {
    filtered = filtered.filter(item => {
      const itemStart = item.start_date;
      const itemEnd = item.end_date;

      if (filters.startDate && filters.endDate) {
        // Allocation started on or before period end
        const startedOnOrBeforePeriodEnd = !itemStart || itemStart <= filters.endDate;
        // Allocation is active or ended on or after period start
        const activeOrEndedOnOrAfterPeriodStart = item.is_active || !itemEnd || itemEnd >= filters.startDate;

        return startedOnOrBeforePeriodEnd && activeOrEndedOnOrAfterPeriodStart;
      }
      
      if (filters.startDate) {
        return item.is_active || !itemEnd || itemEnd >= filters.startDate;
      }

      if (filters.endDate) {
        return !itemStart || itemStart <= filters.endDate;
      }

      return true;
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

  // Aggregate Metrics for filtered set
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
