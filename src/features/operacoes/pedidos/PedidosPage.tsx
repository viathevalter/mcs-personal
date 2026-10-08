import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePedidos } from './hooks/usePedidos';
import { PedidoKpiCards } from './components/PedidoKpiCards';
import { PedidosTable } from './components/PedidosTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Search } from 'lucide-react';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export function PedidosPage() {
  const { t } = useTranslation();
  const { empresas = [], isHolding } = useEmpresa();
  const [filters, setFilters] = useState({
    search: '',
    commercial_status: 'all',
    operational_status: 'all',
    client_id: 'all',
    empresa_id: 'all'
  });

  const { data, isLoading } = usePedidos(filters);
  const { data: clients } = useClients();

  const empresaOptions = useMemo(() => {
    const operatingCompanies = empresas.filter(e => !e.is_holding && e.codigo !== 'GRP');
    return [
      { value: 'all', label: t('cockpit_pedidos.all_companies') },
      ...operatingCompanies.map(e => ({
        value: e.id,
        label: e.trade_name || e.nome
      }))
    ];
  }, [empresas, t]);

  const clientOptions = useMemo(() => {
    const list = (clients || [])
      .map(c => ({
        value: c.id || '',
        label: c.trade_name || c.legal_name || ''
      }))
      .filter(c => c.value && c.label);

    return [
      { value: 'all', label: t('cockpit_pedidos.all_clients') },
      ...list
    ];
  }, [clients, t]);

  const pedidos = data?.pedidos || [];
  const itemsMap = data?.itemsMap || {};

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('cockpit_pedidos.title')}</h1>
          <p className="text-muted-foreground">{t('cockpit_pedidos.subtitle')}</p>
        </div>
      </div>

      <PedidoKpiCards pedidos={pedidos} itemsMap={itemsMap} />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground">{t('cockpit_pedidos.search_label')}</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('cockpit_pedidos.search_placeholder')}
              className="pl-8"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1 w-full md:w-52">
          <label className="text-xs font-medium text-muted-foreground">{t('cockpit_pedidos.company_label')}</label>
          <Select 
            value={filters.empresa_id} 
            onValueChange={(val) => setFilters(f => ({ ...f, empresa_id: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('cockpit_pedidos.all_companies')} />
            </SelectTrigger>
            <SelectContent>
              {empresaOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 w-full md:w-56">
          <label className="text-xs font-medium text-muted-foreground">{t('cockpit_pedidos.client_label')}</label>
          <Combobox
            options={clientOptions}
            value={filters.client_id === 'all' ? null : filters.client_id}
            onChange={(val) => setFilters(f => ({ ...f, client_id: val || 'all' }))}
            placeholder={t('cockpit_pedidos.all_clients')}
            emptyText="Nenhum cliente encontrado."
          />
        </div>

        <div className="space-y-1 w-full md:w-48">
          <label className="text-xs font-medium text-muted-foreground">{t('cockpit_pedidos.status_commercial_label')}</label>
          <Select 
            value={filters.commercial_status} 
            onValueChange={(val) => setFilters(f => ({ ...f, commercial_status: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('cockpit_pedidos.all_statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cockpit_pedidos.all_statuses')}</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="completed">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 w-full md:w-48">
          <label className="text-xs font-medium text-muted-foreground">{t('cockpit_pedidos.status_operational_label')}</label>
          <Select 
            value={filters.operational_status} 
            onValueChange={(val) => setFilters(f => ({ ...f, operational_status: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('cockpit_pedidos.all_statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cockpit_pedidos.all_statuses')}</SelectItem>
              <SelectItem value="pending_operations">Pendente</SelectItem>
              <SelectItem value="partially_fulfilled">Parcialmente Atendido</SelectItem>
              <SelectItem value="fulfilled">Atendido</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PedidosTable pedidos={pedidos} isLoading={isLoading} />
    </div>
  );
}
