import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Landmark,
  Receipt,
  Users,
  Tv,
  Sliders,
  RefreshCw,
  Globe2,
  Building2,
  Calendar,
  FilterX,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  CheckSquare,
  Square,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useExecutiveBIData } from './hooks/useExecutiveBIData';
import {
  WALLBOARD_WIDGET_CATALOG,
  GlobalKpiStripWidget,
  ComercialFunnelWidget,
  ComercialVendedoresWidget,
  ComercialPaisesPerfisWidget,
  FinanceiroCobrancaStatusWidget,
  FinanceiroCashFlowClientesWidget,
  FaturamentoEvolucaoAnualWidget,
  FaturamentoMatrizClientesWidget,
  OperacionalContratacoesReemplazosWidget,
  OperacionalAppHorasRealtimeWidget,
  OperacionalClientesAlocacaoWidget,
  ComunicacaoWhatsappAppWidget,
  RenderWallboardWidget,
} from './components/BIWidgets';
import { DrillDownDrawer } from './components/DrillDownDrawer';
import type { BIFilters, BIVisionTab, DrillDownPayload, WallboardWidgetId } from './types';

const DEFAULT_PINNED_WIDGETS: WallboardWidgetId[] = [
  'kpi_global_strip',
  'comercial_funnel',
  'operacional_contratacoes_reemplazos',
  'faturamento_evolucao_anual',
  'financeiro_cashflow_clientes',
  'operacional_app_horas_realtime',
];

const STORAGE_KEY_WALLBOARD = 'mcs_bi_wallboard_widgets_v1';

const MONTH_OPTIONS = [
  { value: 'all', label: 'Ano Completo (12 Meses)' },
  { value: 1, label: '01 - Janeiro' },
  { value: 2, label: '02 - Fevereiro' },
  { value: 3, label: '03 - Março' },
  { value: 4, label: '04 - Abril' },
  { value: 5, label: '05 - Maio' },
  { value: 6, label: '06 - Junho' },
  { value: 7, label: '07 - Julho' },
  { value: 8, label: '08 - Agosto' },
  { value: 9, label: '09 - Setembro' },
  { value: 10, label: '10 - Outubro' },
  { value: 11, label: '11 - Novembro' },
  { value: 12, label: '12 - Dezembro' },
];

