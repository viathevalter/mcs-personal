import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePedidos } from './hooks/usePedidos';
import { PedidoKpiCards } from './components/PedidoKpiCards';
import { PedidosTable } from './components/PedidosTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Search, X, Filter } from 'lucide-react';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export function PedidosPage() {
  const { t } = useTranslation();
  const { empresas = [] } = useEmpresa();
  const [filters, setFilters] = useState({
    search: '',
    commercial_status: 'all',
    operational_status: 'all',
    client_id: 'all',
    empresa_id: 'all',
    team_filter: 'all',
  });

  const { data, isLoading } = usePedidos(filters);
  const { data: clients } = useClients();

  const empresaOptions = useMemo(() => {
    const operatingCompanies = empresas.filter(e => !e.is_holding && e.codigo !== 'GRP');
    return [
      { value: 'all', label: t('cockpit_pedidos.all_companies') },
      ...operatingCompanies.map(e => ({
        value: e.id,
        label: e.trade_name || e.nome,
      })),
    ];
  }, [empresas, t]);

  const clientOptions = useMemo(() => {
    const list = (clients || [])
      .filter(c => c.status !== 'inactive' || c.id === filters.client_id)
      .map(c => ({
        value: c.id || '',
        label: c.trade_name || c.legal_name || '',
      }))
      .filter(c => c.value && c.label);

    return [{ value: 'all', label: t('cockpit_pedidos.all_clients') }, ...list];
  }, [clients, filters.client_id, t]);

  const rawPedidos = data?.pedidos || [];
  const itemsMap = data?.itemsMap || {};
  const summaryMap = data?.summaryMap || {};

  // Client-side rich filtering (by code, client, site, city, profile, worker name/code, or accommodation)
  const filteredPedidos = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return rawPedidos.filter(pedido => {
      const sum = summaryMap[pedido.id];

      if (filters.team_filter !== 'all') {
        if (filters.team_filter === 'with_active_workers' && (!sum || sum.activeWorkersCount + sum.enteringWorkersCount === 0)) {
          return false;
        }
        if (filters.team_filter === 'with_movements' && (!sum || sum.enteringWorkersCount + sum.exitingWorkersCount + sum.exitedWorkersCount === 0)) {
          return false;
        }
        if (filters.team_filter === 'open_vacancies' && (!sum || sum.fulfilled >= sum.requested)) {
          return false;
        }
        if (filters.team_filter === 'housed' && (!sum || sum.housedWorkersCount === 0)) {
          return false;
        }
        if (filters.team_filter === 'pending_housing' && (!sum || sum.pendingHousingCount === 0)) {
          return false;
        }
      }

      if (!q) return true;

      const codeMatch = (pedido.codigo || '').toLowerCase().includes(q);
      const clientMatch =
        (pedido.client?.trade_name || '').toLowerCase().includes(q) ||
        (pedido.client?.legal_name || '').toLowerCase().includes(q);
      const siteMatch =
        (pedido.client_site?.name || '').toLowerCase().includes(q) ||
        (pedido.client_site?.city || '').toLowerCase().includes(q);
      const profileMatch = sum?.profiles.some(p => p.toLowerCase().includes(q)) || false;
      const workerMatch =
        sum?.workers.some(
          w =>
            w.nome.toLowerCase().includes(q) ||
            w.cod_colab.toLowerCase().includes(q) ||
            (w.nif || '').toLowerCase().includes(q) ||
            w.funcao.toLowerCase().includes(q)
        ) || false;
      const housingMatch =
        sum?.alojamentos.some(
          a =>
            a.nome.toLowerCase().includes(q) ||
            (a.codigo || '').toLowerCase().includes(q) ||
            (a.municipio || '').toLowerCase().includes(q)
        ) || false;

      return codeMatch || clientMatch || siteMatch || profileMatch || workerMatch || housingMatch;
    });
  }, [rawPedidos, summaryMap, filters.search, filters.team_filter]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.empresa_id !== 'all' ||
    filters.client_id !== 'all' ||
    filters.commercial_status !== 'all' ||
    filters.operational_status !== 'all' ||
    filters.team_filter !== 'all';

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden animate-fade-in">
      {/* Top Header - Fixed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('cockpit_pedidos.title')}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t('cockpit_pedidos.subtitle')} • Visualize vagas, entradas/saídas de trabalhadores e alojamentos em tempo real.
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() =>
              setFilters({
                search: '',
                commercial_status: 'all',
                operational_status: 'all',
                client_id: 'all',
                empresa_id: 'all',
                team_filter: 'all',
              })
            }
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpar Filtros ({filteredPedidos.length})
          </button>
        )}
      </div>

      {/* KPI Cards - Fixed */}
      <div className="shrink-0">
        <PedidoKpiCards pedidos={filteredPedidos} itemsMap={itemsMap} summaryMap={summaryMap} />
      </div>

      {/* Filter Bar - Fixed */}
      <div className="shrink-0 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
        <div className="space-y-1 sm:col-span-2 lg:col-span-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Search className="h-3 w-3" /> Buscar (Pedido, Cliente, Obra, Trabalhador ou Alojamento)
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: PED-2026, nome do trabalhador, cliente, obra ou alojamento..."
              className="pl-8 h-9 text-xs md:text-sm"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
            {filters.search && (
              <button
                onClick={() => setFilters(f => ({ ...f, search: '' }))}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('cockpit_pedidos.company_label')}
          </label>
          <Select value={filters.empresa_id} onValueChange={val => setFilters(f => ({ ...f, empresa_id: val }))}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t('cockpit_pedidos.all_companies')} />
            </SelectTrigger>
            <SelectContent>
              {empresaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('cockpit_pedidos.client_label')}
          </label>
          <Combobox
            options={clientOptions}
            value={filters.client_id === 'all' ? null : filters.client_id}
            onChange={val => setFilters(f => ({ ...f, client_id: val || 'all' }))}
            placeholder={t('cockpit_pedidos.all_clients')}
            emptyText="Nenhum cliente encontrado."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('cockpit_pedidos.status_operational_label')}
          </label>
          <Select
            value={filters.operational_status}
            onValueChange={val => setFilters(f => ({ ...f, operational_status: val }))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t('cockpit_pedidos.all_statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cockpit_pedidos.all_statuses')}</SelectItem>
              <SelectItem value="pending_operations">Pendente</SelectItem>
              <SelectItem value="partially_fulfilled">Parcialmente Atendido</SelectItem>
              <SelectItem value="fulfilled">Atendido</SelectItem>
              <SelectItem value="completed">Finalizado</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Filter className="h-3 w-3" /> Equipe & Logística
          </label>
          <Select value={filters.team_filter} onValueChange={val => setFilters(f => ({ ...f, team_filter: val }))}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Todos os pedidos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Pedidos</SelectItem>
              <SelectItem value="with_active_workers">Com Trabalhadores em Obra</SelectItem>
              <SelectItem value="with_movements">Com Entradas / Saídas / Bajas</SelectItem>
              <SelectItem value="open_vacancies">Com Vagas em Aberto</SelectItem>
              <SelectItem value="housed">Com Equipe Alojada</SelectItem>
              <SelectItem value="pending_housing">Com Alojamento Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable Gallery Container */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PedidosTable pedidos={filteredPedidos} summaryMap={summaryMap} isLoading={isLoading} />
      </div>
    </div>
  );
}
