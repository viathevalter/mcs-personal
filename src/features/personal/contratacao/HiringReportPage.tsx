import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  UserCog,
  UserPlus,
  Clock, 
  TrendingUp, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  RefreshCw,
  X,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useHiringReport, formatStandardContratante, formatStandardContratador } from './hooks/useHiringReport';
import type { HiringReportFilters, WorkerDisplayStatus } from './hooks/useHiringReport';
import * as XLSX from 'xlsx';

type SortKey = 'worker_name' | 'contratante' | 'contratador' | 'client_name' | 'job_function_name' | 'tarifa_acordada' | 'start_date' | 'days_worked' | 'status' | 'status_seguridad';

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '-';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getPresetDates(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (preset) {
    case 'this_month': {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return { startDate: formatDateStr(first), endDate: formatDateStr(last) };
    }
    case 'next_month': {
      const first = new Date(year, month + 1, 1);
      const last = new Date(year, month + 2, 0);
      return { startDate: formatDateStr(first), endDate: formatDateStr(last) };
    }
    case 'last_month': {
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      return { startDate: formatDateStr(first), endDate: formatDateStr(last) };
    }
    case 'last_90_days': {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { startDate: formatDateStr(start), endDate: formatDateStr(now) };
    }
    case 'this_year': {
      const first = new Date(year, 0, 1);
      const last = new Date(year, 11, 31);
      return { startDate: formatDateStr(first), endDate: formatDateStr(last) };
    }
    case 'all': {
      return { startDate: '', endDate: '' };
    }
    default: {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return { startDate: formatDateStr(first), endDate: formatDateStr(last) };
    }
  }
}

