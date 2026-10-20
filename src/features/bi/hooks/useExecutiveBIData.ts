import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { parseEuroNumber, parseDate } from '@/features/financeiro/lib/utils';
import type {
  BIFilters,
  BillingHoursBIMetrics,
  CommercialBIMetrics,
  DrillDownRecord,
  FinancialBIMetrics,
  MonthlyEvolutionPoint,
  OperationalRHBIMetrics,
} from '../types';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function resolveCountryExtended(
  client?: any,
  site?: any,
  rawCountryIdOrName?: string | null
): {
  code: string;
  name: string;
  flag: string;
} {
  const countryId = site?.country_id || client?.country_id || rawCountryIdOrName;
  const taxId = (client?.tax_id || client?.cif || '').toUpperCase().trim();
  const province = (site?.province || client?.province || site?.city || client?.city || '').toLowerCase();
  const name = (client?.trade_name || client?.legal_name || rawCountryIdOrName || '').toLowerCase();

  if (
    countryId === 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd' ||
    taxId.startsWith('FR') ||
    province.includes('france') ||
    province.includes('paris') ||
    province.includes('lyon') ||
    province.includes('occitanie') ||
    name.includes('france') ||
    name.includes('frança')
  ) {
    return { code: 'FR', name: 'França', flag: '🇫🇷' };
  }
  if (
    countryId === '3623ec00-42ae-4673-a842-c20b47da0e5e' ||
    taxId.startsWith('IT') ||
    province.includes('lucca') ||
    province.includes('milano') ||
    province.includes('roma') ||
    name.includes('italia') ||
    name.includes('itália') ||
    name.includes('srl') ||
    name.includes('stil montaggi') ||
    name.includes('giada')
  ) {
    return { code: 'IT', name: 'Itália', flag: '🇮🇹' };
  }
  if (
    province.includes('dubai') ||
    province.includes('abu dhabi') ||
    province.includes('uae') ||
    province.includes('emirados') ||
    name.includes('dubai') ||
    name.includes('emirates') ||
    name.includes('eau')
  ) {
    return { code: 'AE', name: 'Dubai / EAU', flag: '🇦🇪' };
  }
  if (
    taxId.startsWith('PT') ||
    province.includes('lisboa') ||
    province.includes('porto') ||
    name.includes('portugal')
  ) {
    return { code: 'PT', name: 'Portugal', flag: '🇵🇹' };
  }

  return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
}

export function normalizeStandardCompany(raw?: string | null): string {
  if (!raw) return 'Luminous';
  const lower = raw.trim().toLowerCase();
  if (lower.includes('luminous')) return 'Luminous';
  if (lower.includes('wiseowe')) return 'Wiseowe';
  if (lower.includes('stocco')) return 'Stocco';
  if (lower.includes('triangulo') || lower.includes('triângulo')) return 'Triangulo';
  if (lower.includes('rosas') || lower.includes('kotrik')) return 'Kotrik & Rosas';
  if (lower.includes('login')) return 'Login Pro';
  return raw.trim();
}

async function fetchAllContasReceber() {
  const allRows: any[] = [];
  for (let page = 0; page < 4; page++) {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*')
      .order('id', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < 1000) break;
  }
  return allRows;
}

async function fetchRawBIDataset(year: number) {
  const [
    rpcAggRes,
    empresasRes,
    clientsRes,
    sitesRes,
    usersRes,
    functionsRes,
    contasReceberData,
    faturasRes,
    assignmentsRes,
    messagesRes,
  ] = await Promise.all([
    supabase.rpc('get_executive_bi_aggregates', { p_year: year }),
    supabase
      .schema('core_common')
      .from('empresas')
      .select('id, nome, trade_name, legal_name, codigo')
      .eq('is_active', true),
    supabase
      .schema('core_common')
      .from('clients')
      .select('id, codigo, trade_name, legal_name, country_id, province, city, tax_id, created_at, client_company_settings(empresa_id, status)')
      .range(0, 999),
    supabase
      .schema('core_common')
      .from('client_sites')
      .select('id, client_id, name, city, province, country_id')
      .range(0, 999),
    supabase.schema('core_operacoes').from('mcs_users').select('id, email, display_name'),
    supabase.schema('core_comercial').from('job_functions').select('id, name'),
    fetchAllContasReceber(),
    supabase
      .schema('core_finance')
      .from('faturas')
      .select('id, client_id, status, data_emissao, fatura_numero')
      .range(0, 999),
    supabase
      .schema('core_personal')
      .from('worker_assignments')
      .select('id, worker_id, empresa_id, pedido_id, client_site_id, job_function_name_snapshot, tarifa_acordada, start_date, planned_start_date, end_date, status, assignment_type, replacement_of_assignment_id, created_at, created_by')
      .order('created_at', { ascending: false })
      .range(0, 999),
    supabase
      .schema('core_personal')
      .from('worker_timesheet_messages')
      .select('id, worker_id, period_year, period_month, sender_type, sender_name, read, created_at')
      .eq('period_year', year)
      .range(0, 999),
  ]);

  const agg = rpcAggRes.data || {};

  return {
    empresas: empresasRes.data || [],
    clients: clientsRes.data || [],
    sites: sitesRes.data || [],
    users: usersRes.data || [],
    functions: functionsRes.data || [],
    estimaciones: agg.estimaciones || [],
    pedidos: agg.pedidos || [],
    pedidoItems: agg.pedido_items || [],
    leadsMensais: agg.leads_mensais || [],
    horasMensais: agg.horas_mensais || [],
    workerHoursMensais: agg.worker_hours_mensais || [],
    workers: agg.workers || [],
    contasReceber: contasReceberData || [],
    faturas: faturasRes.data || [],
    assignments: assignmentsRes.data || [],
    messages: messagesRes.data || [],
  };
}

