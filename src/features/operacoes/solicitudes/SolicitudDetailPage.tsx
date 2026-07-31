import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSolicitudDetail } from './hooks/useSolicitudDetail';
import { useSolicitudTasks } from './hooks/useSolicitudTasks';
import { useSolicitudTimeline } from './hooks/useSolicitudTimeline';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Printer, Mail } from 'lucide-react';
import { SolicitudOverviewTab } from './components/SolicitudOverviewTab';
import { SolicitudTasksTab } from './components/SolicitudTasksTab';
import { SolicitudTimelineTab } from './components/SolicitudTimelineTab';
import { SolicitudTargetsTab } from './components/SolicitudTargetsTab';
import { SolicitudStatusBadge } from './components/SolicitudStatusBadge';
import { SolicitudTypeBadge } from './components/SolicitudTypeBadge';
import { useSolicitudTargets } from './hooks/useSolicitudTargets';
import { printReplacementDoc } from './utils/printReplacement';
import { ResendNotificationModal } from './components/ResendNotificationModal';

export function SolicitudDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const { data: solicitud, isLoading: loadingSolicitud, refetch: refetchSolicitud } = useSolicitudDetail(id);
  const { data: tasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useSolicitudTasks(id);
  const { data: timeline = [], isLoading: loadingTimeline, refetch: refetchTimeline } = useSolicitudTimeline(id);
  const { data: targets = [] } = useSolicitudTargets(id);

  const handleRefresh = () => {
    refetchSolicitud();
    refetchTasks();
    refetchTimeline();
  };

  const handlePrintPDF = () => {
    if (!solicitud) return;
    const firstTarget = targets[0];
    const clientName = solicitud.client?.trade_name || 
                       solicitud.client?.legal_name || 
                       solicitud.pedido?.client?.trade_name || 
                       solicitud.pedido?.client?.legal_name || 
                       firstTarget?.source_client?.trade_name || 
                       firstTarget?.source_client?.legal_name || 
                       'N/A';
                       
    const siteName = solicitud.client_site?.name || 
                     solicitud.pedido?.client_site?.name || 
                     firstTarget?.source_site?.name || 
                     'Local não definido';
                     
    const workerName = firstTarget?.source_worker?.nome || 'Não especificado';
    const workerCodColab = firstTarget?.source_worker?.cod_colab || null;
    const workerFuncion = firstTarget?.source_worker?.funcion || 'Trabalhador';
    const reason = firstTarget?.reason || solicitud.description || 'Substituição operacional';
    const notes = firstTarget?.notes || null;
    
    printReplacementDoc({
      codigo: solicitud.codigo,
      title: solicitud.title,
      created_at: solicitud.created_at,
      due_date: solicitud.due_date || null,
      clientName,
      siteName,
      workerName,
      workerCodColab,
      workerFuncion,
      reason,
      notes
    });
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
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsResendModalOpen(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 font-medium"
              >
                <Mail className="h-4 w-4" />
                Reenviar E-mail
              </Button>
              {solicitud.tipo === 'replacement' && (
                <Button variant="default" size="sm" onClick={handlePrintPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5">
                  <Printer className="h-4 w-4" />
                  Imprimir PDF
                </Button>
              )}
            </div>
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

      {solicitud && (
        <ResendNotificationModal
          isOpen={isResendModalOpen}
          onClose={() => setIsResendModalOpen(false)}
          solicitud={solicitud}
          onSuccess={handleRefresh}
        />
      )}
    </Layout>
  );
}

