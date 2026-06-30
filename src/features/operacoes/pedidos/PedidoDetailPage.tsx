import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePedidoDetail } from './hooks/usePedidoDetail';
import { usePedidoSolicitudes } from './hooks/usePedidoSolicitudes';
import { usePedidoTasks } from './hooks/usePedidoTasks';
import { usePedidoTimeline } from './hooks/usePedidoTimeline';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, ArrowRightLeft, FileCheck, UserMinus } from 'lucide-react';
import { PedidoStatusBadge } from './components/PedidoStatusBadge';

import { PedidoOverviewTab } from './components/tabs/PedidoOverviewTab';
import { PedidoItemsTab } from './components/tabs/PedidoItemsTab';
import { PedidoSolicitudesTab } from './components/tabs/PedidoSolicitudesTab';
import { PedidoTasksTab } from './components/tabs/PedidoTasksTab';
import { PedidoTimelineTab } from './components/tabs/PedidoTimelineTab';
import { PedidoFinanceiroTab } from './components/tabs/PedidoFinanceiroTab';
import { PedidoDocumentosTab } from './components/tabs/PedidoDocumentosTab';
import { usePedidoFinanceAccess } from './hooks/usePedidoFinanceAccess';

export function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  const { data, isLoading: isLoadingPedido, error } = usePedidoDetail(id);
  const pedido = data?.pedido;
  const items = data?.items || [];

  const { data: solicitudes = [], isLoading: isLoadingSolicitudes } = usePedidoSolicitudes(id);
  const solicitudIds = solicitudes.map(s => s.id);

  const { 
    data: tasks = [], 
    isLoading: isLoadingTasks, 
    iniciarTarefa, 
    concluirTarefa,
    isIniciando,
    isConcluindo
  } = usePedidoTasks(solicitudIds);

  const { data: events = [], isLoading: isLoadingTimeline } = usePedidoTimeline(id, solicitudIds);

  if (isLoadingPedido) {
    return <div className="flex items-center justify-center h-full">Carregando detalhes do pedido...</div>;
  }

  if (error || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div className="text-xl text-muted-foreground">Pedido não encontrado.</div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md max-w-2xl text-sm break-all">
            <strong>Erro:</strong> {error instanceof Error ? error.message : JSON.stringify(error)}
          </div>
        )}
        <Button variant="outline" onClick={() => navigate('/operacoes/pedidos')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in p-6 max-w-7xl mx-auto w-full">
      {/* Header Actions */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/operacoes/pedidos')}
          className="mr-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{pedido.codigo}</h1>
            <PedidoStatusBadge type="commercial" status={pedido.commercial_status} />
            <PedidoStatusBadge type="operational" status={pedido.operational_status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cockpit 360 - {pedido.client?.trade_name || pedido.client?.legal_name}
          </p>
        </div>
        
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            className="hidden lg:flex" 
            onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=replacement&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Reemplazo
          </Button>
          <Button 
            variant="outline" 
            className="hidden xl:flex"
            onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=relocation&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Reubicación
          </Button>
          <Button 
            variant="outline" 
            className="hidden xl:flex"
            onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=technical_test&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)}
          >
            <FileCheck className="mr-2 h-4 w-4" /> Prueba
          </Button>
          <Button 
            variant="outline" 
            className="hidden lg:flex text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=offboarding&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)}
          >
            <UserMinus className="mr-2 h-4 w-4" /> Baja
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 space-x-6">
          <TabsTrigger 
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3"
          >
            Itens / Vagas
          </TabsTrigger>
          <TabsTrigger 
            value="solicitudes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3 flex items-center gap-2"
          >
            Solicitudes GSO
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full">
              {solicitudes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3 flex items-center gap-2"
          >
            Tarefas
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full">
              {tasks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="timeline"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3"
          >
            Timeline
          </TabsTrigger>
          {hasFinanceAccess && (
            <TabsTrigger 
              value="finance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3"
            >
              Financeiro
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="docs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-3"
          >
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="focus-visible:outline-none">
          <PedidoOverviewTab pedido={pedido} />
        </TabsContent>
        
        <TabsContent value="items" className="focus-visible:outline-none">
          <PedidoItemsTab items={items} />
        </TabsContent>
        
        <TabsContent value="solicitudes" className="focus-visible:outline-none">
          <PedidoSolicitudesTab solicitudes={solicitudes} isLoading={isLoadingSolicitudes} />
        </TabsContent>
        
        <TabsContent value="tasks" className="focus-visible:outline-none">
          <PedidoTasksTab 
            tasks={tasks} 
            isLoading={isLoadingTasks} 
            onStartTask={iniciarTarefa}
            onCompleteTask={concluirTarefa}
            isStarting={isIniciando}
            isCompleting={isConcluindo}
          />
        </TabsContent>
        
        <TabsContent value="timeline" className="focus-visible:outline-none">
          <PedidoTimelineTab events={events} isLoading={isLoadingTimeline} />
        </TabsContent>

        {hasFinanceAccess && (
          <TabsContent value="finance" className="focus-visible:outline-none">
            <PedidoFinanceiroTab pedido={pedido} items={items} />
          </TabsContent>
        )}

        <TabsContent value="docs" className="focus-visible:outline-none">
          <PedidoDocumentosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
