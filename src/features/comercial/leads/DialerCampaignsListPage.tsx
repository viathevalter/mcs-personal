import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle2
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
import { useDialerCampaigns, useDialerQueue, useMutateDialer } from './hooks/useDialer';
import { useCommercialScope, getCommercialProfileByUser } from './hooks/useLeads';
import { useComercialLanguage } from './utils/comercialI18n';
import { toast } from 'sonner';
import type { DialerCampaign } from './types/dialerTypes';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaignForQueue, setSelectedCampaignForQueue] = useState<DialerCampaign | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

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
    setIsQueueModalOpen(true);
  };

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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={tr(
              'Buscar por nome do trabalho, operador ou script...',
              'Buscar por nombre del trabajo, operador o guion...',
              'Rechercher par nom du lot, opérateur ou script...',
              'Cerca per nome lavoro, operatore o script...'
            )}
            className="pl-9 bg-background border-input text-foreground text-xs h-9"
          />
        </div>

        <span className="text-xs text-muted-foreground">
          {tr('Exibindo', 'Mostrando', 'Affichage de', 'Mostrando')} <strong>{filteredCampaigns.length}</strong> {tr('de', 'de', 'sur', 'di')} {campaigns.length} {tr('trabalhos', 'trabajos', 'lots', 'lavori')}
        </span>
      </div>

      {/* Campaigns Table */}
      {isLoading ? (
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

                          {/* View Queue Items */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQueueViewer(camp)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title={tr('Ver fila de leads', 'Ver cola de leads', 'Voir la file de leads', 'Vedi coda lead')}
                          >
                            <Eye className="w-4 h-4" />
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
            {loadingQueue ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                {tr('Carregando leads da fila...', 'Cargando leads de la cola...', 'Chargement des leads de la file...', 'Caricamento lead della coda...')}
              </div>
            ) : inspectedQueue.length === 0 ? (
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
                      <th className="py-2.5 px-3 text-center">{tr('Tentativas', 'Intentos', 'Tentatives', 'Tentativi')}</th>
                      <th className="py-2.5 px-3 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inspectedQueue.map((item, idx) => {
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
                          ? tr('Reintento', 'Reintento', 'Relance', 'Riprova')
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
                            </p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-foreground">{item.lead.phone || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-foreground">{item.attempts_count}</td>
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
