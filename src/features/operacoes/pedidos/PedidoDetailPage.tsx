import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePedidoDetail } from './hooks/usePedidoDetail';
import { usePedidoSolicitudes } from './hooks/usePedidoSolicitudes';
import { usePedidoTasks } from './hooks/usePedidoTasks';
import { usePedidoTimeline } from './hooks/usePedidoTimeline';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  UserPlus,
  ArrowRightLeft,
  FileCheck,
  UserMinus,
  Pencil,
  Loader2,
  Mail,
  XCircle,
  PauseCircle,
  PlayCircle,
  Users,
  Home,
  Briefcase,
  Calendar,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react';
import { PedidoStatusBadge } from './components/PedidoStatusBadge';
import { ResendPedidoNotificationModal } from './components/ResendPedidoNotificationModal';
import { ReanudarPedidoModal } from './components/ReanudarPedidoModal';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';

import { PedidoOverviewTab } from './components/tabs/PedidoOverviewTab';
import { PedidoWorkersTab } from './components/tabs/PedidoWorkersTab';
import { PedidoItemsTab } from './components/tabs/PedidoItemsTab';
import { PedidoSolicitudesTab } from './components/tabs/PedidoSolicitudesTab';
import { PedidoTasksTab } from './components/tabs/PedidoTasksTab';
import { PedidoTimelineTab } from './components/tabs/PedidoTimelineTab';
import { PedidoFinanceiroTab } from './components/tabs/PedidoFinanceiroTab';
import { PedidoDocumentosTab } from './components/tabs/PedidoDocumentosTab';
import { usePedidoFinanceAccess } from './hooks/usePedidoFinanceAccess';

function formatSafeDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

