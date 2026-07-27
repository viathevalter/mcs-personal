import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Filter, 
  X, 
  FileSpreadsheet, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

import * as XLSX from 'xlsx';

import { useHiringReport, type HiringReportFilters } from './hooks/useHiringReport';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

type SortKey = 'worker_name' | 'contratante' | 'client_name' | 'job_function_name' | 'tarifa_acordada' | 'start_date' | 'days_worked' | 'status' | 'status_seguridad';

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '-';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getPresetDates(preset: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'this_month') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) };
  }
  if (preset === 'last_month') {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) };
  }
  if (preset === 'last_90_days') {
    const start = new Date();
    start.setDate(now.getDate() - 90);
    return { startDate: formatYMD(start), endDate: formatYMD(now) };
  }
  if (preset === 'this_year') {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) };
  }
  return { startDate: '', endDate: '' };
}

const SortIcon: React.FC<{ field: SortKey; currentField: SortKey; direction: 'asc' | 'desc' }> = ({
  field,
  currentField,
  direction,
}) => {
  if (field !== currentField) {
    return <ArrowUpDown className="h-3 w-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />;
  }
  return direction === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
  ) : (
    <ArrowDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
  );
};

export const HiringReportPage: React.FC = () => {
  const { selectedEmpresaId } = useEmpresa();

  // Filters State
  const [presetFilter, setPresetFilter] = useState<string>('this_month');
  
  const initialDates = useMemo(() => getPresetDates('this_month'), []);
  const [startDate, setStartDate] = useState<string>(initialDates.startDate);
  const [endDate, setEndDate] = useState<string>(initialDates.endDate);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contratanteFilter, setContratanteFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [pedidoFilter, setPedidoFilter] = useState<string>('all');
  const [jobFunctionFilter, setJobFunctionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting State
  const [sortField, setSortField] = useState<SortKey>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const reportFilters: HiringReportFilters = useMemo(() => ({
    empresa_id: selectedEmpresaId,
    startDate,
    endDate,
    clientFilter,
    contratanteFilter,
    pedidoFilter,
    jobFunctionFilter,
    statusFilter
  }), [selectedEmpresaId, startDate, endDate, clientFilter, contratanteFilter, pedidoFilter, jobFunctionFilter, statusFilter]);

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

  // Client-side Filter by Search Query
  const filteredItems = useMemo(() => {
    if (!reportData?.items) return [];
    if (!searchQuery.trim()) return reportData.items;

    const q = searchQuery.toLowerCase().trim();
    return reportData.items.filter(item => 
      item.worker_name.toLowerCase().includes(q) ||
      item.worker_document.toLowerCase().includes(q) ||
      item.contratante.toLowerCase().includes(q) ||
      item.client_name.toLowerCase().includes(q) ||
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
          valA = a.is_active ? 1 : 0;
          valB = b.is_active ? 1 : 0;
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
      'Empresa Contratante (Terceira)': item.contratante,
      'Cliente': item.client_name,
      'Unidade / Obra': item.client_site_name,
      'Número do Pedido': item.pedido_codigo,
      'Função / Perfil': item.job_function_name,
      'Tarifa Acordada (€)': item.tarifa_acordada !== null ? item.tarifa_acordada : '-',
      'Data de Início': formatDateBR(item.start_date),
      'Data de Saída / Fim': formatDateBR(item.end_date),
      'Dias Trabalhados': item.days_worked,
      'Status Trabalhador': item.is_active ? 'Ativo' : 'Desligado / Substituído',
      'Seguridade Social': item.status_seguridad,
      'Status Alocação': item.status,
      'Tipo de Entrada': item.assignment_type || 'Nova Contratação',
      'Observações / Motivo': item.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    const colWidths = [
      { wch: 5 },   // #
      { wch: 30 },  // Trabalhador
      { wch: 15 },  // Documento
      { wch: 25 },  // Empresa Contratante
      { wch: 25 },  // Cliente
      { wch: 20 },  // Unidade
      { wch: 18 },  // Pedido
      { wch: 30 },  // Função
      { wch: 16 },  // Tarifa
      { wch: 14 },  // Data Início
      { wch: 14 },  // Data Saída
      { wch: 16 },  // Dias Trabalhados
      { wch: 14 },  // Status
      { wch: 18 },  // Seguridade Social
      { wch: 16 },  // Status Alocação
      { wch: 18 },  // Tipo
      { wch: 30 }   // Observações
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratações');

    const dateSuffix = formatYMD(new Date());
    XLSX.writeFile(workbook, `Relatorio_Contratacoes_${dateSuffix}.xlsx`);
  };

  const handleClearFilters = () => {
    setPresetFilter('this_month');
    const dates = getPresetDates('this_month');
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
    setSearchQuery('');
    setContratanteFilter('all');
    setClientFilter('all');
    setPedidoFilter('all');
    setJobFunctionFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="p-3 max-w-[1700px] mx-auto space-y-3 pb-10">
      
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 px-4 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Controle de Contratações e Permanência
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Relatório de trabalhadores contratados via terceiras/fornecedores no período selecionado.
              </p>
            </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          
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

          {/* Contratante / Terceira */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Contratante / Terceira
            </label>
            <select
              value={contratanteFilter}
              onChange={(e) => setContratanteFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas as Terceiras</option>
              {reportData?.uniqueContratantes?.map(c => (
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
                <option key={p.id} value={p.id}>Pedido: {p.code}</option>
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Somente Ativos</option>
              <option value="inactive">Somente Desligados / Encerrados</option>
            </select>
          </div>

        </div>

        {/* Clear Filters Row */}
        {(presetFilter !== 'this_month' || searchQuery || contratanteFilter !== 'all' || clientFilter !== 'all' || pedidoFilter !== 'all' || jobFunctionFilter !== 'all' || statusFilter !== 'all') && (
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

      {/* KPI Cards Grid Compact - 7 Cards across header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        
        {/* Total Contratados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Total Contratados
            </span>
            <div className="p-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {reportData?.totalHired || 0} <span className="text-[10px] font-normal text-slate-500">no período</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Entradas registradas</p>
          </div>
        </div>

        {/* Ativos Atualmente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Ativos Atualmente
            </span>
            <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {reportData?.totalActive || 0} <span className="text-[10px] font-normal text-slate-500">trabalhando</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Alocações vigentes</p>
          </div>
        </div>

        {/* Desligados / Saíram */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Desligados / Saíram
            </span>
            <div className="p-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
              <UserMinus className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 leading-tight">
              {reportData?.totalInactive || 0} <span className="text-[10px] font-normal text-slate-500">encerrados</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Remanejados / baixa</p>
          </div>
        </div>

        {/* De Alta (Seguridade Social) */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              De Alta (Seguridade)
            </span>
            <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {reportData?.totalAlta || 0} <span className="text-[10px] font-normal text-slate-500">({(reportData?.pctAlta || 0).toFixed(1)}%)</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Alta na seguridade</p>
          </div>
        </div>

        {/* Em Regularização */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
              Em Regularização
            </span>
            <div className="p-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
              {reportData?.totalRegularizacao || 0} <span className="text-[10px] font-normal text-slate-500">({(reportData?.pctRegularizacao || 0).toFixed(1)}%)</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Processo / regularização</p>
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Taxa de Retenção
            </span>
            <div className="p-1 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400 leading-tight">
              {(reportData?.retentionRate || 0).toFixed(1)}%
            </div>
            <p className="text-[9px] text-slate-400 truncate">Permanência total</p>
          </div>
        </div>

        {/* Permanência Média */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Permanência Média
            </span>
            <div className="p-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">
              {reportData?.avgDaysWorked || 0} <span className="text-[10px] font-normal text-slate-500">dias</span>
            </div>
            <p className="text-[9px] text-slate-400 truncate">Média em atividade</p>
          </div>
        </div>

      </div>

      {/* Breakdown Charts Section Compact */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* Contratações por Função / Perfil */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <span>Contratações por Função / Perfil</span>
              </h2>
              <span className="text-[10px] text-slate-400">
                {reportData.functionBreakdown.length} perfis encontrados
              </span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {reportData.functionBreakdown.map((item) => {
                const percentage = reportData.totalHired > 0 ? (item.total / reportData.totalHired) * 100 : 0;
                return (
                  <div key={item.functionName} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                        {item.functionName}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {item.active} ativos ({item.total})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(item.active / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.active} ativos`}
                      />
                      <div 
                        className="bg-rose-400 h-full rounded-r-full transition-all duration-500" 
                        style={{ width: `${(item.inactive / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.inactive} inativos`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desempenho por Empresa Terceira / Fornecedor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <span>Desempenho por Empresa Terceira / Fornecedor</span>
              </h2>
              <span className="text-[10px] text-slate-400">
                {reportData.contratanteBreakdown.length} terceiras
              </span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {reportData.contratanteBreakdown.map((item) => {
                const retention = item.total > 0 ? (item.active / item.total) * 100 : 0;
                return (
                  <div key={item.contratante} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                        {item.contratante}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {item.total} contratados ({retention.toFixed(0)}% retenção)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                      <div 
                        className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(item.active / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.active} ativos`}
                      />
                      <div 
                        className="bg-rose-400 h-full rounded-r-full transition-all duration-500" 
                        style={{ width: `${(item.inactive / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.inactive} desligados`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Main Table Gallery Section Compact */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        
        {/* Table Header */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Relação Detalhada de Contratações
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              {sortedItems.length} registros
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-xs">Carregando relatório de contratações...</span>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhuma contratação encontrada no período.</p>
            <p className="text-[11px] text-slate-400">Tente alterar os filtros de data ou limpar os filtros de pesquisa.</p>
          </div>
        ) : (
          /* Isolated Scroll Container for Table Gallery Compact */
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <tr className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  
                  {/* Trabalhador Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('worker_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Trabalhador</span>
                      <SortIcon field="worker_name" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Empresa Terceira Column */}
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors select-none group"
                    onClick={() => handleSort('contratante')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Empresa Terceira</span>
                      <SortIcon field="contratante" currentField={sortField} direction={sortDirection} />
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

                  {/* Obs / Motivo Column */}
                  <th className="py-2.5 px-3">Obs / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Worker Name & Document */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white leading-snug">{item.worker_name}</div>
                      <div className="text-[10px] text-slate-400">Doc: {item.worker_document}</div>
                    </td>

                    {/* Contratante / Terceira */}
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-block text-[11px]">
                        {item.contratante}
                      </span>
                    </td>

                    {/* Client & Order Code */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.client_name}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                        Pedido: {item.pedido_codigo}
                      </div>
                    </td>

                    {/* Job Function */}
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">{item.job_function_name}</span>
                    </td>

                    {/* Agreed Rate */}
                    <td className="py-2.5 px-3">
                      {item.tarifa_acordada !== null ? (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          €{item.tarifa_acordada.toFixed(2)}/h
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Start Date */}
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                      {formatDateBR(item.start_date)}
                    </td>

                    {/* End Date */}
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDateBR(item.end_date)}
                    </td>

                    {/* Days Worked Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                        item.is_active 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        <Clock className="h-2.5 w-2.5" />
                        {item.days_worked} dias
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ● Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                          ● Desligado
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
          </div>
        )}
      </div>

    </div>
  );
};
