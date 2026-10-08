import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSolicitudes } from './hooks/useSolicitudes';
import { SolicitudesTable } from './components/SolicitudesTable';
import { SolicitudKpiCards } from './components/SolicitudKpiCards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, Filter, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SolicitudesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { empresas = [], isHolding } = useEmpresa();
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data: solicitudes = [], isLoading, refetch } = useSolicitudes({ 
    search, 
    tipo: activeTab === 'all' ? undefined : activeTab,
    empresa_id: selectedEmpresaFilter === 'all' ? undefined : selectedEmpresaFilter
  });

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] lg:h-[calc(100vh-136px)] overflow-hidden space-y-4 md:space-y-6">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('torre_controle.title')}</h1>
            <p className="text-muted-foreground">
              {t('torre_controle.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/95">
                  {t('torre_controle.new_operation')} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=replacement')} className="cursor-pointer">
                  {t('torre_controle.operations.new_replacement')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=relocation')} className="cursor-pointer">
                  {t('torre_controle.operations.new_relocation')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=technical_test')} className="cursor-pointer">
                  {t('torre_controle.operations.new_technical_test')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=offboarding')} className="cursor-pointer">
                  {t('torre_controle.operations.new_offboarding')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_postponement')} className="cursor-pointer">
                  {t('torre_controle.operations.new_postponement')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_pause')} className="cursor-pointer text-amber-600 focus:text-amber-700 font-medium">
                  {t('torre_controle.operations.new_pause')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_extension')} className="cursor-pointer">
                  {t('torre_controle.operations.new_extension')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_termination')} className="cursor-pointer">
                  {t('torre_controle.operations.new_termination')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_cancellation')} className="cursor-pointer text-red-600 focus:text-red-700">
                  {t('torre_controle.operations.new_cancellation')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('torre_controle.refresh')}
            </Button>
          </div>
        </div>

        <div className="shrink-0">
          <SolicitudKpiCards solicitudes={solicitudes} />
        </div>

        <div className="shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex h-10 p-1 bg-muted/60 dark:bg-muted/30 rounded-lg max-w-fit space-x-1">
              <TabsTrigger value="all" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.all')}</TabsTrigger>
              <TabsTrigger value="relocation" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.relocation')}</TabsTrigger>
              <TabsTrigger value="replacement" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.replacement')}</TabsTrigger>
              <TabsTrigger value="technical_test" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.technical_test')}</TabsTrigger>
              <TabsTrigger value="offboarding" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.offboarding')}</TabsTrigger>
              <TabsTrigger value="order_pause" className="px-4 py-1.5 text-sm font-medium rounded-md text-amber-700 dark:text-amber-400">{t('torre_controle.tabs.order_pause')}</TabsTrigger>
              <TabsTrigger value="order_extension" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.order_extension')}</TabsTrigger>
              <TabsTrigger value="order_termination" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.order_termination')}</TabsTrigger>
              <TabsTrigger value="order_cancellation" className="px-4 py-1.5 text-sm font-medium rounded-md">{t('torre_controle.tabs.order_cancellation')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between space-x-2 shrink-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('torre_controle.filters.search_placeholder')}
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-52">
              <Select value={selectedEmpresaFilter} onValueChange={setSelectedEmpresaFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t('torre_controle.filters.all_empresas')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('torre_controle.filters.all_empresas')}</SelectItem>
                  {empresas.filter(e => !e.is_holding && e.codigo !== 'GRP').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.trade_name || e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <SolicitudesTable solicitudes={solicitudes} isLoading={isLoading} activeTab={activeTab} />
        </div>
      </div>
    </Layout>
  );
}