export const ExecutiveBIPage: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [activeTab, setActiveTab] = useState<BIVisionTab>('overview');
  const [filters, setFilters] = useState<BIFilters>({
    year: now.getFullYear(),
    month: 'all',
    compareWithPreviousMonth: true,
    country: 'all',
    empresa: 'all',
    vendedor: 'all',
    cliente: 'all',
  });

  // Widgets fixados no Painel / Projetor (Wallboard)
  const [pinnedWidgets, setPinnedWidgets] = useState<WallboardWidgetId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WALLBOARD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PINNED_WIDGETS;
  });

  const [showWidgetSelectorModal, setShowWidgetSelectorModal] = useState(false);

  // Estado Modo TV / Projetor Fullscreen & Carrossel Automático
  const [isTvMode, setIsTvMode] = useState(false);
  const [autoRotateCarousel, setAutoRotateCarousel] = useState(false);
  const [carouselIntervalSec, setCarouselIntervalSec] = useState(25);
  const [clockTime, setClockTime] = useState(new Date());

  // Estado Gaveta de Conferência / Auditoria (Drill-Down)
  const [drillDownPayload, setDrillDownPayload] = useState<DrillDownPayload | null>(null);

  const { data, isLoading, isFetching, refetch, lastRealtimeSync } = useExecutiveBIData(filters);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WALLBOARD, JSON.stringify(pinnedWidgets));
    } catch {
      // ignore
    }
  }, [pinnedWidgets]);

  // Relógio em Tempo Real (Madri / Espanha & Dubai / EAU)
  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotação automática de abas quando o Carrossel do Projetor estiver ativo
  useEffect(() => {
    if (!autoRotateCarousel) return;
    const sequence: BIVisionTab[] = ['wallboard', 'comercial', 'financeiro', 'faturamento', 'operacional'];
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        const idx = sequence.indexOf(prev);
        const nextIdx = (idx + 1) % sequence.length;
        return sequence[nextIdx];
      });
    }, carouselIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [autoRotateCarousel, carouselIntervalSec]);

  const handleTogglePin = (widgetId: WallboardWidgetId) => {
    setPinnedWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
    );
  };

  const applyWallboardPreset = (preset: 'expansao' | 'financeiro_horas' | 'completo') => {
    if (preset === 'expansao') {
      // Exatamente o exemplo citado pelo usuário: gráfico de contratação + parte comercial!
      setPinnedWidgets([
        'kpi_global_strip',
        'comercial_funnel',
        'operacional_contratacoes_reemplazos',
        'comercial_vendedores',
        'comercial_paises',
        'operacional_app_horas_realtime',
      ]);
    } else if (preset === 'financeiro_horas') {
      setPinnedWidgets([
        'kpi_global_strip',
        'faturamento_evolucao_anual',
        'financeiro_cobranca_status',
        'financeiro_cashflow_clientes',
        'faturamento_matriz_clientes',
      ]);
    } else {
      setPinnedWidgets(WALLBOARD_WIDGET_CATALOG.map((w) => w.id));
    }
    setActiveTab('wallboard');
  };

  const toggleFullscreenTv = () => {
    if (!isTvMode) {
      setIsTvMode(true);
      setActiveTab('wallboard');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsTvMode(false);
      setAutoRotateCarousel(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      year: now.getFullYear(),
      month: 'all',
      compareWithPreviousMonth: true,
      country: 'all',
      empresa: 'all',
      vendedor: 'all',
      cliente: 'all',
    });
  };

  const hasActiveFilters =
    filters.month !== 'all' ||
    filters.country !== 'all' ||
    filters.empresa !== 'all' ||
    filters.vendedor !== 'all' ||
    filters.cliente !== 'all';

  const spainTimeStr = clockTime.toLocaleTimeString('pt-BR', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dubaiTimeStr = clockTime.toLocaleTimeString('pt-BR', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra Superior Executiva */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isTvMode && (
              <button
                onClick={() => navigate('/hub')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Voltar para o Hub Principal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  MCS BI & Torre de Controle Executiva
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Online Realtime
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Inteligência Gerencial Integrada: Comercial • Financeiro • Faturamento & Horas • Operacional (RH & App)
              </p>
            </div>
          </div>

          {/* Relógios Multi-Sede (Espanha & Dubai) + Controles de Projeção */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span>🇪🇸 Sede Espanha:</span>
                <span className="font-mono font-bold text-white">{spainTimeStr}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span>🇦🇪 Sede Dubai:</span>
                <span className="font-mono font-bold text-amber-400">{dubaiTimeStr}</span>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title={`Última sincronização: ${lastRealtimeSync.toLocaleTimeString('pt-BR')}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={() => setShowWidgetSelectorModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurar Projetor ({pinnedWidgets.length})</span>
            </button>

            {isTvMode && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setAutoRotateCarousel((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    autoRotateCarousel
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {autoRotateCarousel ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{autoRotateCarousel ? 'Carrossel Ativo' : 'Rotação Auto'}</span>
                </button>
                <select
                  value={carouselIntervalSec}
                  onChange={(e) => setCarouselIntervalSec(Number(e.target.value))}
                  className="bg-slate-900 text-xs text-slate-200 rounded-lg px-2 py-1 border border-slate-700"
                >
                  <option value={15}>15s</option>
                  <option value={25}>25s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                </select>
              </div>
            )}

            <button
              onClick={toggleFullscreenTv}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                isTvMode
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              {isTvMode ? <Minimize2 className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
              <span>{isTvMode ? 'Sair do Modo TV' : 'Modo Projetor / TV'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação entre as Visões Gerenciais */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'overview', label: 'Visão 360° Diretoria', icon: BarChart3, color: 'text-emerald-400' },
              { id: 'comercial', label: '1. Comercial & Prospecção', icon: Briefcase, color: 'text-amber-400' },
              { id: 'financeiro', label: '2. Financeiro & Cobrança', icon: Landmark, color: 'text-blue-400' },
              { id: 'faturamento', label: '3. Faturamento & Horas', icon: Receipt, color: 'text-emerald-400' },
              { id: 'operacional', label: '4. Operacional (RH & App)', icon: Users, color: 'text-purple-400' },
              {
                id: 'wallboard',
                label: `Meu Painel / Projetor (${pinnedWidgets.length})`,
                icon: Tv,
                color: 'text-sky-400',
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as BIVisionTab)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Presets Rápidos para Montar Painel */}
          {!isTvMode && (
            <div className="hidden 2xl:flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-semibold mr-1">Combinar Visões:</span>
              <button
                onClick={() => applyWallboardPreset('expansao')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 font-semibold transition-colors"
              >
                Comercial + Contratação
              </button>
              <button
                onClick={() => applyWallboardPreset('financeiro_horas')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 font-semibold transition-colors"
              >
                Financeiro + Horas
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Barra Interativa de Filtros Dinâmicos ("Brincar com os Números") */}
      {!isTvMode && (
        <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 lg:px-8 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 items-end">
            {/* Ano */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Ano Base
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Ano {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Mês */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Mês / Período
              </label>
              <select
                value={filters.month}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    month: e.target.value === 'all' ? 'all' : Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={String(m.value)} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* País / Sede */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                País / Sede Global
              </label>
              <select
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">🌍 Todos os Países / Sedes</option>
                <option value="ES">🇪🇸 Espanha (Sede)</option>
                <option value="FR">🇫🇷 França</option>
                <option value="IT">🇮🇹 Itália</option>
                <option value="AE">🇦🇪 Dubai / Emirados Árabes</option>
                <option value="PT">🇵🇹 Portugal</option>
              </select>
            </div>

            {/* Empresa */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Empresa do Grupo
              </label>
              <select
                value={filters.empresa}
                onChange={(e) => setFilters((f) => ({ ...f, empresa: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">🏢 Todas as Empresas</option>
                {(data?.filterOptions.empresas || []).map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendedor / Comercial */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Vendedor / Comercial
              </label>
              <select
                value={filters.vendedor}
                onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">👤 Todos os Vendedores</option>
                {(data?.filterOptions.vendedores || []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Cliente Específico
              </label>
              <select
                value={filters.cliente}
                onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">🤝 Todos os Clientes</option>
                {(data?.filterOptions.clientes || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            <div>
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  hasActiveFilters
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 cursor-pointer'
                    : 'bg-slate-900/40 text-slate-600 border-slate-800/60 cursor-not-allowed'
                }`}
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Conteúdo Principal do Painel */}
      <main className="flex-1 p-4 lg:p-8 max-w-[1920px] w-full mx-auto space-y-6">
        {isLoading || !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-12">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : (
          <>
            {/* ABA 1: VISÃO 360° DIRETORIA */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <GlobalKpiStripWidget
                  commercial={data.commercial}
                  financial={data.financial}
                  billingHours={data.billingHours}
                  operational={data.operational}
                  monthlyEvolution={data.monthlyEvolution}
                  pinnedWidgets={pinnedWidgets}
                  onTogglePin={handleTogglePin}
                  onDrillDown={setDrillDownPayload}
                  isTvMode={isTvMode}
                />

                <FaturamentoEvolucaoAnualWidget
                  commercial={data.commercial}
                  financial={data.financial}
                  billingHours={data.billingHours}
                  operational={data.operational}
                  monthlyEvolution={data.monthlyEvolution}
                  pinnedWidgets={pinnedWidgets}
                  onTogglePin={handleTogglePin}
                  onDrillDown={setDrillDownPayload}
                  isTvMode={isTvMode}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ComercialFunnelWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <OperacionalContratacoesReemplazosWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <FinanceiroCobrancaStatusWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <OperacionalAppHorasRealtimeWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                </div>
              </div>
            )}

            {/* ABA 2: VISÃO COMERCIAL */}
            {activeTab === 'comercial' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ComercialFunnelWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <ComercialPaisesPerfisWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                </div>
                <ComercialVendedoresWidget
                  commercial={data.commercial}
                  financial={data.financial}
                  billingHours={data.billingHours}
                  operational={data.operational}
                  monthlyEvolution={data.monthlyEvolution}
                  pinnedWidgets={pinnedWidgets}
                  onTogglePin={handleTogglePin}
                  onDrillDown={setDrillDownPayload}
                  isTvMode={isTvMode}
                />
              </div>
            )}

            {/* ABA 3: VISÃO FINANCEIRA */}
            {activeTab === 'financeiro' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FinanceiroCobrancaStatusWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <FinanceiroCashFlowClientesWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                </div>
              </div>
            )}

            {/* ABA 4: VISÃO FATURAMENTO & HORAS */}
            {activeTab === 'faturamento' && (
              <div className="space-y-6">
                <FaturamentoEvolucaoAnualWidget
                  commercial={data.commercial}
                  financial={data.financial}
                  billingHours={data.billingHours}
                  operational={data.operational}
                  monthlyEvolution={data.monthlyEvolution}
                  pinnedWidgets={pinnedWidgets}
                  onTogglePin={handleTogglePin}
                  onDrillDown={setDrillDownPayload}
                  isTvMode={isTvMode}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FaturamentoMatrizClientesWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <OperacionalAppHorasRealtimeWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                </div>
              </div>
            )}

            {/* ABA 5: VISÃO OPERACIONAL (RH & APP) */}
            {activeTab === 'operacional' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <OperacionalContratacoesReemplazosWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <OperacionalAppHorasRealtimeWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <OperacionalClientesAlocacaoWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                  <ComunicacaoWhatsappAppWidget
                    commercial={data.commercial}
                    financial={data.financial}
                    billingHours={data.billingHours}
                    operational={data.operational}
                    monthlyEvolution={data.monthlyEvolution}
                    pinnedWidgets={pinnedWidgets}
                    onTogglePin={handleTogglePin}
                    onDrillDown={setDrillDownPayload}
                    isTvMode={isTvMode}
                  />
                </div>
              </div>
            )}

            {/* ABA 6: MEU PAINEL / PROJETOR CUSTOMIZADO (WALLBOARD) */}
            {activeTab === 'wallboard' && (
              <div className="space-y-6">
                {!isTvMode && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-slate-900 to-emerald-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Painel Customizado para Monitor / Projetor em Tempo Real
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Você selecionou {pinnedWidgets.length} blocos visuais. Combine gráficos de Contratação + Comercial + Financeiro + Horas como desejar.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => applyWallboardPreset('expansao')}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700"
                      >
                        Preset: Comercial + Contratação
                      </button>
                      <button
                        onClick={() => setShowWidgetSelectorModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white"
                      >
                        Escolher Gráficos
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pinnedWidgets.map((wId) => {
                    const def = WALLBOARD_WIDGET_CATALOG.find((d) => d.id === wId);
                    const isFull = def?.size === 'full';
                    return (
                      <div key={wId} className={isFull ? 'lg:col-span-2' : 'col-span-1'}>
                        <RenderWallboardWidget
                          widgetId={wId}
                          commercial={data.commercial}
                          financial={data.financial}
                          billingHours={data.billingHours}
                          operational={data.operational}
                          monthlyEvolution={data.monthlyEvolution}
                          pinnedWidgets={pinnedWidgets}
                          onTogglePin={handleTogglePin}
                          onDrillDown={setDrillDownPayload}
                          isTvMode={isTvMode}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Configurador do Painel / Projetor */}
      {showWidgetSelectorModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWidgetSelectorModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  Montar Painel do Projetor / Monitor (Wallboard)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Marque quais visões você quer exibir juntas no seu painel customizado em tempo real
                </p>
              </div>
              <button
                onClick={() => setShowWidgetSelectorModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyWallboardPreset('expansao')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold"
              >
                🔥 Preset: Comercial + Contratação & App
              </button>
              <button
                onClick={() => applyWallboardPreset('financeiro_horas')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
              >
                💶 Preset: Financeiro + Faturamento & Horas
              </button>
              <button
                onClick={() => applyWallboardPreset('completo')}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold"
              >
                📊 Selecionar Todos (12 Blocos)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {WALLBOARD_WIDGET_CATALOG.map((w) => {
                const checked = pinnedWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => handleTogglePin(w.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      checked
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{w.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{w.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowWidgetSelectorModal(false);
                  setActiveTab('wallboard');
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider"
              >
                Ver Painel Montado ({pinnedWidgets.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gaveta de Conferência & Auditoria (Drill-Down) */}
      <DrillDownDrawer payload={drillDownPayload} onClose={() => setDrillDownPayload(null)} />
    </div>
  );
};