export function useExecutiveBIData(filters: BIFilters) {
  const queryClient = useQueryClient();
  const [lastRealtimeSync, setLastRealtimeSync] = useState<Date>(new Date());

  const query = useQuery({
    queryKey: ['executive_bi_dataset', filters.year],
    queryFn: async () => {
      const data = await fetchRawBIDataset(filters.year);
      setLastRealtimeSync(new Date());
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('bi-executive-realtime')
      .on('postgres_changes', { event: '*', schema: 'core_personal', table: 'worker_hours' }, () => {
        setLastRealtimeSync(new Date());
        queryClient.invalidateQueries({ queryKey: ['executive_bi_dataset', filters.year] });
      })
      .on('postgres_changes', { event: '*', schema: 'core_personal', table: 'worker_assignments' }, () => {
        setLastRealtimeSync(new Date());
        queryClient.invalidateQueries({ queryKey: ['executive_bi_dataset', filters.year] });
      })
      .on('postgres_changes', { event: '*', schema: 'core_comercial', table: 'estimaciones' }, () => {
        setLastRealtimeSync(new Date());
        queryClient.invalidateQueries({ queryKey: ['executive_bi_dataset', filters.year] });
      })
      .on('postgres_changes', { event: '*', schema: 'core_comercial', table: 'pedidos' }, () => {
        setLastRealtimeSync(new Date());
        queryClient.invalidateQueries({ queryKey: ['executive_bi_dataset', filters.year] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.year, queryClient]);

  const computed = useMemo(() => {
    const raw = query.data;
    if (!raw) return null;

    const empresasMap = new Map<string, string>();
    raw.empresas.forEach((e: any) => {
      empresasMap.set(e.id, normalizeStandardCompany(e.trade_name || e.nome || e.legal_name));
    });

    const clientsMap = new Map<string, any>();
    raw.clients.forEach((c: any) => {
      const empId = c.client_company_settings?.[0]?.empresa_id || null;
      clientsMap.set(c.id, { ...c, empresa_id: empId });
    });

    const sitesMap = new Map<string, any>();
    raw.sites.forEach((s: any) => {
      sitesMap.set(s.id, s);
    });

    const usersMap = new Map<string, string>();
    raw.users.forEach((u: any) => {
      const name = u.display_name || (u.email ? u.email.split('@')[0] : 'Comercial');
      usersMap.set(u.id, name);
      if (u.email) usersMap.set(u.email, name);
    });

    const functionsMap = new Map<string, string>();
    raw.functions.forEach((f: any) => {
      functionsMap.set(f.id, f.name);
    });

    const workersMap = new Map<string, any>();
    raw.workers.forEach((w: any) => {
      workersMap.set(w.id, w);
    });

    const pedidosMap = new Map<string, any>();
    raw.pedidos.forEach((p: any) => {
      pedidosMap.set(p.id, p);
    });

    const matchesPeriod = (dateStr?: string | null, targetMonth: number | 'all' = filters.month): boolean => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (y !== filters.year) return false;
      if (targetMonth !== 'all' && m !== targetMonth) return false;
      return true;
    };

    const matchesGlobalDimensionFilters = (params: {
      empresa?: string;
      countryCode?: string;
      vendedor?: string;
      cliente?: string;
    }) => {
      if (filters.empresa !== 'all' && params.empresa && params.empresa.toLowerCase() !== filters.empresa.toLowerCase()) {
        return false;
      }
      if (filters.country !== 'all' && params.countryCode && params.countryCode !== filters.country) {
        return false;
      }
      if (filters.vendedor !== 'all' && params.vendedor && params.vendedor.toLowerCase() !== filters.vendedor.toLowerCase()) {
        return false;
      }
      if (filters.cliente !== 'all' && params.cliente && params.cliente.toLowerCase() !== filters.cliente.toLowerCase()) {
        return false;
      }
      return true;
    };

    const monthlyEvolution: MonthlyEvolutionPoint[] = Array.from({ length: 12 }, (_, idx) => ({
      month: idx + 1,
      monthLabel: MONTH_NAMES[idx],
      presupuestosCount: 0,
      presupuestosValor: 0,
      aprovadosCount: 0,
      aprovadosValor: 0,
      firmadosCount: 0,
      firmadosValor: 0,
      pedidosCount: 0,
      perfisDemandados: 0,
      novosClientes: 0,
      cobrancaEmitidaValor: 0,
      cobrancaRecebidaValor: 0,
      cobrancaVencidaValor: 0,
      cobrancaAVencerValor: 0,
      cobrancaTitulosCount: 0,
      horasTrabalhadas: 0,
      horasApontadasApp: 0,
      trabalhadoresComHoras: 0,
      faturamentoValor: 0,
      novasContratacoes: 0,
      reemplazos: 0,
      baixasDesistencias: 0,
    }));

    const uniqueEmpresas = new Set<string>(['Luminous', 'Wiseowe', 'Stocco', 'Triangulo', 'Kotrik & Rosas']);
    const uniqueVendedores = new Set<string>();
    const uniqueClientes = new Set<string>();

    // =========================================================================
    // 1. VISÃO COMERCIAL
    // =========================================================================
    const estimacionesRecords: DrillDownRecord[] = [];
    const aprovadosRecords: DrillDownRecord[] = [];
    const firmadosRecords: DrillDownRecord[] = [];
    const pedidosRecords: DrillDownRecord[] = [];
    const leadsRecords: DrillDownRecord[] = [];

    const sellerStatsMap = new Map<
      string,
      {
        vendedor: string;
        presupuestosCount: number;
        presupuestosValor: number;
        firmadosCount: number;
        firmadosValor: number;
        pedidosCount: number;
        perfisCount: number;
      }
    >();

    const countryStatsMap = new Map<
      string,
      {
        code: string;
        name: string;
        flag: string;
        presupuestosCount: number;
        presupuestosValor: number;
        firmadosValor: number;
        pedidosCount: number;
        perfisCount: number;
      }
    >();

    const profileMixMap = new Map<string, { perfil: string; quantidadeOrcada: number; quantidadePedidos: number }>();

    const estimacionesWithPedidos = new Set<string>(
      raw.pedidos.map((p: any) => p.source_estimacion_id).filter(Boolean)
    );

    raw.estimaciones.forEach((est: any) => {
      const client = clientsMap.get(est.client_id);
      const site = sitesMap.get(est.client_site_id);
      const countryInfo = resolveCountryExtended(client, site, est.country_id);
      const empresaNome = empresasMap.get(est.empresa_id) || 'Luminous';
      const vendedorNome =
        usersMap.get(est.commercial_owner_id) ||
        usersMap.get(est.created_by) ||
        'Comercial MCS';
      const clienteNome = client?.trade_name || client?.legal_name || 'Cliente Comercial';

      uniqueEmpresas.add(empresaNome);
      uniqueVendedores.add(vendedorNome);
      if (clienteNome !== 'Cliente Comercial') uniqueClientes.add(clienteNome);

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          vendedor: vendedorNome,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      // Saneamento de valor (usa total_estimated_revenue ou version_revenue ignorando outlier de teste > 10M)
      const vRev = Number(est.version_revenue || 0);
      const estRev = Number(est.total_estimated_revenue || 0);
      const valor = estRev > 0 ? estRev : vRev < 10_000_000 ? vRev : 0;
      const margin = Number(est.estimated_margin_percent ?? est.version_margin ?? 0);

      const items = Array.isArray(est.items) ? est.items : [];
      const qtdPerfis = items.reduce((acc: number, it: any) => acc + Number(it.quantity || 0), 0);

      const statusLower = (est.status || '').toLowerCase();
      const isApproved = ['approved', 'sent', 'signed', 'converted', 'aprovado', 'firmado'].includes(statusLower);
      const isSigned =
        ['approved', 'signed', 'converted', 'firmado'].includes(statusLower) ||
        estimacionesWithPedidos.has(est.id);

      const dt = new Date(est.created_at);
      if (!isNaN(dt.getTime()) && dt.getFullYear() === filters.year) {
        const mIdx = dt.getMonth();
        monthlyEvolution[mIdx].presupuestosCount += 1;
        monthlyEvolution[mIdx].presupuestosValor += valor;
        if (isApproved) {
          monthlyEvolution[mIdx].aprovadosCount += 1;
          monthlyEvolution[mIdx].aprovadosValor += valor;
        }
        if (isSigned) {
          monthlyEvolution[mIdx].firmadosCount += 1;
          monthlyEvolution[mIdx].firmadosValor += valor;
        }
      }

      if (!matchesPeriod(est.created_at)) return;

      const record: DrillDownRecord = {
        id: est.id,
        codigo: est.codigo || 'EST',
        titulo: clienteNome,
        subtitulo: `${qtdPerfis} perfis • Margem ${margin.toFixed(1)}%`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        vendedor: vendedorNome,
        cliente: clienteNome,
        status: isSigned ? 'Firmado / Aprovado' : isApproved ? 'Enviado' : est.status || 'Rascunho',
        data: est.created_at?.split('T')[0],
        quantidade: qtdPerfis,
        valor,
        link: `/comercial/estimaciones/${est.id}`,
      };

      estimacionesRecords.push(record);
      if (isApproved) aprovadosRecords.push(record);
      if (isSigned) firmadosRecords.push(record);

      if (!sellerStatsMap.has(vendedorNome)) {
        sellerStatsMap.set(vendedorNome, {
          vendedor: vendedorNome,
          presupuestosCount: 0,
          presupuestosValor: 0,
          firmadosCount: 0,
          firmadosValor: 0,
          pedidosCount: 0,
          perfisCount: 0,
        });
      }
      const sStat = sellerStatsMap.get(vendedorNome)!;
      sStat.presupuestosCount += 1;
      sStat.presupuestosValor += valor;
      if (isSigned) {
        sStat.firmadosCount += 1;
        sStat.firmadosValor += valor;
      }

      if (!countryStatsMap.has(countryInfo.code)) {
        countryStatsMap.set(countryInfo.code, {
          code: countryInfo.code,
          name: countryInfo.name,
          flag: countryInfo.flag,
          presupuestosCount: 0,
          presupuestosValor: 0,
          firmadosValor: 0,
          pedidosCount: 0,
          perfisCount: 0,
        });
      }
      const cStat = countryStatsMap.get(countryInfo.code)!;
      cStat.presupuestosCount += 1;
      cStat.presupuestosValor += valor;
      if (isSigned) cStat.firmadosValor += valor;

      items.forEach((it: any) => {
        const pName = functionsMap.get(it.job_function_id) || 'Perfil Técnico';
        if (!profileMixMap.has(pName)) {
          profileMixMap.set(pName, { perfil: pName, quantidadeOrcada: 0, quantidadePedidos: 0 });
        }
        profileMixMap.get(pName)!.quantidadeOrcada += Number(it.quantity || 0);
      });
    });

    // Processar Pedidos Gerados (colunas reais: quantity_requested, commercial_owner_id, expected_start_date)
    const itemsByPedido = new Map<string, any[]>();
    raw.pedidoItems.forEach((item: any) => {
      if (!itemsByPedido.has(item.pedido_id)) itemsByPedido.set(item.pedido_id, []);
      itemsByPedido.get(item.pedido_id)!.push(item);
    });

    let totalPerfisSolicitadosCount = 0;

    raw.pedidos.forEach((ped: any) => {
      const client = clientsMap.get(ped.client_id);
      const site = sitesMap.get(ped.client_site_id);
      const countryInfo = resolveCountryExtended(client, site, ped.country_id);
      const empresaNome = empresasMap.get(ped.empresa_id) || 'Luminous';
      const vendedorNome =
        usersMap.get(ped.commercial_owner_id) ||
        usersMap.get(ped.responsible_id) ||
        usersMap.get(ped.created_by) ||
        'Comercial MCS';
      const clienteNome = client?.trade_name || client?.legal_name || 'Cliente';

      uniqueEmpresas.add(empresaNome);
      uniqueVendedores.add(vendedorNome);
      uniqueClientes.add(clienteNome);

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          vendedor: vendedorNome,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      const pItems = itemsByPedido.get(ped.id) || [];
      const qtdPerfis = pItems.reduce(
        (acc, i) => acc + Number(i.quantity_requested ?? i.quantity_fulfilled ?? 1),
        0
      );

      const dateRef = ped.created_at || ped.expected_start_date;
      const dt = new Date(dateRef);
      if (!isNaN(dt.getTime()) && dt.getFullYear() === filters.year) {
        const mIdx = dt.getMonth();
        monthlyEvolution[mIdx].pedidosCount += 1;
        monthlyEvolution[mIdx].perfisDemandados += qtdPerfis;
      }

      if (!matchesPeriod(dateRef)) return;

      totalPerfisSolicitadosCount += qtdPerfis;

      pedidosRecords.push({
        id: ped.id,
        codigo: ped.codigo || 'PED',
        titulo: clienteNome,
        subtitulo: `${qtdPerfis} profissionais solicitados • Status: ${ped.operational_status || 'Ativo'}`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        vendedor: vendedorNome,
        cliente: clienteNome,
        status: ped.operational_status || ped.commercial_status || 'Ativo',
        data: dateRef?.split('T')[0],
        quantidade: qtdPerfis,
        valor: Number(ped.total_revenue_snapshot || 0),
        link: `/operacoes/pedidos/${ped.id}`,
      });

      if (!sellerStatsMap.has(vendedorNome)) {
        sellerStatsMap.set(vendedorNome, {
          vendedor: vendedorNome,
          presupuestosCount: 0,
          presupuestosValor: 0,
          firmadosCount: 0,
          firmadosValor: 0,
          pedidosCount: 0,
          perfisCount: 0,
        });
      }
      const sStat = sellerStatsMap.get(vendedorNome)!;
      sStat.pedidosCount += 1;
      sStat.perfisCount += qtdPerfis;

      if (!countryStatsMap.has(countryInfo.code)) {
        countryStatsMap.set(countryInfo.code, {
          code: countryInfo.code,
          name: countryInfo.name,
          flag: countryInfo.flag,
          presupuestosCount: 0,
          presupuestosValor: 0,
          firmadosValor: 0,
          pedidosCount: 0,
          perfisCount: 0,
        });
      }
      const cStat = countryStatsMap.get(countryInfo.code)!;
      cStat.pedidosCount += 1;
      cStat.perfisCount += qtdPerfis;

      pItems.forEach((it: any) => {
        const pName =
          it.job_function_name_snapshot || functionsMap.get(it.job_function_id) || 'Perfil Técnico';
        if (!profileMixMap.has(pName)) {
          profileMixMap.set(pName, { perfil: pName, quantidadeOrcada: 0, quantidadePedidos: 0 });
        }
        profileMixMap.get(pName)!.quantidadePedidos += Number(
          it.quantity_requested ?? it.quantity_fulfilled ?? 1
        );
      });
    });

    // Processar Novos Clientes & Leads (29.593 leads agregados via RPC)
    let novosClientesConvertidos = 0;
    raw.clients.forEach((cl: any) => {
      const countryInfo = resolveCountryExtended(cl);
      const empId = cl.client_company_settings?.[0]?.empresa_id;
      const empresaNome = empresasMap.get(empId) || 'Luminous';
      const clienteNome = cl.trade_name || cl.legal_name || 'Cliente';
      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          cliente: clienteNome,
        })
      ) {
        return;
      }
      const dt = new Date(cl.created_at);
      if (!isNaN(dt.getTime()) && dt.getFullYear() === filters.year) {
        monthlyEvolution[dt.getMonth()].novosClientes += 1;
      }
      if (matchesPeriod(cl.created_at)) {
        novosClientesConvertidos += 1;
      }
    });

    let novosLeadsCount = 0;
    raw.leadsMensais.forEach((ldGrp: any, idx: number) => {
      const countryInfo = resolveCountryExtended(undefined, undefined, ldGrp.country_id);
      const empresaNome = empresasMap.get(ldGrp.empresa_id) || 'Luminous';
      const vendedorNome = usersMap.get(ldGrp.assigned_to) || 'Comercial MCS';
      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          vendedor: vendedorNome,
        })
      ) {
        return;
      }
      if (filters.month !== 'all' && Number(ldGrp.month) !== filters.month) return;

      const count = Number(ldGrp.total_leads || 0);
      novosLeadsCount += count;

      leadsRecords.push({
        id: `lead-grp-${idx}`,
        codigo: `MÊS ${String(ldGrp.month).padStart(2, '0')}`,
        titulo: `${ldGrp.sample_company || 'Lote de Prospecção'} (+${count} leads)`,
        subtitulo: `${Number(ldGrp.converted_leads || 0)} convertidos em clientes • Responsável: ${vendedorNome}`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        vendedor: vendedorNome,
        status: 'Prospecção Ativa',
        quantidade: count,
        link: '/comercial/leads',
      });
    });

    const totalPresupuestosValor = estimacionesRecords.reduce((a, b) => a + (b.valor || 0), 0);
    const aprovadosValor = aprovadosRecords.reduce((a, b) => a + (b.valor || 0), 0);
    const firmadosValor = firmadosRecords.reduce((a, b) => a + (b.valor || 0), 0);

    const commercial: CommercialBIMetrics = {
      totalPresupuestosCount: estimacionesRecords.length,
      totalPresupuestosValor,
      aprovadosCount: aprovadosRecords.length,
      aprovadosValor,
      firmadosCount: firmadosRecords.length,
      firmadosValor,
      taxaConversaoValor: totalPresupuestosValor > 0 ? (firmadosValor / totalPresupuestosValor) * 100 : 0,
      taxaConversaoQtd: estimacionesRecords.length > 0 ? (firmadosRecords.length / estimacionesRecords.length) * 100 : 0,
      novosLeadsCount,
      novosClientesConvertidos,
      pedidosGeradosCount: pedidosRecords.length,
      perfisSolicitadosCount: totalPerfisSolicitadosCount,
      bySeller: Array.from(sellerStatsMap.values())
        .map((s) => ({
          ...s,
          conversaoPct: s.presupuestosCount > 0 ? (s.firmadosCount / s.presupuestosCount) * 100 : 0,
        }))
        .sort((a, b) => b.firmadosValor - a.firmadosValor || b.pedidosCount - a.pedidosCount),
      byCountry: Array.from(countryStatsMap.values()).sort((a, b) => b.presupuestosValor - a.presupuestosValor),
      byProfile: Array.from(profileMixMap.values())
        .sort((a, b) => b.quantidadePedidos + b.quantidadeOrcada - (a.quantidadePedidos + a.quantidadeOrcada))
        .slice(0, 12),
      rawRecords: {
        estimaciones: estimacionesRecords,
        aprovados: aprovadosRecords,
        firmados: firmadosRecords,
        pedidos: pedidosRecords,
        leads: leadsRecords,
      },
    };

    // =========================================================================
    // 2. VISÃO FINANCEIRA (Cobrança & Fluxo de Caixa Estratificado por Cliente)
    // =========================================================================
    const todosTitulosRecords: DrillDownRecord[] = [];
    const recebidosRecords: DrillDownRecord[] = [];
    const vencidosRecords: DrillDownRecord[] = [];
    const aVencerRecords: DrillDownRecord[] = [];

    const clientCashFlowMap = new Map<
      string,
      {
        cliente: string;
        empresa: string;
        titulosCount: number;
        totalEmitido: number;
        recebido: number;
        aVencer: number;
        vencido: number;
        somaAtrasoDias: number;
        vencidosCount: number;
      }
    >();

    const companyFinanceMap = new Map<
      string,
      {
        empresa: string;
        recebido: number;
        aVencer: number;
        vencido: number;
        titulosCount: number;
      }
    >();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    raw.contasReceber.forEach((row: any) => {
      const empresaNome = normalizeStandardCompany(row.empresa_resp || row.empresa);
      const clienteNome = (row.cliente || row.razao_social || 'Cliente Não Identificado').trim();
      const countryInfo = resolveCountryExtended({ trade_name: clienteNome });

      uniqueEmpresas.add(empresaNome);
      uniqueClientes.add(clienteNome);

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      const dtEmissao = parseDate(row.dt_emissao);
      const dtVenc = parseDate(row.dt_vencimento);
      const dtRef = dtVenc || dtEmissao;

      const valorTotal = parseEuroNumber(row.valot_total);
      const rawSaldo = row.saldo_a_pagar;
      const saldoAberto =
        rawSaldo === '' || rawSaldo === null || rawSaldo === undefined
          ? valorTotal
          : parseEuroNumber(rawSaldo);
      const valorRecebido = Math.max(0, valorTotal - saldoAberto);

      const statusRaw = (row.status || '').toLowerCase();
      const isPaid = statusRaw === 'pago' || saldoAberto <= 0.01;
      const isOverdue = !isPaid && dtVenc ? dtVenc < today : statusRaw.includes('vencid') || statusRaw.includes('atras');

      if (dtRef && dtRef.getFullYear() === filters.year) {
        const mIdx = dtRef.getMonth();
        monthlyEvolution[mIdx].cobrancaTitulosCount += 1;
        monthlyEvolution[mIdx].cobrancaEmitidaValor += valorTotal;
        if (isPaid) {
          monthlyEvolution[mIdx].cobrancaRecebidaValor += valorTotal;
        } else if (isOverdue) {
          monthlyEvolution[mIdx].cobrancaVencidaValor += saldoAberto;
        } else {
          monthlyEvolution[mIdx].cobrancaAVencerValor += saldoAberto;
        }
      }

      if (dtRef) {
        if (dtRef.getFullYear() !== filters.year) return;
        if (filters.month !== 'all' && dtRef.getMonth() + 1 !== filters.month) return;
      } else if (filters.month !== 'all') {
        return;
      }

      const atrasoDias =
        isOverdue && dtVenc ? Math.max(0, Math.floor((today.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      const rec: DrillDownRecord = {
        id: String(row.id),
        codigo: row.num_titulo || `TIT-${row.id}`,
        titulo: clienteNome,
        subtitulo: `Venc: ${dtVenc ? dtVenc.toISOString().split('T')[0] : 'N/A'} • ${atrasoDias > 0 ? `${atrasoDias}d atraso` : 'Em dia'}`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        cliente: clienteNome,
        status: isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'A Vencer',
        data: dtVenc ? dtVenc.toISOString().split('T')[0] : undefined,
        valor: isPaid ? valorTotal : saldoAberto,
        link: '/financeiro/cobranca',
      };

      todosTitulosRecords.push(rec);
      if (isPaid) {
        recebidosRecords.push(rec);
      } else if (isOverdue) {
        vencidosRecords.push(rec);
      } else {
        aVencerRecords.push(rec);
      }

      if (!clientCashFlowMap.has(clienteNome)) {
        clientCashFlowMap.set(clienteNome, {
          cliente: clienteNome,
          empresa: empresaNome,
          titulosCount: 0,
          totalEmitido: 0,
          recebido: 0,
          aVencer: 0,
          vencido: 0,
          somaAtrasoDias: 0,
          vencidosCount: 0,
        });
      }
      const cf = clientCashFlowMap.get(clienteNome)!;
      cf.titulosCount += 1;
      cf.totalEmitido += valorTotal;
      if (isPaid) {
        cf.recebido += valorTotal;
      } else {
        if (valorRecebido > 0) cf.recebido += valorRecebido;
        if (isOverdue) {
          cf.vencido += saldoAberto;
          cf.somaAtrasoDias += atrasoDias;
          cf.vencidosCount += 1;
        } else {
          cf.aVencer += saldoAberto;
        }
      }

      if (!companyFinanceMap.has(empresaNome)) {
        companyFinanceMap.set(empresaNome, {
          empresa: empresaNome,
          recebido: 0,
          aVencer: 0,
          vencido: 0,
          titulosCount: 0,
        });
      }
      const compF = companyFinanceMap.get(empresaNome)!;
      compF.titulosCount += 1;
      if (isPaid) {
        compF.recebido += valorTotal;
      } else {
        if (valorRecebido > 0) compF.recebido += valorRecebido;
        if (isOverdue) compF.vencido += saldoAberto;
        else compF.aVencer += saldoAberto;
      }
    });

    const totalEmitidoValor = Array.from(clientCashFlowMap.values()).reduce((a, b) => a + b.totalEmitido, 0);
    const recebidoValor = Array.from(clientCashFlowMap.values()).reduce((a, b) => a + b.recebido, 0);
    const aVencerValor = Array.from(clientCashFlowMap.values()).reduce((a, b) => a + b.aVencer, 0);
    const vencidoValor = Array.from(clientCashFlowMap.values()).reduce((a, b) => a + b.vencido, 0);

    const financial: FinancialBIMetrics = {
      totalTitulosCount: todosTitulosRecords.length,
      totalEmitidoValor,
      recebidoCount: recebidosRecords.length,
      recebidoValor,
      aVencerCount: aVencerRecords.length,
      aVencerValor,
      vencidoCount: vencidosRecords.length,
      vencidoValor,
      inadimplenciaPct: totalEmitidoValor > 0 ? (vencidoValor / totalEmitidoValor) * 100 : 0,
      byClientCashFlow: Array.from(clientCashFlowMap.values())
        .map((c) => ({
          cliente: c.cliente,
          empresa: c.empresa,
          titulosCount: c.titulosCount,
          totalEmitido: c.totalEmitido,
          recebido: c.recebido,
          aVencer: c.aVencer,
          vencido: c.vencido,
          atrasoMedioDias: c.vencidosCount > 0 ? Math.round(c.somaAtrasoDias / c.vencidosCount) : 0,
        }))
        .sort((a, b) => b.totalEmitido - a.totalEmitido),
      byCompany: Array.from(companyFinanceMap.values()).sort(
        (a, b) => b.recebido + b.vencido + b.aVencer - (a.recebido + a.vencido + a.aVencer)
      ),
      rawRecords: {
        todosTitulos: todosTitulosRecords,
        recebidos: recebidosRecords,
        vencidos: vencidosRecords,
        aVencer: aVencerRecords,
      },
    };

    // =========================================================================
    // 3. VISÃO FATURAMENTO & HORAS (Matéria-Prima: 17.053 lançamentos via RPC)
    // =========================================================================
    const faturasStatusMap = new Map<string, string>();
    raw.faturas.forEach((f: any) => {
      faturasStatusMap.set(f.id, f.status);
    });

    const monthlyWorkersSets = Array.from({ length: 12 }, () => new Set<string>());

    const clientBillingMatrixMap = new Map<
      string,
      {
        cliente: string;
        empresa: string;
        pais: string;
        workersSet: Set<string>;
        horasTotais: number;
        valorFaturado: number;
        statusFaturamento: string;
      }
    >();

    const horasLancadasRecords: DrillDownRecord[] = [];

    raw.horasMensais.forEach((hm: any, idx: number) => {
      const client = clientsMap.get(hm.client_id);
      const worker = workersMap.get(hm.worker_id);
      const countryInfo = resolveCountryExtended(client);
      const empresaNome =
        empresasMap.get(client?.empresa_id) ||
        normalizeStandardCompany(worker?.contratante) ||
        'Luminous';
      const clienteNome =
        client?.trade_name ||
        client?.legal_name ||
        worker?.cliente ||
        'Cliente Operacional';

      uniqueClientes.add(clienteNome);

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      const tot = Number(hm.total_horas || 0);
      const valorEntry = Number(hm.total_valor || 0);
      const tarifaMedia = Number(hm.tarifa_media || (tot > 0 ? valorEntry / tot : 26.5));
      const mNum = Number(hm.month || 1);
      const mIdx = mNum - 1;

      if (mIdx >= 0 && mIdx < 12) {
        monthlyEvolution[mIdx].horasTrabalhadas += tot;
        monthlyEvolution[mIdx].faturamentoValor += valorEntry;
        if (hm.worker_id) monthlyWorkersSets[mIdx].add(hm.worker_id);
      }

      if (filters.month !== 'all' && mNum !== filters.month) return;

      if (!clientBillingMatrixMap.has(clienteNome)) {
        clientBillingMatrixMap.set(clienteNome, {
          cliente: clienteNome,
          empresa: empresaNome,
          pais: `${countryInfo.flag} ${countryInfo.name}`,
          workersSet: new Set<string>(),
          horasTotais: 0,
          valorFaturado: 0,
          statusFaturamento: hm.fatura_id ? faturasStatusMap.get(hm.fatura_id) || 'Faturado' : 'Validado / Em Faturamento',
        });
      }
      const cMat = clientBillingMatrixMap.get(clienteNome)!;
      if (hm.worker_id) cMat.workersSet.add(hm.worker_id);
      cMat.horasTotais += tot;
      cMat.valorFaturado += valorEntry;

      horasLancadasRecords.push({
        id: `hm-${idx}-${hm.worker_id || 'w'}`,
        codigo: worker?.cod_colab || `MÊS ${String(mNum).padStart(2, '0')}`,
        titulo: worker?.nome || 'Trabalhador Alocado',
        subtitulo: `${clienteNome} • ${tot.toFixed(1)}h × €${tarifaMedia.toFixed(2)}/h`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        cliente: clienteNome,
        status: hm.status || 'Validado',
        data: `${filters.year}-${String(mNum).padStart(2, '0')}`,
        horas: tot,
        valor: valorEntry,
        link: '/faturamento/pendentes',
      });
    });

    // Processar Folhas de Horas do Aplicativo (worker_hours_mensais via RPC: 3.222 registros)
    const apuntamentosAppRecords: DrillDownRecord[] = [];
    let trabalhadoresApontandoApp = 0;
    let trabalhadoresPendentesApp = 0;
    let horasApontadasTempoReal = 0;
    let folhasValidadasCount = 0;
    let folhasEnviadasCount = 0;
    let folhasPendentesCount = 0;

    const appHoursByClientMap = new Map<string, number>();

    raw.workerHoursMensais.forEach((wh: any, idx: number) => {
      const empresaNome =
        empresasMap.get(wh.empresa_id) ||
        normalizeStandardCompany(wh.contratante) ||
        'Luminous';
      const clienteNome = (wh.cliente_nombre || 'Cliente Geral').trim();
      const countryInfo = resolveCountryExtended({ trade_name: clienteNome });

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      const mNum = Number(wh.month || 1);
      const mIdx = mNum - 1;
      const recCount = Number(wh.records_count || 0);
      const wrkCount = Number(wh.workers_count || 0);
      const rawHrs = Number(wh.total_horas || 0);
      const st = (wh.status || 'pendente').toLowerCase();

      // Se a folha já foi validada/enviada mas horas_totais no registro consolidado é 0 (pois as horas foram para horas_trabalhadas), estimar horas ou somar horas_totais reais do App
      const effectiveAppHours = rawHrs > 0 ? rawHrs : st !== 'pendente' ? recCount * 160 : 0;

      if (mIdx >= 0 && mIdx < 12) {
        monthlyEvolution[mIdx].horasApontadasApp += rawHrs > 0 ? rawHrs : 0;
      }

      if (filters.month !== 'all' && mNum !== filters.month) return;

      if (st === 'validado' || st === 'validated') folhasValidadasCount += recCount;
      else if (['enviado', 'processado', 'em_andamento', 'aguardando_assinatura'].includes(st)) {
        folhasEnviadasCount += recCount;
      } else {
        folhasPendentesCount += recCount;
      }

      if (rawHrs > 0 || st !== 'pendente') {
        trabalhadoresApontandoApp += wrkCount;
        horasApontadasTempoReal += rawHrs > 0 ? rawHrs : 0;
        appHoursByClientMap.set(
          clienteNome,
          (appHoursByClientMap.get(clienteNome) || 0) + (rawHrs > 0 ? rawHrs : effectiveAppHours)
        );

        apuntamentosAppRecords.push({
          id: `wh-grp-${idx}`,
          codigo: `MÊS ${String(mNum).padStart(2, '0')}`,
          titulo: clienteNome,
          subtitulo: `${recCount} folhas no App (${wrkCount} trabalhadores) • Status: ${st.toUpperCase()}`,
          empresa: empresaNome,
          pais: `${countryInfo.flag} ${countryInfo.name}`,
          cliente: clienteNome,
          status: st.toUpperCase(),
          quantidade: wrkCount,
          horas: rawHrs > 0 ? rawHrs : undefined,
          link: `/hours-control/client/${encodeURIComponent(clienteNome)}`,
        });
      } else {
        trabalhadoresPendentesApp += wrkCount;
      }
    });

    // Sincronizar horas apontadas no App nos meses em que as folhas já foram validadas em horas_trabalhadas
    monthlyEvolution.forEach((pt, idx) => {
      pt.trabalhadoresComHoras = monthlyWorkersSets[idx].size;
      if (pt.horasApontadasApp < pt.horasTrabalhadas && pt.horasTrabalhadas > 0) {
        pt.horasApontadasApp = pt.horasTrabalhadas;
      }
    });

    const faturamentoClientesRecords: DrillDownRecord[] = Array.from(clientBillingMatrixMap.values())
      .map((item, i) => ({
        id: `fat-cli-${i}`,
        codigo: `CLI-${i + 1}`,
        titulo: item.cliente,
        subtitulo: `${item.workersSet.size} trabalhadores • ${item.horasTotais.toFixed(1)}h`,
        empresa: item.empresa,
        pais: item.pais,
        cliente: item.cliente,
        status: item.statusFaturamento,
        quantidade: item.workersSet.size,
        horas: item.horasTotais,
        valor: item.valorFaturado,
        link: '/faturamento/pendentes',
      }))
      .sort((a, b) => (b.valor || 0) - (a.valor || 0));

    const totalHorasPeriodo = Array.from(clientBillingMatrixMap.values()).reduce((a, b) => a + b.horasTotais, 0);
    const totalFaturamentoPeriodo = Array.from(clientBillingMatrixMap.values()).reduce((a, b) => a + b.valorFaturado, 0);
    const uniqueBilledWorkers = new Set<string>();
    clientBillingMatrixMap.forEach((v) => v.workersSet.forEach((w) => uniqueBilledWorkers.add(w)));

    // Se horasApontadasTempoReal no ano completo for menor que totalHorasPeriodo validado, reflete o total sincronizado + em andamento
    if (horasApontadasTempoReal < totalHorasPeriodo) {
      horasApontadasTempoReal = totalHorasPeriodo + horasApontadasTempoReal;
    }

    // Cálculo MoM (Último mês com faturamento vs mês imediatamente anterior)
    const monthsWithBilling = monthlyEvolution.filter((m) => m.faturamentoValor > 0);
    const currMonthEvo =
      filters.month === 'all'
        ? monthsWithBilling[monthsWithBilling.length - 1]
        : monthlyEvolution[(filters.month as number) - 1];
    const prevMonthEvo =
      currMonthEvo && currMonthEvo.month > 1
        ? monthlyEvolution[currMonthEvo.month - 2]
        : undefined;

    const currHoursRef = currMonthEvo?.horasTrabalhadas || 0;
    const prevHoursRef = prevMonthEvo?.horasTrabalhadas || 0;
    const variacaoHorasMoMPct = prevHoursRef > 0 ? ((currHoursRef - prevHoursRef) / prevHoursRef) * 100 : 0;

    const currFatRef = currMonthEvo?.faturamentoValor || 0;
    const prevFatRef = prevMonthEvo?.faturamentoValor || 0;
    const variacaoFaturamentoMoMPct = prevFatRef > 0 ? ((currFatRef - prevFatRef) / prevFatRef) * 100 : 0;

    const billingHours: BillingHoursBIMetrics = {
      totalHorasPeriodo,
      totalHorasMesAnterior: prevHoursRef,
      variacaoHorasMoMPct,
      totalFaturamentoPeriodo,
      totalFaturamentoMesAnterior: prevFatRef,
      variacaoFaturamentoMoMPct,
      totalTrabalhadoresFaturados: uniqueBilledWorkers.size,
      totalClientesAtendidos: clientBillingMatrixMap.size,
      tarifaMediaHora: totalHorasPeriodo > 0 ? totalFaturamentoPeriodo / totalHorasPeriodo : 0,
      mediaHorasPorTrabalhador: uniqueBilledWorkers.size > 0 ? totalHorasPeriodo / uniqueBilledWorkers.size : 0,
      byClientMatrix: Array.from(clientBillingMatrixMap.values())
        .map((c) => ({
          cliente: c.cliente,
          empresa: c.empresa,
          pais: c.pais,
          trabalhadoresCount: c.workersSet.size,
          horasTotais: c.horasTotais,
          tarifaMedia: c.horasTotais > 0 ? c.valorFaturado / c.horasTotais : 0,
          valorFaturado: c.valorFaturado,
          statusFaturamento: c.statusFaturamento,
        }))
        .sort((a, b) => b.valorFaturado - a.valorFaturado),
      rawRecords: {
        faturamentoClientes: faturamentoClientesRecords,
        horasLancadas: horasLancadasRecords.sort((a, b) => (b.valor || 0) - (a.valor || 0)).slice(0, 500),
      },
    };

    // =========================================================================
    // 4. VISÃO OPERACIONAL / RH (790 trabalhadores, 331 alocações)
    // =========================================================================
    const novasContratacoesRecords: DrillDownRecord[] = [];
    const reemplazosRecords: DrillDownRecord[] = [];
    const baixasRecords: DrillDownRecord[] = [];
    const ativosRecords: DrillDownRecord[] = [];

    const clientOpsMap = new Map<
      string,
      {
        cliente: string;
        empresa: string;
        pais: string;
        ativos: number;
        novasContratacoes: number;
        reemplazos: number;
        baixas: number;
        horasApp: number;
      }
    >();

    let totalTrabalhadoresAtivos = 0;
    let totalTrabalhadoresBase = 0;
    let altasSeguridadeAtivas = 0;
    let emRegularizacaoSeguridade = 0;

    raw.workers.forEach((w: any) => {
      const empresaNome = normalizeStandardCompany(w.contratante);
      const clienteNome = (w.cliente || 'Disponível / Geral').trim();
      const countryInfo = resolveCountryExtended({ trade_name: clienteNome });

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      totalTrabalhadoresBase += 1;
      const stLower = (w.status_trabajador || '').toLowerCase();
      const isAtivo = stLower === 'ativo' || stLower === 'active';
      const segLower = (w.status_seguridad || '').toLowerCase();

      if (isAtivo) {
        totalTrabalhadoresAtivos += 1;
        if (segLower === 'alta') altasSeguridadeAtivas += 1;
        else emRegularizacaoSeguridade += 1;

        ativosRecords.push({
          id: w.id,
          codigo: w.cod_colab || 'COLAB',
          titulo: w.nome || 'Trabalhador',
          subtitulo: `${w.funcion || 'Operacional'} • Seguridade: ${w.status_seguridad || 'Regularização'}`,
          empresa: empresaNome,
          pais: `${countryInfo.flag} ${countryInfo.name}`,
          cliente: clienteNome,
          status: 'Ativo',
          data: w.data_ingresso?.split('T')[0],
          link: `/workers/${w.id}`,
        });

        if (!clientOpsMap.has(clienteNome)) {
          clientOpsMap.set(clienteNome, {
            cliente: clienteNome,
            empresa: empresaNome,
            pais: `${countryInfo.flag} ${countryInfo.name}`,
            ativos: 0,
            novasContratacoes: 0,
            reemplazos: 0,
            baixas: 0,
            horasApp: appHoursByClientMap.get(clienteNome) || 0,
          });
        }
        clientOpsMap.get(clienteNome)!.ativos += 1;
      }
    });

    raw.assignments.forEach((asg: any) => {
      const worker = workersMap.get(asg.worker_id);
      const pedido = pedidosMap.get(asg.pedido_id);
      const client = clientsMap.get(pedido?.client_id);
      const site = sitesMap.get(asg.client_site_id || pedido?.client_site_id);
      const countryInfo = resolveCountryExtended(client, site);
      const empresaNome =
        empresasMap.get(asg.empresa_id || pedido?.empresa_id) ||
        normalizeStandardCompany(worker?.contratante) ||
        'Luminous';
      const vendedorNome =
        usersMap.get(pedido?.commercial_owner_id) ||
        usersMap.get(asg.created_by) ||
        'Operações / RH';
      const clienteNome =
        client?.trade_name ||
        client?.legal_name ||
        worker?.cliente ||
        'Cliente Operacional';

      if (
        !matchesGlobalDimensionFilters({
          empresa: empresaNome,
          countryCode: countryInfo.code,
          vendedor: vendedorNome,
          cliente: clienteNome,
        })
      ) {
        return;
      }

      const dateRef = asg.start_date || asg.planned_start_date || asg.created_at;
      const dt = new Date(dateRef);

      const isReemplazo =
        Boolean(asg.replacement_of_assignment_id) ||
        (asg.assignment_type || '').toLowerCase().includes('reemplaz') ||
        (asg.assignment_type || '').toLowerCase().includes('replace') ||
        (asg.status || '').toLowerCase() === 'replaced';

      const isWithdrawnOrCancelled = ['cancelled', 'withdrawn', 'completed', 'desligado'].includes(
        (asg.status || '').toLowerCase()
      );

      if (!isNaN(dt.getTime()) && dt.getFullYear() === filters.year) {
        const mIdx = dt.getMonth();
        if (isReemplazo) {
          monthlyEvolution[mIdx].reemplazos += 1;
        } else {
          monthlyEvolution[mIdx].novasContratacoes += 1;
        }
        if (isWithdrawnOrCancelled) {
          monthlyEvolution[mIdx].baixasDesistencias += 1;
        }
      }

      if (!matchesPeriod(dateRef)) return;

      if (!clientOpsMap.has(clienteNome)) {
        clientOpsMap.set(clienteNome, {
          cliente: clienteNome,
          empresa: empresaNome,
          pais: `${countryInfo.flag} ${countryInfo.name}`,
          ativos: 0,
          novasContratacoes: 0,
          reemplazos: 0,
          baixas: 0,
          horasApp: appHoursByClientMap.get(clienteNome) || 0,
        });
      }
      const cOp = clientOpsMap.get(clienteNome)!;

      const rec: DrillDownRecord = {
        id: asg.id,
        codigo: pedido?.codigo || worker?.cod_colab || 'ASG',
        titulo: worker?.nome || 'Trabalhador Alocado',
        subtitulo: `${asg.job_function_name_snapshot || worker?.funcion || 'Função'} • ${isReemplazo ? 'Substituição (Reemplazo)' : 'Nova Contratação'}`,
        empresa: empresaNome,
        pais: `${countryInfo.flag} ${countryInfo.name}`,
        vendedor: vendedorNome,
        cliente: clienteNome,
        status: isReemplazo ? 'Reemplazo' : asg.status || 'Ativo',
        data: dateRef?.split('T')[0],
        valor: Number(asg.tarifa_acordada || 0),
        link: '/operacoes/personal/contratacoes',
      };

      if (isReemplazo) {
        reemplazosRecords.push(rec);
        cOp.reemplazos += 1;
      } else {
        novasContratacoesRecords.push(rec);
        cOp.novasContratacoes += 1;
      }

      if (isWithdrawnOrCancelled) {
        baixasRecords.push(rec);
        cOp.baixas += 1;
      }
    });

    const totalMovimentacoesEntrada = novasContratacoesRecords.length + reemplazosRecords.length;

    const operational: OperationalRHBIMetrics = {
      totalTrabalhadoresAtivos,
      totalTrabalhadoresBase,
      novasContratacoesPeriodo: novasContratacoesRecords.length,
      reemplazosPeriodo: reemplazosRecords.length,
      baixasDesistenciasPeriodo: baixasRecords.length,
      taxaSubstituicaoPct:
        totalMovimentacoesEntrada > 0 ? (reemplazosRecords.length / totalMovimentacoesEntrada) * 100 : 0,
      taxaRetencaoPct:
        totalMovimentacoesEntrada > 0
          ? Math.max(0, ((totalMovimentacoesEntrada - baixasRecords.length) / totalMovimentacoesEntrada) * 100)
          : 100,
      trabalhadoresApontandoApp,
      trabalhadoresPendentesApp,
      horasApontadasTempoReal,
      folhasValidadasCount,
      folhasEnviadasCount,
      folhasPendentesCount,
      altasSeguridadeAtivas,
      emRegularizacaoSeguridade,
      mensagensAppWhatsappCount: raw.messages.length,
      byClientOperations: Array.from(clientOpsMap.values())
        .filter((c) => c.ativos > 0 || c.novasContratacoes > 0 || c.reemplazos > 0 || c.horasApp > 0)
        .sort((a, b) => b.ativos + b.novasContratacoes - (a.ativos + a.novasContratacoes)),
      rawRecords: {
        novasContratacoes: novasContratacoesRecords,
        reemplazos: reemplazosRecords,
        baixas: baixasRecords,
        apontamentosApp: apuntamentosAppRecords,
        ativos: ativosRecords,
      },
    };

    return {
      monthlyEvolution,
      commercial,
      financial,
      billingHours,
      operational,
      filterOptions: {
        empresas: Array.from(uniqueEmpresas).sort(),
        vendedores: Array.from(uniqueVendedores).sort(),
        clientes: Array.from(uniqueClientes).sort(),
      },
    };
  }, [query.data, filters]);

  return {
    data: computed,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    lastRealtimeSync,
  };
}
