import { useParams, useNavigate } from 'react-router-dom';
import { useSolicitudDetail } from './hooks/useSolicitudDetail';
import { useSolicitudTasks } from './hooks/useSolicitudTasks';
import { useSolicitudTimeline } from './hooks/useSolicitudTimeline';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { SolicitudOverviewTab } from './components/SolicitudOverviewTab';
import { SolicitudTasksTab } from './components/SolicitudTasksTab';
import { SolicitudTimelineTab } from './components/SolicitudTimelineTab';
import { SolicitudTargetsTab } from './components/SolicitudTargetsTab';
import { SolicitudStatusBadge } from './components/SolicitudStatusBadge';
import { SolicitudTypeBadge } from './components/SolicitudTypeBadge';

export function SolicitudDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: solicitud, isLoading: loadingSolicitud, refetch: refetchSolicitud } = useSolicitudDetail(id);
  const { data: tasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useSolicitudTasks(id);
  const { data: timeline = [], isLoading: loadingTimeline, refetch: refetchTimeline } = useSolicitudTimeline(id);

  const handleRefresh = () => {
    refetchSolicitud();
    refetchTasks();
    refetchTimeline();
  };

  if (loadingSolicitud) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Carregando detalhes...</div></Layout>;
  }

  if (!solicitud) {
    return <Layout><div className="p-8 text-center text-red-500">Solicitação não encontrada.</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/operacoes/solicitudes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight">{solicitud.codigo}</h1>
              <SolicitudStatusBadge status={solicitud.status} />
              <SolicitudTypeBadge tipo={solicitud.tipo} />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none pb-px h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Tarefas Operacionais
            </TabsTrigger>
            <TabsTrigger 
              value="targets"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Trabalhadores Afetados
            </TabsTrigger>
            <TabsTrigger 
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <SolicitudOverviewTab solicitud={solicitud} />
            </TabsContent>
            
            <TabsContent value="tasks">
              <SolicitudTasksTab solicitudId={solicitud.id} tasks={tasks} isLoading={loadingTasks} />
            </TabsContent>

            <TabsContent value="targets">
              <SolicitudTargetsTab solicitud={solicitud} />
            </TabsContent>

            <TabsContent value="timeline">
              <SolicitudTimelineTab timeline={timeline} isLoading={loadingTimeline} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
