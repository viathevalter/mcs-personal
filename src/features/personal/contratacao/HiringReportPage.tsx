import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Clock, 
  TrendingUp, 
  Download, 
  Search, 
  Calendar, 
  Building2, 
  Briefcase, 
  FileSpreadsheet, 
  RefreshCw,
  X
} from 'lucide-react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useHiringReport } from './hooks/useHiringReport';

// Helper to format date strings YYYY-MM-DD to DD/MM/YYYY
function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Preset date range helpers
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
    const past = new Date();
    past.setDate(now.getDate() - 90);
    return {
      startDate: formatYMD(past),
      endDate: formatYMD(now),
    };
  }

  if (preset === 'this_year') {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) };
  }

  // Default: All time or custom
  return { startDate: '', endDate: '' };
}

export const HiringReportPage: React.FC = () => {
  const { selectedEmpresaId } = useEmpresa();

  // Preset Selection
  const [presetFilter, setPresetFilter] = useState<string>('this_month');
  
  // Custom Date Range
  const initialPreset = getPresetDates('this_month');
  const [startDate, setStartDate] = useState<string>(initialPreset.startDate);
  const [endDate, setEndDate] = useState<string>(initialPreset.endDate);

  // Dropdown Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contratanteFilter, setContratanteFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [pedidoFilter, setPedidoFilter] = useState<string>('all');
  const [jobFunctionFilter, setJobFunctionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Handle preset change
  const handlePresetChange = (preset: string) => {
    setPresetFilter(preset);
    if (preset !== 'custom') {
      const dates = getPresetDates(preset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  // Fetch Report Data
  const { data: reportData, isLoading, refetch, isFetching } = useHiringReport({
    empresa_id: selectedEmpresaId,
    startDate,
    endDate,
    clientFilter,
    contratanteFilter,
    pedidoFilter,
    jobFunctionFilter,
    statusFilter,
  });

  // Local Worker Search Filtering
  const filteredItems = useMemo(() => {
    if (!reportData?.items) return [];
    if (!searchQuery.trim()) return reportData.items;

    const query = searchQuery.toLowerCase();
    return reportData.items.filter(item => 
      item.worker_name.toLowerCase().includes(query) ||
      item.worker_document.toLowerCase().includes(query) ||
      item.pedido_codigo.toLowerCase().includes(query) ||
      item.contratante.toLowerCase().includes(query)
    );
  }, [reportData?.items, searchQuery]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!filteredItems.length) return;

    const exportRows = filteredItems.map((item, index) => ({
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
      'Status': item.is_active ? 'Ativo' : 'Desligado / Substituído',
      'Status Alocação': item.status,
      'Tipo de Entrada': item.assignment_type || 'Nova Contratação',
      'Observações / Motivo': item.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratações');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Controle_Contratacoes_${startDate || 'Geral'}_a_${endDate || 'Hoje'}_${timestamp}.xlsx`);
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
    <div className="p-6 md:p-8 space-y-6 w-full animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl shadow-sm">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Controle de Contratações e Permanência
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Relatório de trabalhadores contratados via terceiras/fornecedores no período selecionado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!filteredItems.length}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Preset & Date Range Filter Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Período:</span>
            {[
              { id: 'this_month', label: 'Este Mês' },
              { id: 'last_month', label: 'Mês Anterior' },
              { id: 'last_90_days', label: 'Últimos 90 Dias' },
              { id: 'this_year', label: 'Ano Atual' },
              { id: 'custom', label: 'Personalizado' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  presetFilter === p.id 
                    ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500/50 font-semibold' 
                    : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setPresetFilter('custom');
                }}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setPresetFilter('custom');
                }}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs"
              />
            </div>
          </div>

        </div>

        {/* Detailed Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Worker Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Buscar Trabalhador</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou documento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Contratante / Fornecedor Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Contratante / Terceira</label>
            <select
              value={contratanteFilter}
              onChange={e => setContratanteFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todas as Terceiras</option>
              {reportData?.uniqueContratantes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Cliente Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Cliente</label>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos os Clientes</option>
              {reportData?.uniqueClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Pedido Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Pedido</label>
            <select
              value={pedidoFilter}
              onChange={e => setPedidoFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos os Pedidos</option>
              {reportData?.uniquePedidos.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
          </div>

          {/* Função / Perfil Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Função / Perfil</label>
            <select
              value={jobFunctionFilter}
              onChange={e => setJobFunctionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todas as Funções</option>
              {reportData?.uniqueFunctions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Somente Ativos</option>
              <option value="inactive">Somente Desligados/Substituídos</option>
            </select>
          </div>

        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || contratanteFilter !== 'all' || clientFilter !== 'all' || pedidoFilter !== 'all' || jobFunctionFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <X className="h-3.5 w-3.5" />
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Contratados */}
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contratados</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData?.totalHired || 0}</span>
            <span className="text-xs text-slate-500 font-normal">no período</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            Entradas via terceiras registradas
          </div>
        </div>

        {/* Ativos Atualmente */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ativos Atualmente</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{reportData?.totalActive || 0}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">trabalhando</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            Alocações vigentes no cliente
          </div>
        </div>

        {/* Desligados / Substituídos */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
            <UserMinus className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desligados / Saíram</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{reportData?.totalInactive || 0}</span>
            <span className="text-xs text-rose-600 dark:text-rose-500 font-medium">encerrados</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            Não adaptados ou remanejados
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div className="bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxa de Retenção</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-300">
              {reportData?.retentionRate ? reportData.retentionRate.toFixed(1) : 0}%
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            Permanência % dos contratados
          </div>
        </div>

        {/* Permanência Média */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permanência Média</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-300">{reportData?.avgDaysWorked || 0}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">dias</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            Tempo médio em atividade
          </div>
        </div>

      </div>

      {/* Function Breakdown & Contratantes Summary Cards */}
      {reportData && (reportData.functionBreakdown.length > 0 || reportData.contratanteBreakdown.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Funções / Perfis Contratados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-500" />
                Contratações por Função / Perfil
              </h3>
              <span className="text-xs text-slate-500">{reportData.functionBreakdown.length} perfis encontrados</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reportData.functionBreakdown.slice(0, 6).map((item) => {
                return (
                  <div key={item.functionName} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800 dark:text-slate-200">{item.functionName}</span>
                      <div className="flex gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400">{item.active} ativos</span>
                        {item.inactive > 0 && <span className="text-rose-600 dark:text-rose-400">{item.inactive} saíram</span>}
                        <span className="text-slate-500 font-bold">({item.total})</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all" 
                        style={{ width: `${(item.active / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.active} ativos`}
                      />
                      <div 
                        className="bg-rose-500 h-full transition-all" 
                        style={{ width: `${(item.inactive / (reportData.totalHired || 1)) * 100}%` }}
                        title={`${item.inactive} encerrados`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empresas Terceiras (Contratantes) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-500" />
                Desempenho por Empresa Terceira / Fornecedor
              </h3>
              <span className="text-xs text-slate-500">{reportData.contratanteBreakdown.length} terceiras</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reportData.contratanteBreakdown.slice(0, 6).map((item) => {
                const retRate = item.total > 0 ? ((item.active / item.total) * 100).toFixed(0) : '0';
                return (
                  <div key={item.contratante} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.contratante}</span>
                      <div className="flex gap-2">
                        <span className="text-slate-500">{item.total} contratados</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">({retRate}% retenção)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-cyan-500 h-full transition-all" 
                        style={{ width: `${(item.active / (item.total || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-rose-500/80 h-full transition-all" 
                        style={{ width: `${(item.inactive / (item.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Relação Detalhada de Contratações
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              {filteredItems.length} registros
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-sm">Carregando relatório de contratações...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Nenhuma contratação encontrada no período.</p>
            <p className="text-xs text-slate-400">Tente alterar os filtros de data ou limpar os filtros de pesquisa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Trabalhador</th>
                  <th className="py-3 px-4">Empresa Terceira</th>
                  <th className="py-3 px-4">Cliente / Pedido</th>
                  <th className="py-3 px-4">Função / Perfil</th>
                  <th className="py-3 px-4">Tarifa</th>
                  <th className="py-3 px-4">Início Trabalho</th>
                  <th className="py-3 px-4">Saída / Término</th>
                  <th className="py-3 px-4 text-center">Dias Trabalhados</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Obs / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Worker Name & Document */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.worker_name}</div>
                      <div className="text-[11px] text-slate-400">Doc: {item.worker_document}</div>
                    </td>

                    {/* Contratante / Terceira */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-block">
                        {item.contratante}
                      </span>
                    </td>

                    {/* Client & Order Code */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{item.client_name}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                        Pedido: {item.pedido_codigo}
                      </div>
                    </td>

                    {/* Job Function */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.job_function_name}</span>
                    </td>

                    {/* Agreed Rate */}
                    <td className="py-3 px-4">
                      {item.tarifa_acordada !== null ? (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          €{item.tarifa_acordada.toFixed(2)}/h
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Start Date */}
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {formatDateBR(item.start_date)}
                    </td>

                    {/* End Date */}
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {formatDateBR(item.end_date)}
                    </td>

                    {/* Days Worked Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                        item.is_active 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {item.days_worked} dias
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ● Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                          ● Desligado
                        </span>
                      )}
                    </td>

                    {/* Notes / Reason */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] max-w-[200px] truncate" title={item.notes || ''}>
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
