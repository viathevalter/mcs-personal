import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  PhoneCall, 
  Play, 
  Pause, 
  Trash2, 
  Eye, 
  Plus, 
  Search, 
  Layers, 
  Loader2,
  User,
  CheckCircle2,
  Globe2,
  CalendarDays,
  ListFilter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useDialerCampaigns, useDialerQueue, useAllDialerQueueItems, useMutateDialer } from './hooks/useDialer';
import { useCommercialScope, getCommercialProfileByUser } from './hooks/useLeads';
import { useComercialLanguage } from './utils/comercialI18n';
import { toast } from 'sonner';
import type { DialerCampaign, DialerQueueItem } from './types/dialerTypes';

export function DialerCampaignsListPage() {
  const { tr, lang } = useComercialLanguage();
  const navigate = useNavigate();
  const {
    activeProfile,
    allProfiles,
    selectedCommercialKey,
    setSelectedCommercialKey,
    isCommercialOperator,
  } = useCommercialScope();

  const { data: campaigns = [], isLoading } = useDialerCampaigns();
  const { updateCampaignStatus, completeCampaign, isCompletingCampaign, deleteCampaign } = useMutateDialer();

  const [pageMode, setPageMode] = useState<'works' | 'all_clients'>('works');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'callable' | 'reintento' | 'scheduled' | 'completed'>('all');
  const [clientWorkFilter, setClientWorkFilter] = useState<string>('all');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<'all' | 'callable' | 'scheduled' | 'completed'>('all');
  const [selectedCampaignForQueue, setSelectedCampaignForQueue] = useState<DialerCampaign | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const { data: allQueueItems = [], isLoading: isLoadingAllClients } = useAllDialerQueueItems(
    pageMode === 'all_clients'
  );

  // Deduplicate global client list by lead_id while aggregating work badges
  const unifiedClients = useMemo(() => {
    const map = new Map<string, DialerQueueItem & { workTitles: string[]; campaignIds: string[] }>();
    for (const item of allQueueItems) {
      const key = item.lead_id || item.id;
      const wTitle = item.campaign?.title || item.origin_campaign_title || '';
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          ...item,
          workTitles: wTitle ? [wTitle] : [],
          campaignIds: item.campaign_id ? [item.campaign_id] : [],
        });
      } else {
        const nextTitles = wTitle && !existing.workTitles.includes(wTitle)
          ? [...existing.workTitles, wTitle]
          : existing.workTitles;
        const nextIds = item.campaign_id && !existing.campaignIds.includes(item.campaign_id)
          ? [...existing.campaignIds, item.campaign_id]
          : existing.campaignIds;
        const preferItem = existing.status !== 'scheduled' && item.status === 'scheduled';
        const chosen = preferItem ? item : existing;
        map.set(key, {
          ...chosen,
          global_appointment: chosen.global_appointment || existing.global_appointment || item.global_appointment,
          workTitles: nextTitles,
          campaignIds: nextIds,
        });
      }
    }
    return Array.from(map.values());
  }, [allQueueItems]);

  const filteredUnifiedClients = useMemo(() => {
    return unifiedClients.filter((item) => {
      const hasGlobalSched =
        item.status === 'scheduled' ||
        (item.global_appointment?.status === 'scheduled' && Boolean(item.global_appointment?.scheduled_for));

      if (clientStatusFilter === 'callable' && !['pending', 'in_progress', 'no_answer'].includes(item.status)) {
        return false;
      }
      if (clientStatusFilter === 'reintento' && item.status !== 'no_answer') {
        return false;
      }
      if (clientStatusFilter === 'scheduled' && !hasGlobalSched) {
        return false;
      }
      if (clientStatusFilter === 'completed' && !['interested', 'converted', 'rejected', 'skipped'].includes(item.status)) {
        return false;
      }
      if (clientWorkFilter !== 'all' && !item.campaignIds.includes(clientWorkFilter)) {
        return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      const digits = q.replace(/\D/g, '');
      const phoneDigits = (item.lead?.phone || '').replace(/\D/g, '');
      return (
        (item.lead?.company_name || '').toLowerCase().includes(q) ||
        (item.lead?.name || '').toLowerCase().includes(q) ||
        (item.lead?.phone || '').toLowerCase().includes(q) ||
        (digits.length >= 3 && phoneDigits.includes(digits)) ||
        (item.lead?.city || item.lead?.province || '').toLowerCase().includes(q) ||
        item.workTitles.some((w) => w.toLowerCase().includes(q)) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [unifiedClients, clientStatusFilter, clientWorkFilter, searchTerm]);

  const formatDurationShort = (secs: number) => {
    if (!secs || secs <= 0) return null;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${String(mins % 60).padStart(2, '0')}m`;
    }
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Leads in currently inspected queue
  const { data: inspectedQueue = [], isLoading: loadingQueue } = useDialerQueue(
    selectedCampaignForQueue?.id
  );

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.assigned_user?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.script?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (campaign: DialerCampaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await updateCampaignStatus({ id: campaign.id, status: newStatus });
      toast.success(
        newStatus === 'active'
          ? tr('Trabalho ativado com sucesso!', '¡Trabajo activado con éxito!', 'Lot activé avec succès !', 'Lavoro attivato con successo!')
          : tr('Trabalho pausado com sucesso!', '¡Trabajo pausado con éxito!', 'Lot mis en pause avec succès !', 'Lavoro messo in pausa con successo!')
      );
    } catch (err: any) {
      toast.error(
        tr('Erro ao alterar status do trabalho', 'Error al cambiar estado del trabajo', 'Erreur lors du changement de statut', 'Errore durante il cambio di stato')
      );
    }
  };

  const handleCompleteCampaign = async (campaign: DialerCampaign) => {
    const callableLeft = campaign.items_count?.callable ?? Math.max(0, (campaign.total_leads || 0) - (campaign.completed_leads || 0));
    const msg = callableLeft > 0
      ? tr(
          `Deseja finalizar o trabalho "${campaign.title}"? Os ${callableLeft} leads ainda pendentes/em reintento serão encerrados neste lote (todos os agendamentos na Agenda e materiais enviados permanecem salvos).`,
          `¿Desea finalizar el trabajo "${campaign.title}"? Los ${callableLeft} leads pendientes/en reintento se cerrarán en este lote (todos los agendamientos en la Agenda y materiales enviados permanecen guardados).`,
          `Voulez-vous terminer le lot "${campaign.title}" ? Les ${callableLeft} leads restants seront clôturés dans ce lot (les rappels de l’Agenda restent conservés).`,
          `Vuoi concludere il lavoro "${campaign.title}"? I ${callableLeft} lead rimanenti verranno chiusi in questo lotto (gli appuntamenti in Agenda restano salvati).`
        )
      : tr(
          `Confirmar finalização do trabalho "${campaign.title}"?`,
          `¿Confirmar finalización del trabajo "${campaign.title}"?`,
          `Confirmer la clôture du lot "${campaign.title}" ?`,
          `Confermare la conclusione del lavoro "${campaign.title}"?`
        );

    if (!confirm(msg)) return;
    try {
      await completeCampaign(campaign.id);
      toast.success(
        tr(
          'Trabalho finalizado com sucesso!',
          '¡Trabajo finalizado con éxito!',
          'Lot terminé avec succès !',
          'Lavoro completato con successo!'
        )
      );
    } catch (err: any) {
      toast.error(
        tr(
          'Erro ao finalizar trabalho',
          'Error al finalizar trabajo',
          'Erreur lors de la clôture du lot',
          'Errore durante la chiusura del lavoro'
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(
      tr(
        'Deseja excluir este trabalho? Nota: Todos os agendamentos de retorno (callbacks) deste trabalho serão mantidos intactos na Agenda.',
        '¿Desea eliminar este trabajo? Nota: Todos los agendamientos de seguimiento (callbacks) de este trabajo se mantendrán intactos en la Agenda.',
        'Voulez-vous supprimer ce lot ? Note : Tous les rappels planifiés (callbacks) de ce lot seront conservés dans l’Agenda.'
      )
    )) return;
    try {
      const res = await deleteCampaign(id);
      const preserved = res?.preservedCount || 0;
      toast.success(
        preserved > 0
          ? tr(
              `Trabalho excluído! ${preserved} agendamento(s) preservado(s) na Agenda.`,
              `¡Trabajo eliminado! ${preserved} agendamiento(s) preservado(s) en la Agenda.`,
              `Lot supprimé ! ${preserved} rendez-vous conservé(s) dans l’Agenda.`
            )
          : tr('Trabalho excluído com sucesso!', '¡Trabajo eliminado con éxito!', 'Lot supprimé avec succès !')
      );
    } catch (err: any) {
      toast.error(
        tr('Erro ao excluir trabalho', 'Error al eliminar trabajo', 'Erreur lors de la suppression du lot')
      );
    }
  };

  const handleOpenQueueViewer = (campaign: DialerCampaign) => {
    setSelectedCampaignForQueue(campaign);
    setModalSearchTerm('');
    setModalStatusFilter('all');
    setIsQueueModalOpen(true);
  };

  const filteredInspectedQueue = useMemo(() => {
    return inspectedQueue.filter((item) => {
      const hasGlobalSched =
        item.status === 'scheduled' ||
        (item.global_appointment?.status === 'scheduled' && Boolean(item.global_appointment?.scheduled_for));
      if (modalStatusFilter === 'callable' && !['pending', 'in_progress', 'no_answer'].includes(item.status)) {
        return false;
      }
      if (modalStatusFilter === 'scheduled' && !hasGlobalSched) {
        return false;
      }
      if (modalStatusFilter === 'completed' && !['interested', 'converted', 'rejected', 'skipped'].includes(item.status)) {
        return false;
      }
      if (!modalSearchTerm.trim()) return true;
      const q = modalSearchTerm.toLowerCase().trim();
      const digits = q.replace(/\D/g, '');
      const phoneDigits = (item.lead?.phone || '').replace(/\D/g, '');
      return (
        (item.lead?.company_name || '').toLowerCase().includes(q) ||
        (item.lead?.name || '').toLowerCase().includes(q) ||
        (item.lead?.phone || '').toLowerCase().includes(q) ||
        (digits.length >= 3 && phoneDigits.includes(digits)) ||
        (item.lead?.city || item.lead?.province || '').toLowerCase().includes(q)
      );
    });
  }, [inspectedQueue, modalSearchTerm, modalStatusFilter]);

  // Summary Counters
  const totalCampaigns = campaigns.length;
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;
  const completedCampaignsCount = campaigns.filter(c => c.status === 'completed').length;
  const totalLeadsEnqueued = campaigns.reduce((acc, c) => acc + (c.total_leads || 0), 0);
  const totalCompletedLeads = campaigns.reduce(
    (acc, c) => acc + (c.items_count?.completed ?? c.completed_leads ?? 0),
    0
  );
  const totalCallableLeads = campaigns.reduce(
    (acc, c) =>
      acc +
      (c.status === 'completed'
        ? 0
        : c.items_count?.callable ?? Math.max(0, (c.total_leads || 0) - (c.completed_leads || 0))),
    0
  );
  const totalCallsMade = campaigns.reduce((acc, c) => acc + (c.items_count?.calls_count || 0), 0);
  const totalDurationSeconds = campaigns.reduce(
    (acc, c) => acc + (c.items_count?.total_duration_seconds || 0),
    0
  );

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                {tr('Trabalhos & Filas de Discagem', 'Trabajos y Colas de Marcado', 'Lots & Files d’Appels')}
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">
                  Power Dialer
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                {tr(
                  'Consulte e gerencie os lotes de prospecção isolados por comercial (Alex, Alba, Liseth e Fatumata).',
                  'Consulte y gestione los lotes de prospección aislados por comercial (Alex, Alba, Liseth y Fatumata).',
                  'Consultez et gérez les lots de prospection isolés par commercial (Alex, Alba, Liseth et Fatumata).'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => navigate('/comercial/discador')}
            variant="outline"
            className="border-input bg-background hover:bg-muted text-foreground text-xs font-semibold gap-2"
          >
            <PhoneCall className="w-4 h-4 text-emerald-500" />
            {tr('Abrir Discador', 'Abrir Marcador', 'Ouvrir le Dialer')}
          </Button>

          <Button
            onClick={() => navigate('/comercial/leads')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 gap-2"
          >
            <Plus className="w-4 h-4" />
            {tr('Gerar Fila da Base de Leads', 'Generar Cola desde Leads', 'Créer une File depuis les Leads')}
          </Button>
        </div>
      </div>

      {/* Commercial Isolation Bar */}
      <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {tr('Comercial Ativo (Isolamento):', 'Comercial Activo (Aislamiento):', 'Commercial Actif (Isolation) :')}
          </span>
          {isCommercialOperator && activeProfile ? (
            <div className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
              <span>{activeProfile.flag}</span>
              <span>{activeProfile.displayName}</span>
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">{activeProfile.empresaName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCommercialKey('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  selectedCommercialKey === 'all'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {tr('Todos os Comerciais', 'Todos los Comerciales', 'Tous les Commerciaux')}
              </button>
              {allProfiles.map(prof => {
                const isActive = selectedCommercialKey === prof.key;
                return (
                  <button
                    key={prof.key}
                    type="button"
                    onClick={() => setSelectedCommercialKey(prof.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    <span>{prof.flag}</span>
                    <span>{prof.shortName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {prof.empresaName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-bold">
            {tr('Total de Trabalhos', 'Total de Trabajos', 'Total des Lots', 'Totale Lavori')}
          </span>
          <p className="text-2xl font-black text-foreground">{totalCampaigns}</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            {activeCampaignsCount} {tr('ativos', 'activos', 'actifs', 'attivi')}
            {completedCampaignsCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">
                • {completedCampaignsCount} {tr('concluídos', 'completados', 'terminés', 'completati')}
              </span>
            )}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-bold">
            {tr('Leads Enfileirados', 'Leads en Cola', 'Leads en File', 'Lead in Coda')}
          </span>
          <p className="text-2xl font-black text-foreground">{totalLeadsEnqueued}</p>
          <p className="text-[11px] text-muted-foreground">
            📞 {totalCallsMade} {tr('chamadas feitas', 'llamadas hechas', 'appels passés', 'chiamate effettuate')}
            {totalDurationSeconds > 0 ? ` • ⏱ ${formatDurationShort(totalDurationSeconds)}` : ''}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold">
            {tr('Leads Concluídos', 'Leads Completados', 'Leads Traités', 'Lead Completati')}
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalCompletedLeads}</p>
          <p className="text-[11px] text-muted-foreground">
            {totalLeadsEnqueued > 0 ? Math.round((totalCompletedLeads / totalLeadsEnqueued) * 100) : 0}%{' '}
            {tr('do mailing processado', 'del mailing procesado', 'du mailing traité', 'del mailing elaborato')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">
            {tr('Disponíveis p/ Discagem', 'Disponibles para Llamar', 'Disponibles à Appeler', 'Disponibili da Chiamare')}
          </span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalCallableLeads}</p>
          <p className="text-[11px] text-muted-foreground">
            {tr('Novos + em reintento', 'Nuevos + en reintento', 'Nouveaux + relance', 'Nuovi + da richiamare')}
          </p>
        </div>
      </div>

      {/* View Switcher + Search & Filter Bar */}
      <div className="flex flex-col gap-3 p-3.5 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPageMode('works')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                pageMode === 'works'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-background text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {tr('Por Trabalhos (Lotes)', 'Por Trabajos (Lotes)', 'Par Lots', 'Per Lavori')} ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setPageMode('all_clients')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                pageMode === 'all_clients'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-background text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              {tr(
                'Lista Unificada de Clientes (Todos os Trabalhos)',
                'Lista Unificada de Clientes (Todos los Trabajos)',
                'Liste Unifiée des Clients (Tous les Lots)',
                'Lista Unificata Clienti (Tutti i Lavori)'
              )}
              {unifiedClients.length > 0 ? ` (${unifiedClients.length})` : ''}
            </button>
          </div>

          <span className="text-xs text-muted-foreground">
            {pageMode === 'works' ? (
              <>
                {tr('Exibindo', 'Mostrando', 'Affichage de', 'Mostrando')}{' '}
                <strong>{filteredCampaigns.length}</strong> {tr('de', 'de', 'sur', 'di')} {campaigns.length}{' '}
                {tr('trabalhos', 'trabajos', 'lots', 'lavori')}
              </>
            ) : (
              <>
                {tr('Exibindo', 'Mostrando', 'Affichage de', 'Mostrando')}{' '}
                <strong>{filteredUnifiedClients.length}</strong> {tr('de', 'de', 'sur', 'di')} {unifiedClients.length}{' '}
                {tr('clientes', 'clientes', 'clients', 'clienti')}
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                pageMode === 'works'
                  ? tr(
                      'Buscar por nome do trabalho, operador ou script...',
                      'Buscar por nombre del trabajo, operador o guion...',
                      'Rechercher par nom du lot, opérateur ou script...',
                      'Cerca per nome lavoro, operatore o script...'
                    )
                  : tr(
                      'Buscar cliente em todos os trabalhos por empresa, contato, telefone, cidade ou #tag...',
                      'Buscar cliente en todos los trabajos por empresa, contacto, teléfono, ciudad o #etiqueta...',
                      'Rechercher un client dans tous les lots par entreprise, contact, téléphone ou #tag...',
                      'Cerca cliente in tutti i lavori per azienda, contatto, telefono, città o #tag...'
                    )
              }
              className="pl-9 bg-background border-input text-foreground text-xs h-9"
            />
          </div>

          {pageMode === 'all_clients' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['all', tr('Todos', 'Todos', 'Tous', 'Tutti')],
                  ['callable', tr('Na Fila', 'En Cola', 'En File', 'In Coda')],
                  ['reintento', tr('Fim da Fila', 'Fin de Cola', 'Fin de File', 'Fine Coda')],
                  ['scheduled', tr('Com Agendamento', 'Con Cita', 'Planifiés', 'Pianificati')],
                  ['completed', tr('Concluídos', 'Completados', 'Traités', 'Completati')],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setClientStatusFilter(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    clientStatusFilter === key
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                      : 'bg-background text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  {label}
                </button>
              ))}

              {campaigns.length > 1 && (
                <select
                  value={clientWorkFilter}
                  onChange={(e) => setClientWorkFilter(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground max-w-[220px]"
                >
                  <option value="all">
                    {tr('Todos os Trabalhos', 'Todos los Trabajos', 'Tous les Lots', 'Tutti i Lavori')}
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode B: Unified Client List Across All Works */}
      {pageMode === 'all_clients' ? (
        isLoadingAllClients ? (
          <div className="p-12 text-center text-muted-foreground space-y-3 bg-card rounded-2xl border border-border">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm">
              {tr(
                'Carregando relação unificada de clientes de todos os trabalhos...',
                'Cargando relación unificada de clientes de todos los trabajos...',
                'Chargement de la liste unifiée de tous les lots...',
                'Caricamento lista unificata di tutti i lavori...'
              )}
            </p>
          </div>
        ) : filteredUnifiedClients.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed bg-card space-y-2">
            <ListFilter className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-bold text-foreground">
              {tr(
                'Nenhum cliente encontrado para este filtro.',
                'Ningún cliente encontrado con este filtro.',
                'Aucun client trouvé avec ce filtre.',
                'Nessun cliente trovato con questo filtro.'
              )}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">{tr('Empresa / Contato', 'Empresa / Contacto', 'Entreprise / Contact', 'Azienda / Contatto')}</th>
                    <th className="py-3 px-4">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                    <th className="py-3 px-4">{tr('Trabalho(s)', 'Trabajo(s)', 'Lot(s)', 'Lavoro/i')}</th>
                    <th className="py-3 px-4">{tr('Agendamento Global', 'Cita Global', 'RDV Global', 'Appuntamento Globale')}</th>
                    <th className="py-3 px-4 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                    <th className="py-3 px-4 text-right">{tr('Atender no Cockpit', 'Atender en Cockpit', 'Appeler au Cockpit', 'Chiama nel Cockpit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUnifiedClients.slice(0, 300).map((item) => {
                    const globalSched =
                      item.global_appointment?.status === 'scheduled'
                        ? item.global_appointment.scheduled_for
                        : item.status === 'scheduled'
                        ? item.scheduled_for
                        : null;

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground text-sm">
                            {item.lead?.company_name || item.lead?.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.lead?.name && item.lead?.company_name ? `${item.lead.name} • ` : ''}
                            {item.lead?.city || item.lead?.province || ''}
                            {item.attempts_count > 0 ? ` • ${item.attempts_count}x` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          {item.lead?.phone || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {item.workTitles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-medium max-w-[220px] truncate">
                                {item.workTitles[0]}
                              </span>
                              {item.workTitles.length > 1 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{item.workTitles.length - 1}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Agenda / Direto</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {globalSched ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {format(parseISO(globalSched), 'dd/MM/yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'converted'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.status === 'interested'
                                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25'
                                : item.status === 'scheduled'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : item.status === 'no_answer'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                                : item.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.status === 'no_answer'
                              ? tr('Fim da Fila', 'Fin de Cola', 'Fin de File', 'Fine Coda')
                              : item.status === 'scheduled'
                              ? tr('Agendado', 'Agendado', 'Planifié', 'Pianificato')
                              : item.status === 'interested'
                              ? tr('Material', 'Material', 'Doc Envoyé', 'Materiale')
                              : item.status === 'converted'
                              ? tr('Convertido', 'Convertido', 'Converti', 'Convertito')
                              : item.status === 'rejected'
                              ? tr('Recusado', 'Rechazado', 'Refusé', 'Rifiutato')
                              : tr('Pendente', 'Pendiente', 'En Attente', 'In Attesa')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/comercial/discador?fromAgenda=1${
                                  item.campaign_id ? `&campaignId=${item.campaign_id}` : ''
                                }&queueItemId=${item.id}`
                              )
                            }
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            {tr('Chamar no Cockpit', 'Llamar en Cockpit', 'Appeler au Cockpit', 'Chiama nel Cockpit')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm">{tr('Carregando trabalhos de discagem...', 'Cargando trabajos de marcado...', 'Chargement des lots d’appels...', 'Caricamento lavori di chiamata...')}</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed bg-card space-y-4">
          <Layers className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            {tr('Nenhum trabalho de discagem encontrado', 'Ningún trabajo de marcado encontrado', 'Aucun lot d’appels trouvé', 'Nessun lavoro di chiamata trovato')}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {tr(
              'Você pode ir até a base de leads, filtrar seu público e clicar em "Criar Fila de Discagem".',
              'Puede ir a la base de leads, filtrar su público y hacer clic en "Crear Cola de Marcado".',
              'Vous pouvez aller dans la base de leads, filtrer votre audience et cliquer sur "Créer une File d’Appels".',
              'Puoi andare nella base lead, filtrare il pubblico e cliccare su "Crea Coda di Chiamata".'
            )}
          </p>
          <Button
            onClick={() => navigate('/comercial/leads')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
          >
            {tr('Ir para Base de Leads', 'Ir a Base de Leads', 'Aller à la Base de Leads', 'Vai alla Base Lead')}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">{tr('Nome do Trabalho', 'Nombre del Trabajo', 'Nom du Lot', 'Nome del Lavoro')}</th>
                  <th className="py-3.5 px-4">{tr('Operador / Vendedor', 'Operador / Comercial', 'Opérateur / Commercial', 'Operatore / Commerciale')}</th>
                  <th className="py-3.5 px-4">{tr('Script de Abordagem', 'Guion de Abordaje', 'Script d’Approche', 'Script di Approccio')}</th>
                  <th className="py-3.5 px-4 text-center">{tr('Progresso da Fila', 'Progreso de la Cola', 'Progression', 'Progresso Coda')}</th>
                  <th className="py-3.5 px-4 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                  <th className="py-3.5 px-4 text-center">{tr('Criado em', 'Creado el', 'Créé le', 'Creato il')}</th>
                  <th className="py-3.5 px-4 text-right">{tr('Ações', 'Acciones', 'Actions', 'Azioni')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.map(camp => {
                  const total = camp.total_leads || 0;
                  const completed = camp.items_count?.completed ?? camp.completed_leads ?? 0;
                  const callable = camp.status === 'completed'
                    ? 0
                    : camp.items_count?.callable ?? Math.max(0, total - completed);
                  const callsCount = camp.items_count?.calls_count || 0;
                  const durationStr = formatDurationShort(camp.items_count?.total_duration_seconds || 0);
                  const noAnswerCount = camp.items_count?.no_answer || 0;
                  const interestedCount = camp.items_count?.interested || 0;
                  const scheduledCount = camp.items_count?.scheduled || 0;
                  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                  const commProfile = camp.assigned_user
                    ? getCommercialProfileByUser({ id: camp.assigned_user.id, display_name: camp.assigned_user.display_name })
                    : null;

                  return (
                    <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                      {/* Title & Description */}
                      <td className="py-4 px-4 font-bold text-foreground">
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-foreground hover:text-blue-500 cursor-pointer" onClick={() => navigate(`/comercial/discador?campaignId=${camp.id}`)}>
                            {camp.title}
                          </span>
                          {camp.description && (
                            <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                              {camp.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-4 px-4 font-medium">
                        {camp.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                              {commProfile ? commProfile.flag : camp.assigned_user.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-foreground block leading-tight">{camp.assigned_user.display_name}</span>
                              {commProfile && (
                                <span className="text-[10px] text-muted-foreground">{commProfile.empresaName}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {tr('Qualquer operador', 'Cualquier operador', 'Tout opérateur', 'Qualsiasi operatore')}
                          </span>
                        )}
                      </td>

                      {/* Script */}
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-[11px] font-normal border-border">
                          {camp.script?.title || tr('Script Padrão Industrial', 'Guion Estándar Industrial', 'Script Standard Industriel', 'Script Standard Industriale')}
                        </Badge>
                      </td>

                      {/* Progress Bar & Counters */}
                      <td className="py-4 px-4">
                        <div className="w-56 mx-auto space-y-1.5 text-center">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {completed} {tr('concluídos', 'completados', 'traités', 'completati')}
                            </span>
                            <span className="text-muted-foreground">
                              {callable} {tr('restam', 'restan', 'restent', 'restano')} ({total})
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-1 pt-0.5">
                            {callsCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-[10px] font-bold">
                                📞 {callsCount} {tr('chamadas', 'llamadas', 'appels', 'chiamate')}
                                {durationStr ? ` • ⏱ ${durationStr}` : ''}
                              </span>
                            )}
                            {noAnswerCount > 0 && camp.status !== 'completed' && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/25 text-[10px] font-bold"
                                title={tr(
                                  'Leads já chamados sem resposta que aguardam nova tentativa (até 3x).',
                                  'Leads ya llamados sin respuesta que esperan un nuevo intento (hasta 3x).',
                                  'Leads appelés sans réponse en attente de relance (jusqu’à 3x).',
                                  'Lead già chiamati senza risposta in attesa di nuovo tentativo (fino a 3x).'
                                )}
                              >
                                🔄 {noAnswerCount} {tr('reintento', 'reintento', 'relance', 'riprova')}
                              </span>
                            )}
                            {interestedCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 text-[10px] font-bold">
                                📧 {interestedCount} {tr('material', 'material', 'doc envoyé', 'materiale')}
                              </span>
                            )}
                            {scheduledCount > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                                title={tr(
                                  'Estes agendamentos permanecem salvos na Agenda mesmo se o trabalho for finalizado ou excluído.',
                                  'Estos agendamientos permanecen guardados en la Agenda incluso si se finaliza o elimina el trabajo.',
                                  'Ces rappels restent conservés dans l’Agenda même si le lot est terminé ou supprimé.',
                                  'Questi appuntamenti restano salvati in Agenda anche se il lavoro viene completato o eliminato.'
                                )}
                              >
                                📅 {scheduledCount}{' '}
                                {tr('agendados (protegidos)', 'agendados (protegidos)', 'planifiés (protégés)', 'pianificati (protetti)')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                        }`}>
                          {camp.status === 'active'
                            ? tr('Ativa', 'Activa', 'Active', 'Attiva')
                            : camp.status === 'paused'
                            ? tr('Pausada', 'Pausada', 'En pause', 'In pausa')
                            : tr('Concluída', 'Completada', 'Terminée', 'Completata')}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-center text-muted-foreground font-mono text-[11px]">
                        {new Date(camp.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'pt-BR')}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Play in Dialer */}
                          <Button
                            size="sm"
                            variant={camp.status === 'completed' ? 'outline' : 'default'}
                            onClick={() => navigate(`/comercial/discador?campaignId=${camp.id}`)}
                            className={
                              camp.status === 'completed'
                                ? 'h-8 px-2.5 text-xs font-semibold gap-1 border-border'
                                : 'h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm'
                            }
                            title={
                              camp.status === 'completed'
                                ? tr('Ver resumo no Discador', 'Ver resumen en Marcador', 'Voir résumé dans le Dialer', 'Vedi riepilogo')
                                : tr('Atender no Discador', 'Atender en Marcador', 'Ouvrir dans le Dialer', 'Apri nel Dialer')
                            }
                          >
                            <Play className="w-3.5 h-3.5" />
                            {camp.status === 'completed'
                              ? tr('Resumo', 'Resumen', 'Résumé', 'Riepilogo')
                              : tr('Discar', 'Llamar', 'Appeler', 'Chiama')}
                          </Button>

                          {/* View Queue Items List */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenQueueViewer(camp)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
                            title={tr('Ver lista completa de clientes deste trabalho', 'Ver lista completa de clientes de este trabajo', 'Voir la liste complète des clients', 'Vedi lista completa clienti')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {tr('Ver Lista', 'Ver Lista', 'Voir Liste', 'Vedi Lista')} ({total})
                          </Button>

                          {/* Finalizar Trabalho */}
                          {camp.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCompletingCampaign}
                              onClick={() => handleCompleteCampaign(camp)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                              title={tr('Finalizar trabalho', 'Finalizar trabajo', 'Terminer le lot', 'Concludi lavoro')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Pause / Resume */}
                          {camp.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(camp)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500"
                              title={
                                camp.status === 'active'
                                  ? tr('Pausar trabalho', 'Pausar trabajo', 'Mettre en pause', 'Metti in pausa')
                                  : tr('Ativar trabalho', 'Activar trabajo', 'Activer le lot', 'Attiva lavoro')
                              }
                            >
                              {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(camp.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                            title={tr('Excluir lote', 'Eliminar lote', 'Supprimer le lot', 'Elimina lotto')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Queue Leads */}
      <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              {tr('Fila de Leads:', 'Cola de Leads:', 'File de Leads :', 'Coda Lead:')} {selectedCampaignForQueue?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {tr(
                'Relação de todas as empresas incluídas nesta campanha e status de contato individual.',
                'Relación de todas las empresas incluidas en esta campaña y estado de contacto individual.',
                'Liste de toutes les entreprises incluses dans cette campagne et statut de contact individuel.',
                'Elenco di tutte le aziende incluse in questa campagna e stato di contatto individuale.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder={tr(
                    'Buscar cliente neste trabalho por empresa, contato ou telefone...',
                    'Buscar cliente en este trabajo por empresa, contacto o teléfono...',
                    'Rechercher un client dans ce lot...',
                    'Cerca cliente in questo lavoro...'
                  )}
                  className="pl-9 h-8 text-xs bg-background border-input"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    ['all', tr('Todos', 'Todos', 'Tous', 'Tutti')],
                    ['callable', tr('Na Fila', 'En Cola', 'En File', 'In Coda')],
                    ['scheduled', tr('Agendados', 'Agendados', 'Planifiés', 'Pianificati')],
                    ['completed', tr('Concluídos', 'Completados', 'Traités', 'Completati')],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setModalStatusFilter(key)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      modalStatusFilter === key
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-background text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loadingQueue ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                {tr('Carregando leads da fila...', 'Cargando leads de la cola...', 'Chargement des leads de la file...', 'Caricamento lead della coda...')}
              </div>
            ) : filteredInspectedQueue.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                {tr('Nenhum lead nesta fila.', 'Ningún lead en esta cola.', 'Aucun lead dans cette file.', 'Nessun lead in questa coda.')}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{tr('Empresa', 'Empresa', 'Entreprise', 'Azienda')}</th>
                      <th className="py-2.5 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                      <th className="py-2.5 px-3">{tr('Agendamento Global', 'Cita Global', 'RDV Global', 'Appuntamento')}</th>
                      <th className="py-2.5 px-3 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                      <th className="py-2.5 px-3 text-right">{tr('Ação', 'Acción', 'Action', 'Azione')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInspectedQueue.map((item, idx) => {
                      const globalSched =
                        item.global_appointment?.status === 'scheduled'
                          ? item.global_appointment.scheduled_for
                          : item.status === 'scheduled'
                          ? item.scheduled_for
                          : null;
                      const statusLabel =
                        item.status === 'converted'
                          ? tr('Convertido', 'Convertido', 'Converti', 'Convertito')
                          : item.status === 'interested'
                          ? tr('Material Enviado', 'Material Enviado', 'Doc Envoyé', 'Materiale Inviato')
                          : item.status === 'scheduled'
                          ? tr('Agendado', 'Agendado', 'Planifié', 'Pianificato')
                          : item.status === 'rejected'
                          ? tr('Sem Interesse', 'Sin Interés', 'Refusé', 'Rifiutato')
                          : item.status === 'no_answer'
                          ? tr('Fim da Fila / Reintento', 'Fin de Cola / Reintento', 'Fin de File / Relance', 'Fine Coda / Riprova')
                          : item.status === 'skipped'
                          ? tr('Encerrado', 'Cerrado', 'Clôturé', 'Chiuso')
                          : item.status === 'in_progress'
                          ? tr('Em Curso', 'En Curso', 'En Cours', 'In Corso')
                          : tr('Pendente', 'Pendiente', 'En Attente', 'In Attesa');

                      return (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {item.lead.company_name || item.lead.name}
                            <p className="text-[10px] text-muted-foreground font-normal">
                              {item.lead.city || item.lead.province || tr('Espanha', 'España', 'Espagne', 'Spagna')} • {item.lead.sector || tr('Industrial', 'Industrial', 'Industriel', 'Industriale')}
                              {item.attempts_count > 0 ? ` • ${item.attempts_count}x` : ''}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-foreground">{item.lead.phone || '-'}</td>
                          <td className="py-2.5 px-3">
                            {globalSched ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                <CalendarDays className="w-3 h-3" />
                                {format(parseISO(globalSched), 'dd/MM HH:mm')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'converted'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.status === 'interested'
                                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25'
                                : item.status === 'scheduled'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : item.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : item.status === 'no_answer'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsQueueModalOpen(false);
                                navigate(
                                  `/comercial/discador?fromAgenda=1&campaignId=${selectedCampaignForQueue?.id || item.campaign_id}&queueItemId=${item.id}`
                                );
                              }}
                              className="h-7 px-2 text-[11px] font-bold gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            >
                              <Play className="w-3 h-3" />
                              {tr('Abrir', 'Abrir', 'Ouvrir', 'Apri')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQueueModalOpen(false)}
              className="border-input"
            >
              {tr('Fechar', 'Cerrar', 'Fermer', 'Chiudi')}
            </Button>
            {selectedCampaignForQueue && (
              <Button
                size="sm"
                onClick={() => {
                  setIsQueueModalOpen(false);
                  navigate(`/comercial/discador?campaignId=${selectedCampaignForQueue.id}`);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> {tr('Abrir no Discador', 'Abrir en Marcador', 'Ouvrir dans le Dialer', 'Apri nel Dialer')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