export function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { hasFinanceAccess } = usePedidoFinanceAccess();
  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingPedido, error } = usePedidoDetail(id);
  const pedido = data?.pedido;
  const items = data?.items || [];
  const summary = data?.summary || {
    requested: 0,
    fulfilled: 0,
    profiles: [],
    includesHousing: false,
    activeWorkersCount: 0,
    enteringWorkersCount: 0,
    exitingWorkersCount: 0,
    exitedWorkersCount: 0,
    housedWorkersCount: 0,
    pendingHousingCount: 0,
    alojamentos: [],
    workers: [],
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [isReanudarModalOpen, setIsReanudarModalOpen] = useState(false);

  const handleOpenEdit = () => {
    setEditStartDate(pedido?.expected_start_date || '');
    setEditEndDate(pedido?.expected_end_date || '');
    setEditNotes(pedido?.notes || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      const { error: updateError } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .update({
          expected_start_date: editStartDate || null,
          expected_end_date: editEndDate || null,
          notes: editNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Pedido atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedido', id] });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar pedido:', err);
      toast.error('Erro ao atualizar pedido: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const { data: solicitudes = [], isLoading: isLoadingSolicitudes } = usePedidoSolicitudes(id);
  const solicitudIds = solicitudes.map(s => s.id);

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    iniciarTarefa,
    concluirTarefa,
    isIniciando,
    isConcluindo,
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

  const fulfillmentPct =
    summary.requested > 0 ? Math.min(100, Math.round((summary.fulfilled / summary.requested) * 100)) : 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-fade-in gap-3">
      {/* 1. FIXED TOP HEADER */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={() => navigate('/operacoes/pedidos')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors shrink-0"
              title="Voltar para a Galeria de Pedidos"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {pedido.codigo}
                </h1>
                {pedido.empresa && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {pedido.empresa.trade_name || pedido.empresa.nome}
                  </span>
                )}
                <PedidoStatusBadge type="commercial" status={pedido.commercial_status} />
                <PedidoStatusBadge type="operational" status={pedido.operational_status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {pedido.client?.trade_name || pedido.client?.legal_name || 'Cliente'}
                </span>
                {pedido.client_site?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {pedido.client_site.name}
                    {pedido.client_site.city ? ` (${pedido.client_site.city})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {pedido.operational_status === 'paused' ? (
              <Button
                size="sm"
                onClick={() => setIsReanudarModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs h-8 text-xs"
              >
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Reanudar Pedido / Nova Data
              </Button>
            ) : (
              pedido.commercial_status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=order_pause&pedido_id=${pedido.id}`)}
                  className="border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold h-8 text-xs"
                >
                  <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> Pausar
                </Button>
              )
            )}
            {pedido.commercial_status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=order_cancellation&pedido_id=${pedido.id}`)}
                className="border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold h-8 text-xs"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancelar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenEdit}
              className="border-blue-300 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold h-8 text-xs"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsResendModalOpen(true)}
              className="border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold h-8 text-xs"
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Notificar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() =>
                navigate(`/operacoes/solicitudes/nova?tipo=replacement&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)
              }
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Reemplazo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() =>
                navigate(`/operacoes/solicitudes/nova?tipo=relocation&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)
              }
            >
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Reubicación
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() =>
                navigate(`/operacoes/solicitudes/nova?tipo=technical_test&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)
              }
            >
              <FileCheck className="mr-1.5 h-3.5 w-3.5" /> Prueba
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() =>
                navigate(`/operacoes/solicitudes/nova?tipo=offboarding&client_id=${pedido.client_id}&site_id=${pedido.client_site_id}`)
              }
            >
              <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Baja
            </Button>
          </div>
        </div>

        {/* Executive KPI Strip inside Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          {/* Card 1: Lotação de Vagas */}
          <div
            onClick={() => setActiveTab('items')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-blue-500" /> Vagas Preenchidas
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {summary.fulfilled} / {summary.requested}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">({fulfillmentPct}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                  style={{ width: `${fulfillmentPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Movimentação da Equipe (Entrando & Saindo) */}
          <div
            onClick={() => setActiveTab('workers')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-emerald-300 transition-colors"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3 text-emerald-500" /> Equipe (Entrando / Saindo)
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <ArrowUpRight className="h-3 w-3" /> {summary.activeWorkersCount + summary.enteringWorkersCount} em obra
                </span>
                {(summary.exitingWorkersCount > 0 || summary.exitedWorkersCount > 0) && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                    <ArrowDownRight className="h-3 w-3" /> {summary.exitingWorkersCount + summary.exitedWorkersCount} saída
                    {summary.exitingWorkersCount + summary.exitedWorkersCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Alojamentos & Logística */}
          <div
            onClick={() => setActiveTab('workers')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Home className="h-3 w-3 text-indigo-500" /> Alojamento da Equipe
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.housedWorkersCount} alojado{summary.housedWorkersCount !== 1 ? 's' : ''}
                </span>
                {summary.pendingHousingCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> {summary.pendingHousingCount} pendente{summary.pendingHousingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {summary.alojamentos.length > 0 && (
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {summary.alojamentos.map(a => a.codigo || a.nome).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Período & Financeiro */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" /> Período {hasFinanceAccess && '& Receita'}
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                {formatSafeDate(pedido.expected_start_date)} → {formatSafeDate(pedido.expected_end_date)}
              </div>
              {hasFinanceAccess && (
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(pedido.total_revenue_snapshot || 0)}{' '}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({pedido.margin_percent_snapshot || 0}% margem)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Pedido Pausado */}
      {pedido.operational_status === 'paused' && (
        <div className="shrink-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <PauseCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">Este pedido está temporariamente PAUSADO</h3>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                Novas contratações e altas na Seguridade Social estão suspensas aguardando definição da nova data de início pelo cliente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsReanudarModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0 shadow-xs h-8 text-xs"
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Reanudar Pedido Agora
          </Button>
        </div>
      )}

      {/* 2. TABS BAR (FIXED) + SCROLLABLE CONTENT AREA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 w-full justify-start overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl h-auto px-3 py-0 space-x-4 shadow-2xs">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold"
          >
            Visão Geral 360
          </TabsTrigger>
          <TabsTrigger
            value="workers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-1.5"
          >
            Equipe & Alojamento
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] py-0.2 px-1.5 rounded-full font-bold">
              {summary.workers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="items"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-1.5"
          >
            Itens / Vagas
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] py-0.2 px-1.5 rounded-full">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="solicitudes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-1.5"
          >
            Solicitudes GSO
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] py-0.2 px-1.5 rounded-full">
              {solicitudes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-1.5"
          >
            Tarefas
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] py-0.2 px-1.5 rounded-full">
              {tasks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold"
          >
            Timeline
          </TabsTrigger>
          {hasFinanceAccess && (
            <TabsTrigger
              value="finance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold"
            >
              Financeiro
            </TabsTrigger>
          )}
          <TabsTrigger
            value="docs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-2 py-2.5 text-xs md:text-sm font-semibold"
          >
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Tab Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-6">
          <TabsContent value="overview" className="focus-visible:outline-none mt-0">
            <PedidoOverviewTab pedido={pedido} items={items} summary={summary} />
          </TabsContent>

          <TabsContent value="workers" className="focus-visible:outline-none mt-4">
            <PedidoWorkersTab pedido={pedido} summary={summary} />
          </TabsContent>

          <TabsContent value="items" className="focus-visible:outline-none mt-0">
            <PedidoItemsTab items={items} pedido={pedido} summary={summary} />
          </TabsContent>

          <TabsContent value="solicitudes" className="focus-visible:outline-none mt-0">
            <PedidoSolicitudesTab solicitudes={solicitudes} isLoading={isLoadingSolicitudes} />
          </TabsContent>

          <TabsContent value="tasks" className="focus-visible:outline-none mt-0">
            <PedidoTasksTab
              tasks={tasks}
              isLoading={isLoadingTasks}
              onStartTask={iniciarTarefa}
              onCompleteTask={concluirTarefa}
              isStarting={isIniciando}
              isCompleting={isConcluindo}
            />
          </TabsContent>

          <TabsContent value="timeline" className="focus-visible:outline-none mt-0">
            <PedidoTimelineTab events={events} isLoading={isLoadingTimeline} />
          </TabsContent>

          {hasFinanceAccess && (
            <TabsContent value="finance" className="focus-visible:outline-none mt-0">
              <PedidoFinanceiroTab pedido={pedido} items={items} />
            </TabsContent>
          )}

          <TabsContent value="docs" className="focus-visible:outline-none mt-0">
            <PedidoDocumentosTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Pedido Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Informações do Pedido</DialogTitle>
            <DialogDescription>Ajuste as datas previstas e observações gerais do pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Início Previsto</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={e => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">Fim Previsto</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={e => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações do Pedido</Label>
              <Textarea
                id="edit-notes"
                placeholder="Insira observações relevantes sobre o pedido..."
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pedido && (
        <ResendPedidoNotificationModal
          isOpen={isResendModalOpen}
          onClose={() => setIsResendModalOpen(false)}
          pedido={pedido}
        />
      )}

      {pedido && (
        <ReanudarPedidoModal
          isOpen={isReanudarModalOpen}
          onClose={() => setIsReanudarModalOpen(false)}
          pedido={pedido}
        />
      )}
    </div>
  );
}
