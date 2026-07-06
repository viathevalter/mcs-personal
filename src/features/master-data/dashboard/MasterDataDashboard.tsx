import { Building2, MapPin, Truck, Briefcase, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClients } from '../clients/hooks/useClients';
import { useClientSites } from '../client-sites/hooks/useClientSites';
import { useSuppliers } from '../suppliers/hooks/useSuppliers';
import { useJobFunctions } from '../job-functions/hooks/useJobFunctions';
import { useEpis } from '../epis/hooks/useEpis';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function MasterDataDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: sites = [], isLoading: loadingSites } = useClientSites();
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { data: functions = [], isLoading: loadingFunctions } = useJobFunctions();
  const { data: epis = [] } = useEpis();

  // Alertas operacionais
  const clientsWithoutSites = clients.filter(c => !sites.some(s => s.client_id === c.id));
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('masterData.dashboard.title', { defaultValue: 'Dashboard Geral' })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('masterData.dashboard.subtitle', { defaultValue: 'Visão geral dos cadastros base do sistema Mastercorp.' })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('masterData.dashboard.total_clients', { defaultValue: 'Total de Clientes' })}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingClients ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{clients.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {t('masterData.dashboard.clients_desc', { defaultValue: 'Empresas cadastradas' })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('masterData.sidebar.obras', { defaultValue: 'Obras / Locais' })}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSites ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{sites.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {t('masterData.dashboard.sites_desc', { defaultValue: 'Locais de operação' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('masterData.sidebar.fornecedores', { defaultValue: 'Fornecedores' })}
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSuppliers ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{suppliers.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {t('masterData.dashboard.suppliers_desc', { defaultValue: 'Parceiros de negócio' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('masterData.dashboard.functions', { defaultValue: 'Funções' })}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingFunctions ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{functions.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {t('masterData.sidebar.perfis', { defaultValue: 'Perfis profissionais' })}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4 border-emerald-100 dark:border-slate-800 dark:bg-slate-900/40">
          <CardHeader className="bg-emerald-50/50 dark:bg-slate-900/80 border-b border-emerald-100 dark:border-slate-800 rounded-t-lg">
            <CardTitle className="text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {t('masterData.dashboard.db_health', { defaultValue: 'Saúde da Base de Dados' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('masterData.dashboard.db_health_desc', { defaultValue: 'O módulo de Master Data (Registro General) é o coração da parametrização do ecossistema Mastercorp. Mantenha os cadastros atualizados para garantir o bom funcionamento dos módulos operacionais.' })}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border dark:border-slate-800 rounded-md">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-foreground dark:text-slate-200">
                    {t('masterData.sidebar.epis', { defaultValue: 'Catálogo de EPIs' })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('masterData.dashboard.epis_available', { defaultValue: '{{count}} itens disponíveis para atribuição', count: epis.length })}
                  </span>
                </div>
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300" onClick={() => navigate('/master-data/epis')}>
                  {t('masterData.dashboard.manage', { defaultValue: 'Gerenciar' })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-amber-200 dark:border-slate-800 dark:bg-slate-900/40">
          <CardHeader className="bg-amber-50 dark:bg-slate-900/80 border-b border-amber-200 dark:border-slate-800 rounded-t-lg">
            <CardTitle className="text-amber-800 dark:text-amber-450 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('masterData.dashboard.alerts', { defaultValue: 'Alertas Operacionais' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!loadingClients && !loadingSites && (
              <div className="space-y-3">
                {clientsWithoutSites.length > 0 ? (
                  <div className="text-sm bg-white dark:bg-slate-950 border border-amber-200 dark:border-slate-800/80 p-3 rounded-md flex flex-col gap-2">
                    <div className="font-medium text-amber-800 dark:text-amber-450 flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                      {t('masterData.dashboard.clients_no_sites', { defaultValue: 'Clientes sem obras vinculadas ({{count}})', count: clientsWithoutSites.length })}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs">
                      {t('masterData.dashboard.clients_no_sites_desc', { defaultValue: 'Clientes ativos não poderão alocar trabalhadores sem pelo menos uma obra/local cadastrado.' })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-md flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>{t('masterData.dashboard.all_good', { defaultValue: 'Todas as bases estão parametrizadas corretamente!' })}</span>
                  </div>
                )}
                
                {functions.length > 0 && (
                  <div className="text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col gap-2">
                    <div className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      {t('masterData.dashboard.profiles_audit', { defaultValue: 'Auditoria de Perfis' })}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs">
                      {t('masterData.dashboard.inspect_message', { defaultValue: 'Revise os perfis profissionais periodicamente para garantir que as Tarifas de Venda e EPIs obrigatórios estão atualizados.' })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
