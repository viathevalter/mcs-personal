import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSolicitudDetail } from './hooks/useSolicitudDetail';
import { useSolicitudTasks } from './hooks/useSolicitudTasks';
import { useSolicitudTimeline } from './hooks/useSolicitudTimeline';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Printer, Mail, UserPlus, CheckCircle2, CalendarClock, XCircle, Loader2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { SolicitudOverviewTab } from './components/SolicitudOverviewTab';
import { SolicitudTasksTab } from './components/SolicitudTasksTab';
import { SolicitudTimelineTab } from './components/SolicitudTimelineTab';
import { SolicitudTargetsTab } from './components/SolicitudTargetsTab';
import { SolicitudStatusBadge } from './components/SolicitudStatusBadge';
import { SolicitudTypeBadge } from './components/SolicitudTypeBadge';
import { useSolicitudTargets } from './hooks/useSolicitudTargets';
import { printReplacementDoc } from './utils/printReplacement';
import { ResendNotificationModal } from './components/ResendNotificationModal';
import { RequestReplacementFromBajaModal } from './components/RequestReplacementFromBajaModal';
import { EditSolicitudModal } from './components/EditSolicitudModal';

export function SolicitudDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [emailDateContext, setEmailDateContext] = useState<{ oldDueDate?: string | null; newDueDate?: string | null }>({});
  const [isRequestReplacementOpen, setIsRequestReplacementOpen] = useState(false);
  const [isCancelReemplazoOpen, setIsCancelReemplazoOpen] = useState(false);
  const [cancelReemplazoReason, setCancelReemplazoReason] = useState('');
  const [isCancellingReemplazo, setIsCancellingReemplazo] = useState(false);

  const { data: solicitud, isLoading: loadingSolicitud, isError: errorSolicitud, refetch: refetchSolicitud } = useSolicitudDetail(id);
  const { data: tasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useSolicitudTasks(id);
  const { data: timeline = [], isLoading: loadingTimeline, refetch: refetchTimeline } = useSolicitudTimeline(id);
  const { data: targets = [], refetch: refetchTargets } = useSolicitudTargets(id);

  const handleRefresh = () => {
    refetchSolicitud();
    refetchTasks();
    refetchTimeline();
    refetchTargets();
  };

  const handleCancelReemplazo = async () => {
    if (!solicitud) return;
    setIsCancellingReemplazo(true);
    try {
      const { error } = await supabase
        .schema('core_operacoes')
        .rpc('cancelar_reemplazo', {
          payload: {
            solicitud_id: solicitud.id,
            reason: cancelReemplazoReason.trim() || 'Cliente desistiu da substituição'
          }
        });
      if (error) throw error;
      toast.success(`Reemplazo ${solicitud.codigo} cancelado com sucesso!`);
      setIsCancelReemplazoOpen(false);
      setCancelReemplazoReason('');
      handleRefresh();
    } catch (err: any) {
      console.error('Erro ao cancelar reemplazo:', err);
      toast.error(err.message || 'Erro ao cancelar reemplazo.');
    } finally {
      setIsCancellingReemplazo(false);
    }
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
    return <Layout><div className="p-8 text-center text-muted-foreground">{t('solicitud_detail.loading')}</div></Layout>;
  }

  if (errorSolicitud || !solicitud) {
    return (
      <Layout>
        <div className="p-8 flex flex-col items-center justify-center space-y-4">
          <p className="text-red-500 font-semibold">{t('solicitud_detail.not_found')}</p>
          <Button variant="outline" onClick={() => navigate('/operacoes/solicitudes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('solicitud_detail.back')}
          </Button>
        </div>
      </Layout>
    );
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
                {t('solicitud_detail.refresh')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 font-medium"
              >
                <CalendarClock className="h-4 w-4" />
                {t('solicitud_detail.edit_date_btn')}
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  setEmailDateContext({});
                  setIsResendModalOpen(true);
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 font-medium"
              >
                <Mail className="h-4 w-4" />
                {t('solicitud_detail.resend_email_btn')}
              </Button>
              {solicitud.tipo === 'replacement' && (
                <Button variant="default" size="sm" onClick={handlePrintPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5">
                  <Printer className="h-4 w-4" />
                  {t('solicitud_detail.print_pdf_btn')}
                </Button>
              )}
              {(solicitud.tipo === 'replacement' || (solicitud.tipo === 'offboarding' && targets.some((t: any) => t.requires_replacement))) &&
                solicitud.status !== 'cancelled' &&
                solicitud.status !== 'completed' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setCancelReemplazoReason('');
                    setIsCancelReemplazoOpen(true);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 font-semibold"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar Reemplazo
                </Button>
              )}
              {solicitud.tipo === 'offboarding' && targets.some((t: any) => !t.requires_replacement) && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setIsRequestReplacementOpen(true)} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 font-semibold"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('solicitud_detail.request_replacement')}
                </Button>
              )}
              {solicitud.tipo === 'offboarding' && targets.some((t: any) => t.requires_replacement) && (
                <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t('solicitud_detail.replacement_active')}
                </div>
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
              {t('solicitud_detail.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              {t('solicitud_detail.tabs.tasks')}
            </TabsTrigger>
            <TabsTrigger 
              value="targets"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              {t('solicitud_detail.tabs.targets')}
            </TabsTrigger>
            <TabsTrigger 
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              {t('solicitud_detail.tabs.timeline')}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <SolicitudOverviewTab solicitud={solicitud} onEditClick={() => setIsEditModalOpen(true)} />
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
        <EditSolicitudModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          solicitud={solicitud}
          onSuccess={(result) => {
            handleRefresh();
            if (result?.openEmailModal) {
              setEmailDateContext({
                oldDueDate: result.oldDueDate,
                newDueDate: result.newDueDate
              });
              setIsResendModalOpen(true);
            }
          }}
        />
      )}

      {solicitud && (
        <ResendNotificationModal
          isOpen={isResendModalOpen}
          onClose={() => setIsResendModalOpen(false)}
          solicitud={solicitud}
          previousDueDate={emailDateContext.oldDueDate}
          overrideDueDate={emailDateContext.newDueDate}
          onSuccess={handleRefresh}
        />
      )}

      {solicitud && targets.find((t: any) => t.action_type === 'offboard' && !t.requires_replacement) && (
        <RequestReplacementFromBajaModal
          isOpen={isRequestReplacementOpen}
          onClose={() => setIsRequestReplacementOpen(false)}
          solicitud={solicitud}
          target={targets.find((t: any) => t.action_type === 'offboard' && !t.requires_replacement)}
          onSuccess={handleRefresh}
        />
      )}

      {isCancelReemplazoOpen && solicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Cancelar Reemplazo ({solicitud.codigo})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Esta ação cancela o reemplazo, encerra as tarefas abertas e remove a pendência da Contratação Inicial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelReemplazoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Motivo do cancelamento
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Cliente desistiu da substituição', 'Pedido reduzido/cancelado', 'Substituição duplicada'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReemplazoReason(preset)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      cancelReemplazoReason === preset
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={cancelReemplazoReason}
                onChange={(e) => setCancelReemplazoReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCancellingReemplazo}
                onClick={() => setIsCancelReemplazoOpen(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isCancellingReemplazo}
                onClick={handleCancelReemplazo}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {isCancellingReemplazo ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