export function HiringReportPage() {
  const { selectedEmpresaId } = useEmpresa();

  // Date Preset State
  const [presetFilter, setPresetFilter] = useState<string>('this_month');
  const defaultDates = useMemo(() => getPresetDates('this_month'), []);

  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);

  // Dropdown Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [contratanteFilter, setContratanteFilter] = useState<string>('all');
  const [contratadorFilter, setContratadorFilter] = useState<string>('all');
  const [pedidoFilter, setPedidoFilter] = useState<string>('all');
  const [jobFunctionFilter, setJobFunctionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seguridadFilter, setSeguridadFilter] = useState<string>('all');

  // Interactive KPI Card Selection State
  const [activeKpiCard, setActiveKpiCard] = useState<'total' | 'active' | 'pending_entry' | 'inactive' | 'alta' | 'regularizacao'>('total');

  // Sorting State
  const [sortField, setSortField] = useState<SortKey>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const reportFilters: HiringReportFilters = useMemo(() => ({
    empresa_id: selectedEmpresaId,
    startDate,
    endDate,
    clientFilter,
    contratanteFilter,
    contratadorFilter,
    pedidoFilter,
    jobFunctionFilter,
    statusFilter,
    seguridadFilter
  }), [selectedEmpresaId, startDate, endDate, clientFilter, contratanteFilter, contratadorFilter, pedidoFilter, jobFunctionFilter, statusFilter, seguridadFilter]);

  const { data: reportData, isLoading, refetch, isFetching } = useHiringReport(reportFilters);

  // Preset Date Filter Handler
  const handlePresetChange = (preset: string) => {
    setPresetFilter(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  // Interactive KPI Card Click Handler
  const handleKpiClick = (type: 'total' | 'active' | 'pending_entry' | 'inactive' | 'alta' | 'regularizacao') => {
    setActiveKpiCard(type);
    if (type === 'total') {
      setStatusFilter('all');
      setSeguridadFilter('all');
    } else if (type === 'active') {
      setStatusFilter('active');
      setSeguridadFilter('all');
    } else if (type === 'pending_entry') {
      setStatusFilter('pending_entry');
      setSeguridadFilter('all');
    } else if (type === 'inactive') {
      setStatusFilter('inactive');
      setSeguridadFilter('all');
    } else if (type === 'alta') {
      setStatusFilter('all');
      setSeguridadFilter('alta');
    } else if (type === 'regularizacao') {
      setStatusFilter('all');
      setSeguridadFilter('regularizacao');
    }
  };

  // Client-side Filter by Search Query
  const filteredItems = useMemo(() => {
    if (!reportData?.items) return [];
    if (!searchQuery.trim()) return reportData.items;

    const q = searchQuery.toLowerCase().trim();
    return reportData.items.filter(item => 
      item.worker_name.toLowerCase().includes(q) ||
      item.worker_document.toLowerCase().includes(q) ||
      item.client_name.toLowerCase().includes(q) ||
      item.contratante.toLowerCase().includes(q) ||
      item.contratador.toLowerCase().includes(q) ||
      item.pedido_codigo.toLowerCase().includes(q) ||
      item.job_function_name.toLowerCase().includes(q)
    );
  }, [reportData?.items, searchQuery]);

  // Client-side Sort Handler
  const handleSort = (field: SortKey) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'worker_name':
          valA = (a.worker_name || '').toLowerCase();
          valB = (b.worker_name || '').toLowerCase();
          break;
        case 'contratante':
          valA = (a.contratante || '').toLowerCase();
          valB = (b.contratante || '').toLowerCase();
          break;
        case 'contratador':
          valA = (a.contratador || '').toLowerCase();
          valB = (b.contratador || '').toLowerCase();
          break;
        case 'client_name':
          valA = (a.client_name || '').toLowerCase();
          valB = (b.client_name || '').toLowerCase();
          break;
        case 'job_function_name':
          valA = (a.job_function_name || '').toLowerCase();
          valB = (b.job_function_name || '').toLowerCase();
          break;
        case 'tarifa_acordada':
          valA = a.tarifa_acordada ?? -1;
          valB = b.tarifa_acordada ?? -1;
          break;
        case 'start_date':
          valA = a.start_date || '';
          valB = b.start_date || '';
          break;
        case 'days_worked':
          valA = a.days_worked || 0;
          valB = b.days_worked || 0;
          break;
        case 'status':
          valA = a.status_label || '';
          valB = b.status_label || '';
          break;
        case 'status_seguridad':
          valA = a.is_seguridad_alta ? 1 : 0;
          valB = b.is_seguridad_alta ? 1 : 0;
          break;
        default:
          valA = (a.worker_name || '').toLowerCase();
          valB = (b.worker_name || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [filteredItems, sortField, sortDirection]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!sortedItems.length) return;

    const exportRows = sortedItems.map((item, index) => ({
      '#': index + 1,
      'Trabalhador': item.worker_name,
      'Documento': item.worker_document,
      'Empresa do Grupo': item.contratante,
      'Contratador': item.contratador,
      'Cliente': item.client_name,
      'Obra / Unidade': item.client_site_name,
      'Código Pedido': item.pedido_codigo,
      'Função / Perfil': item.job_function_name,
      'Tarifa €/h': item.tarifa_acordada ? `€ ${item.tarifa_acordada.toFixed(2)}` : '-',
      'Início Trabalho': formatDateBR(item.start_date),
      'Saída / Término': formatDateBR(item.end_date),
      'Dias Trabalhados': item.days_worked,
      'Status': item.status_label,
      'Seguridade Social': item.status_seguridad,
      'Observações / Motivo': item.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratações');
    
    const fileName = `Relatorio_Contratacoes_${startDate || 'inicio'}_ate_${endDate || 'hoje'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleClearFilters = () => {
    setPresetFilter('this_month');
    const d = getPresetDates('this_month');
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setSearchQuery('');
    setClientFilter('all');
    setContratanteFilter('all');
    setContratadorFilter('all');
    setPedidoFilter('all');
    setJobFunctionFilter('all');
    setStatusFilter('all');
    setSeguridadFilter('all');
    setActiveKpiCard('total');
  };

  const SortIcon = ({ field, currentField, direction }: { field: SortKey; currentField: SortKey; direction: 'asc' | 'desc' }) => {
    if (field !== currentField) return <ArrowUpDown className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return direction === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />;
  };

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Controle de Contratações e Permanência
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Relatório de trabalhadores contratados pelas empresas do grupo no período selecionado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar Dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!sortedItems.length}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar Compact */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
        
        {/* Preset Date Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
              PERÍODO:
            </span>
            <button
              onClick={() => handlePresetChange('this_month')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handlePresetChange('next_month')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'next_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Próximo Mês
            </button>
            <button
              onClick={() => handlePresetChange('last_month')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'last_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => handlePresetChange('last_90_days')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'last_90_days'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Últimos 90 Dias
            </button>
            <button
              onClick={() => handlePresetChange('this_year')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'this_year'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Ano Atual
            </button>
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todos os Períodos
            </button>
            <button
              onClick={() => setPresetFilter('custom')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                presetFilter === 'custom'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPresetFilter('custom');
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPresetFilter('custom');
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          
          {/* Search Input */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Buscar Trabalhador
            </label>
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Empresa do Grupo */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Empresa do Grupo
            </label>
            <select
              value={contratanteFilter}
              onChange={(e) => setContratanteFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas as Empresas</option>
              {reportData?.uniqueContratantes?.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Contratador / Recrutador */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Contratador
            </label>
            <select
              value={contratadorFilter}
              onChange={(e) => setContratadorFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos os Contratadores</option>
              <option value="Wolmer">Wolmer</option>
              <option value="Contratação">Contratação</option>
              {reportData?.uniqueContratadores?.filter(c => c !== 'Wolmer' && c !== 'Contratação').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Cliente */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Cliente
            </label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos os Clientes</option>
              {reportData?.uniqueClients?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Pedido */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Pedido
            </label>
            <select
              value={pedidoFilter}
              onChange={(e) => setPedidoFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos os Pedidos</option>
              {reportData?.uniquePedidos?.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
          </div>

          {/* Função / Perfil */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Função / Perfil
            </label>
            <select
              value={jobFunctionFilter}
              onChange={(e) => setJobFunctionFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas as Funções</option>
              {reportData?.uniqueFunctions?.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                if (val === 'active') setActiveKpiCard('active');
                else if (val === 'pending_entry') setActiveKpiCard('pending_entry');
                else if (val === 'inactive') setActiveKpiCard('inactive');
                else setActiveKpiCard('total');
              }}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">● Somente Ativos</option>
              <option value="pending_entry">● Pendente de Ingressar</option>
              <option value="inactive">● Somente Desligados</option>
            </select>
          </div>

        </div>

        {/* Clear Filters Row */}
        {(presetFilter !== 'this_month' || searchQuery || contratanteFilter !== 'all' || contratadorFilter !== 'all' || clientFilter !== 'all' || pedidoFilter !== 'all' || jobFunctionFilter !== 'all' || statusFilter !== 'all' || seguridadFilter !== 'all' || activeKpiCard !== 'total') && (
          <div className="pt-1 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              <X className="h-3 w-3" />
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid Compact - Interactive Clickable Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        
        {/* Total Contratados (Clickable) */}
        <div 
          onClick={() => handleKpiClick('total')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'total'
              ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para listar todos os contratados no período"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Total Contratados
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'total' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {reportData?.totalHired || 0} <span className="text-[10px] font-normal text-slate-500">no período</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'total' && <CheckCircle2 className="h-2.5 w-2.5 text-indigo-600" />}
              Entradas registradas
            </p>
          </div>
        </div>

        {/* Ativos Atualmente (Clickable) */}
        <div 
          onClick={() => handleKpiClick('active')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'active'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para filtrar apenas os trabalhadores ativos"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              Ativos Atualmente
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {reportData?.totalActive || 0} <span className="text-[10px] font-normal text-slate-500">trabalhando</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'active' && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
              Alocações vigentes
            </p>
          </div>
        </div>

        {/* Pendente de Ingressar (Clickable) */}
        <div 
          onClick={() => handleKpiClick('pending_entry')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'pending_entry'
              ? 'ring-2 ring-sky-500 border-sky-400 bg-sky-50/40 dark:bg-sky-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para filtrar trabalhadores pendentes de ingresso"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider truncate">
              Pendente Ingresso
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'pending_entry' ? 'bg-sky-600 text-white' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400 leading-tight">
              {reportData?.totalPendingEntry || 0} <span className="text-[10px] font-normal text-slate-500">aguardando</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'pending_entry' && <CheckCircle2 className="h-2.5 w-2.5 text-sky-600" />}
              A ser admitido
            </p>
          </div>
        </div>

        {/* Desligados / Saíram (Clickable) */}
        <div 
          onClick={() => handleKpiClick('inactive')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'inactive'
              ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/40 dark:bg-rose-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para filtrar apenas os desligados/encerrados"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider truncate">
              Desligados / Saíram
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'inactive' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              <UserMinus className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 leading-tight">
              {reportData?.totalInactive || 0} <span className="text-[10px] font-normal text-slate-500">encerrados</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'inactive' && <CheckCircle2 className="h-2.5 w-2.5 text-rose-600" />}
              Remanejados / baixa
            </p>
          </div>
        </div>

        {/* De Alta Seguridade Social (Clickable) */}
        <div 
          onClick={() => handleKpiClick('alta')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'alta'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para filtrar apenas os trabalhadores De Alta na Seguridade Social"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              De Alta (Seguridade)
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'alta' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {reportData?.totalAlta || 0} <span className="text-[10px] font-normal text-slate-500">({reportData?.pctAlta || 0}%)</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'alta' && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
              Alta na seguridade
            </p>
          </div>
        </div>

        {/* Em Regularização Seguridade Social (Clickable) */}
        <div 
          onClick={() => handleKpiClick('regularizacao')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-2.5 shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${
            activeKpiCard === 'regularizacao'
              ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/40 dark:bg-amber-950/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
          title="Clique para filtrar os trabalhadores Em Regularização na Seguridade Social"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
              Em Regularização
            </span>
            <div className={`p-1 rounded-lg shrink-0 ${activeKpiCard === 'regularizacao' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
              {reportData?.totalRegularizacao || 0} <span className="text-[10px] font-normal text-slate-500">({reportData?.pctRegularizacao || 0}%)</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
              {activeKpiCard === 'regularizacao' && <CheckCircle2 className="h-2.5 w-2.5 text-amber-600" />}
              Processo / regularização
            </p>
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Taxa de Retenção
            </span>
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {reportData?.retentionRate || 0}%
            </div>
            <p className="text-[9px] text-slate-400 truncate">
              Permanência total
            </p>
          </div>
        </div>

        {/* Permanência Média */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Permanência Média
            </span>
            <div className="p-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {reportData?.avgDaysWorked || 0} <span className="text-[10px] font-normal text-slate-500">dias</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">
              Média em atividade
            </p>
          </div>
        </div>

      </div>

      {/* Visual Charts Row Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Function Breakdown Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Contratações por Função / Perfil
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              {reportData?.functionBreakdown?.length || 0} perfis encontrados
            </span>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {reportData?.functionBreakdown?.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-4 text-center">Nenhum perfil no período.</p>
            ) : (
              reportData?.functionBreakdown?.slice(0, 5).map(item => {
                const maxVal = reportData.functionBreakdown[0]?.total || 1;
                const activePct = (item.active / maxVal) * 100;
                const inactivePct = (item.inactive / maxVal) * 100;

                return (
                  <div key={item.functionName} className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium">
                      <span className="truncate max-w-[200px]" title={item.functionName}>
                        {item.functionName}
                      </span>
                      <span className="font-mono text-slate-500">
                        <strong className="text-slate-900 dark:text-white font-bold">{item.active}</strong> ativos ({item.total})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${activePct}%` }} 
                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-500" 
                        title={`${item.active} ativos`}
                      />
                      <div 
                        style={{ width: `${inactivePct}%` }} 
                        className="bg-rose-400 h-full rounded-r-full transition-all duration-500" 
                        title={`${item.inactive} encerrados`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Empresa do Grupo Breakdown Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Desempenho por Empresa do Grupo
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              {reportData?.contratanteBreakdown?.length || 0} empresas
            </span>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {reportData?.contratanteBreakdown?.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-4 text-center">Nenhuma empresa no período.</p>
            ) : (
              reportData?.contratanteBreakdown?.map(item => {
                const maxVal = reportData.contratanteBreakdown[0]?.total || 1;
                const activePct = (item.active / maxVal) * 100;
                const inactivePct = (item.inactive / maxVal) * 100;
                const rate = item.total > 0 ? Math.round((item.active / item.total) * 100) : 0;

                return (
                  <div key={item.contratante} className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {item.contratante}
                      </span>
                      <span className="font-mono text-slate-500">
                        <strong className="text-slate-900 dark:text-white font-bold">{item.total}</strong> contratados ({rate}% retenção)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${activePct}%` }} 
                        className="bg-sky-500 h-full rounded-l-full transition-all duration-500" 
                        title={`${item.active} ativos`}
                      />
                      <div 
                        style={{ width: `${inactivePct}%` }} 
                        className="bg-rose-400 h-full rounded-r-full transition-all duration-500" 
                        title={`${item.inactive} encerrados`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Relação Detalhada de Contratações
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
              {sortedItems.length} registros
            </span>

            {/* Active KPI Badge highlight */}
            {activeKpiCard !== 'total' && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${
                activeKpiCard === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeKpiCard === 'pending_entry'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : activeKpiCard === 'inactive'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : activeKpiCard === 'alta'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                Filtro KPI: {
                  activeKpiCard === 'active' ? 'Ativos' :
                  activeKpiCard === 'pending_entry' ? 'Pendente Ingresso' :
                  activeKpiCard === 'inactive' ? 'Desligados' :
                  activeKpiCard === 'alta' ? 'De Alta (Seguridade)' : 'Em Regularização'
                }
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Exibindo alocações e trabalhadores
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Carregando relatório de contratações...</p>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Filter className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nenhuma contratação encontrada com os filtros selecionados.</p>
              <p className="text-[11px] text-slate-400">Tente clicar em outro KPI ou limpar os filtros de pesquisa.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                  
                  {/* Worker Name Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('worker_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Trabalhador</span>
                      <SortIcon field="worker_name" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Empresa do Grupo Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('contratante')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Empresa do Grupo</span>
                      <SortIcon field="contratante" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Contratador Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('contratador')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Contratador</span>
                      <SortIcon field="contratador" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Cliente / Pedido Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('client_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Cliente / Pedido</span>
                      <SortIcon field="client_name" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Função / Perfil Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('job_function_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Função / Perfil</span>
                      <SortIcon field="job_function_name" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Tarifa Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('tarifa_acordada')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Tarifa</span>
                      <SortIcon field="tarifa_acordada" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Início Trabalho Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('start_date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Início Trabalho</span>
                      <SortIcon field="start_date" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Saída / Término Column */}
                  <th className="py-2.5 px-3">Saída / Término</th>

                  {/* Dias Trabalhados Column */}
                  <th 
                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('days_worked')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Dias Trabalhados</span>
                      <SortIcon field="days_worked" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Status Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Seguridade Social Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('status_seguridad')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Seguridade Social</span>
                      <SortIcon field="status_seguridad" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Notes / Reason Column */}
                  <th className="py-2.5 px-3">Obs / Motivo</th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedItems.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Worker Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-[11px]">
                        {item.worker_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Doc: {item.worker_document}
                      </div>
                    </td>

                    {/* Empresa do Grupo Badge */}
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-[10px]">
                        {item.contratante}
                      </span>
                    </td>

                    {/* Contratador Badge */}
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[10px] inline-flex items-center gap-1">
                        <UserCog className="h-2.5 w-2.5 text-indigo-500" />
                        {item.contratador}
                      </span>
                    </td>

                    {/* Client & Pedido */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[170px]" title={item.client_name}>
                        {item.client_name}
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                        Pedido: {item.pedido_codigo}
                      </div>
                    </td>

                    {/* Function / Profile */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                      {item.job_function_name}
                    </td>

                    {/* Tarifa */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      {item.tarifa_acordada ? `€${item.tarifa_acordada.toFixed(2)}/h` : '-'}
                    </td>

                    {/* Start Date */}
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                      {formatDateBR(item.start_date)}
                    </td>

                    {/* End Date (Data de Saída / Término) */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {item.end_date ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {formatDateBR(item.end_date)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Days Worked Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                        item.display_status === 'active' 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                          : item.display_status === 'pending_entry'
                          ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        <Clock className="h-2.5 w-2.5" />
                        {item.days_worked} dias
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      {item.display_status === 'pending_entry' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                          ● Pendente Ingresso
                        </span>
                      ) : item.display_status === 'inactive' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                          ● Desligado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ● Ativo
                        </span>
                      )}
                    </td>

                    {/* Seguridade Social Badge */}
                    <td className="py-2.5 px-3">
                      {item.is_seguridad_alta ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ● De Alta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                          ● Regularização
                        </span>
                      )}
                    </td>

                    {/* Notes / Reason */}
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[10px] max-w-[180px] truncate" title={item.notes || ''}>
                      {item.notes || '-'}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
