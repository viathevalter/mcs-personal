import { Building2, MapPin, Truck, Briefcase, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral dos cadastros base do sistema Mastercorp.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Clientes
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingClients ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{clients.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              Empresas cadastradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Obras / Locais
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSites ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{sites.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              Locais de operação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fornecedores
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSuppliers ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{suppliers.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              Parceiros de negócio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Funções
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingFunctions ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{functions.length}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              Perfis profissionais
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4 border-emerald-100 dark:border-slate-800">
          <CardHeader className="bg-emerald-50/50 dark:bg-slate-900 border-b border-emerald-100 dark:border-slate-800 rounded-t-lg">
            <CardTitle className="text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Saúde da Base de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              O módulo de Master Data (Registro General) é o coração da parametrização do ecossistema Mastercorp. 
              Mantenha os cadastros atualizados para garantir o bom funcionamento dos módulos operacionais.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Catálogo de EPIs</span>
                  <span className="text-xs text-muted-foreground">{epis.length} itens disponíveis para atribuição</span>
                </div>
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50" onClick={() => navigate('/master-data/epis')}>
                  Gerenciar
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-amber-200">
          <CardHeader className="bg-amber-50 border-b border-amber-200 rounded-t-lg">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!loadingClients && !loadingSites && (
              <div className="space-y-3">
                {clientsWithoutSites.length > 0 ? (
                  <div className="text-sm bg-white border border-amber-200 p-3 rounded-md flex flex-col gap-2">
                    <div className="font-medium text-amber-800 flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                      Clientes sem obras vinculadas ({clientsWithoutSites.length})
                    </div>
                    <div className="text-slate-600 text-xs">
                      Clientes ativos não poderão alocar trabalhadores sem pelo menos uma obra/local cadastrado.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 p-3 rounded-md flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Todos os clientes possuem obras.
                  </div>
                )}
                
                {functions.length > 0 && (
                  <div className="text-sm bg-white border border-slate-200 p-3 rounded-md flex flex-col gap-2">
                    <div className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-slate-300"></span>
                      Auditoria de Perfis
                    </div>
                    <div className="text-slate-600 text-xs">
                      Revise os perfis profissionais periodicamente para garantir que as Tarifas de Venda e EPIs obrigatórios estão atualizados.
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
