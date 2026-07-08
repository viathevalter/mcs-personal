import { useState } from 'react';
import { useSolicitudes } from './hooks/useSolicitudes';
import { SolicitudesTable } from './components/SolicitudesTable';
import { SolicitudKpiCards } from './components/SolicitudKpiCards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, Filter, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SolicitudesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data: solicitudes = [], isLoading, refetch } = useSolicitudes({ 
    search, 
    tipo: activeTab === 'all' ? undefined : activeTab 
  });

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] lg:h-[calc(100vh-136px)] overflow-hidden space-y-4 md:space-y-6">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Torre de Controle Operacional</h1>
            <p className="text-muted-foreground">
              Acompanhe solicitações, tarefas e bloqueios operacionais em tempo real.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/95">
                  Nova Operação <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=replacement')} className="cursor-pointer">
                  Novo Reemplazo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=relocation')} className="cursor-pointer">
                  Nova Reubicación
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=technical_test')} className="cursor-pointer">
                  Nova Prueba
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=offboarding')} className="cursor-pointer">
                  Nova Baja
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_postponement')} className="cursor-pointer">
                  Novo Adiamento de Início
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_extension')} className="cursor-pointer">
                  Nova Prorrogação de Obra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/operacoes/solicitudes/nova?tipo=order_termination')} className="cursor-pointer">
                  Nova Finalização de Obra
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="shrink-0">
          <SolicitudKpiCards solicitudes={solicitudes} />
        </div>

        <div className="shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex h-10 p-1 bg-muted/60 dark:bg-muted/30 rounded-lg max-w-fit space-x-1">
              <TabsTrigger value="all" className="px-4 py-1.5 text-sm font-medium rounded-md">Todas</TabsTrigger>
              <TabsTrigger value="relocation" className="px-4 py-1.5 text-sm font-medium rounded-md">Realocações (Reubicación)</TabsTrigger>
              <TabsTrigger value="replacement" className="px-4 py-1.5 text-sm font-medium rounded-md">Substituições (Reemplazo)</TabsTrigger>
              <TabsTrigger value="technical_test" className="px-4 py-1.5 text-sm font-medium rounded-md">Pruebas (Testes Técnicos)</TabsTrigger>
              <TabsTrigger value="offboarding" className="px-4 py-1.5 text-sm font-medium rounded-md">Bajas (Desligamentos)</TabsTrigger>
              <TabsTrigger value="order_extension" className="px-4 py-1.5 text-sm font-medium rounded-md">Prorrogações</TabsTrigger>
              <TabsTrigger value="order_termination" className="px-4 py-1.5 text-sm font-medium rounded-md">Finalizações</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between space-x-2 shrink-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por código ou título..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-dashed">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <SolicitudesTable solicitudes={solicitudes} isLoading={isLoading} />
        </div>
      </div>
    </Layout>
  );
}
