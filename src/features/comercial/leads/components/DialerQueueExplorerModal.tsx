import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Search,
  PhoneCall,
  Layers,
  Globe2,
  CalendarDays,
  Play,
  Loader2,
  Building2,
  MapPin,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useAllDialerQueueItems, useMutateDialer } from '../hooks/useDialer';
import { useCommercialScope } from '../hooks/useLeads';
import type { DialerCampaign, DialerQueueItem } from '../types/dialerTypes';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';
import { toast } from 'sonner';

interface DialerQueueExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCampaign?: DialerCampaign | null;
  currentCampaignQueue: DialerQueueItem[];
  currentQueueItemId?: string | null;
  onSelectQueueItem: (item: DialerQueueItem) => void;
  onSelectDirectQueueItem: (queueItemId: string, campaignId?: string | null) => void;
  overrideLang?: SupportedComercialLang | null;
}

type ExplorerTab = 'current_work' | 'all_works' | 'crm_search';
type StatusQuickFilter = 'all' | 'callable' | 'scheduled' | 'completed';

export function DialerQueueExplorerModal({
  isOpen,
  onClose,
  activeCampaign,
  currentCampaignQueue,
  currentQueueItemId,
  onSelectQueueItem,
  onSelectDirectQueueItem,
  overrideLang,
}: DialerQueueExplorerModalProps) {
  const { tr } = useComercialLanguage(overrideLang);
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();
  const { ensureQueueItemForLead, isEnsuringQueueItem } = useMutateDialer();

  const [activeTab, setActiveTab] = useState<ExplorerTab>(
    activeCampaign ? 'current_work' : 'all_works'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusQuickFilter>('all');
  const [workFilterId, setWorkFilterId] = useState<string>('all');

  // Switch default tab intelligently if there's no active campaign
  useEffect(() => {
    if (isOpen) {
      if (!activeCampaign && activeTab === 'current_work') {
        setActiveTab('all_works');
      }
    }
  }, [isOpen, activeCampaign]);

  const { data: allWorksItems = [], isLoading: loadingAllWorks } = useAllDialerQueueItems(
    isOpen && activeTab === 'all_works'
  );

  // Deduplicate allWorksItems by lead_id while keeping work badges so 1 client across 3 works shows cleanly
  const unifiedAllWorksItems = useMemo(() => {
    const byLead = new Map<string, DialerQueueItem & { workTitles: string[]; campaignIds: string[] }>();
    for (const item of allWorksItems) {
      const key = item.lead_id || item.id;
      const wTitle = item.campaign?.title || item.origin_campaign_title || '';
      const existing = byLead.get(key);
      if (!existing) {
        byLead.set(key, {
          ...item,
          workTitles: wTitle ? [wTitle] : [],
          campaignIds: item.campaign_id ? [item.campaign_id] : [],
        });
      } else {
        const nextTitles = wTitle && !existing.workTitles.includes(wTitle)
          ? [...existing.workTitles, wTitle]
          : existing.workTitles;
        const nextCampIds = item.campaign_id && !existing.campaignIds.includes(item.campaign_id)
          ? [...existing.campaignIds, item.campaign_id]
          : existing.campaignIds;

        // Prefer active scheduled or currently open campaign item
        const preferNew =
          (existing.status !== 'scheduled' && item.status === 'scheduled') ||
          (activeCampaign && item.campaign_id === activeCampaign.id && existing.campaign_id !== activeCampaign.id);

        const chosen = preferNew ? item : existing;
        byLead.set(key, {
          ...chosen,
          global_appointment: chosen.global_appointment || existing.global_appointment || item.global_appointment,
          workTitles: nextTitles,
          campaignIds: nextCampIds,
        });
      }
    }
    return Array.from(byLead.values());
  }, [allWorksItems, activeCampaign]);

  const availableWorkOptions = useMemo(() => {
    const map = new Map<string, string>();
    allWorksItems.forEach((it) => {
      if (it.campaign?.id && it.campaign?.title) {
        map.set(it.campaign.id, it.campaign.title);
      }
    });
    return Array.from(map.entries());
  }, [allWorksItems]);

  const matchesItemSearchAndStatus = (
    item: DialerQueueItem & { workTitles?: string[]; campaignIds?: string[] }
  ) => {
    const hasGlobalSched =
      item.status === 'scheduled' ||
      (item.global_appointment?.status === 'scheduled' && Boolean(item.global_appointment?.scheduled_for));

    if (statusFilter === 'callable') {
      if (!['pending', 'in_progress', 'no_answer'].includes(item.status)) return false;
    } else if (statusFilter === 'scheduled') {
      if (!hasGlobalSched) return false;
    } else if (statusFilter === 'completed') {
      if (!['interested', 'converted', 'rejected', 'skipped'].includes(item.status)) return false;
    }

    if (activeTab === 'all_works' && workFilterId !== 'all') {
      const cIds = item.campaignIds || (item.campaign_id ? [item.campaign_id] : []);
      if (!cIds.includes(workFilterId)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const digitsOnly = q.replace(/\D/g, '');
    const leadPhoneDigits = (item.lead?.phone || '').replace(/\D/g, '');

    const inCompany = (item.lead?.company_name || '').toLowerCase().includes(q);
    const inName = (item.lead?.name || '').toLowerCase().includes(q);
    const inPhone =
      (item.lead?.phone || '').toLowerCase().includes(q) ||
      (digitsOnly.length >= 3 && leadPhoneDigits.includes(digitsOnly));
    const inEmail = (item.lead?.email || '').toLowerCase().includes(q);
    const inCity = (item.lead?.city || item.lead?.province || '').toLowerCase().includes(q);
    const inWork =
      (item.campaign?.title || '').toLowerCase().includes(q) ||
      (item.workTitles || []).some((w) => w.toLowerCase().includes(q));
    const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));

    return inCompany || inName || inPhone || inEmail || inCity || inWork || inTags;
  };

  const filteredCurrentQueue = useMemo(
    () => currentCampaignQueue.filter(matchesItemSearchAndStatus),
    [currentCampaignQueue, searchQuery, statusFilter]
  );

  const filteredAllWorks = useMemo(
    () => unifiedAllWorksItems.filter(matchesItemSearchAndStatus),
    [unifiedAllWorksItems, searchQuery, statusFilter, workFilterId]
  );

  // Tab 3: Live CRM search across core_comercial.leads
  const [crmResults, setCrmResults] = useState<any[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);

  useEffect(() => {
    if (!isOpen || activeTab !== 'crm_search') return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setCrmResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingCrm(true);
      try {
        const targetProfile = isCommercialOperator ? loggedCommercialProfile : activeCommercialProfile;
        const safeTerm = trimmed.replace(/[%_]/g, '');

        let q = supabase
          .schema('core_comercial')
          .from('leads')
          .select('id, name, company_name, phone, email, city, province, sector, country_id, assigned_to, empresa_id')
          .or(
            `company_name.ilike.%${safeTerm}%,name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%`
          )
          .limit(40);

        if (targetProfile?.userId) {
          q = q.eq('assigned_to', targetProfile.userId);
        } else if (selectedEmpresaId) {
          q = q.eq('empresa_id', selectedEmpresaId);
        }

        const { data } = await q;
        if (!cancelled) {
          setCrmResults(data || []);
        }
      } catch {
        if (!cancelled) setCrmResults([]);
      } finally {
        if (!cancelled) setLoadingCrm(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    activeTab,
    searchQuery,
    isCommercialOperator,
    loggedCommercialProfile,
    activeCommercialProfile,
    selectedEmpresaId,
  ]);

  const handleOpenCrmLead = async (leadId: string) => {
    try {
      const res = await ensureQueueItemForLead({
        leadId,
        preferredCampaignId: activeCampaign?.id || null,
      });
      onSelectDirectQueueItem(res.queueItemId, res.campaignId);
      onClose();
    } catch (err: any) {
      toast.error(
        err.message ||
          tr(
            'Erro ao abrir cliente no Cockpit',
            'Error al abrir cliente en el Cockpit',
            'Erreur lors de l’ouverture du client',
            "Errore nell'apertura del cliente"
          )
      );
    }
  };

  const renderStatusBadge = (item: DialerQueueItem) => {
    const status = item.status;
    if (status === 'converted') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 text-[10px]">
          {tr('Orçamento', 'Presupuesto', 'Converti', 'Convertito')}
        </Badge>
      );
    }
    if (status === 'interested') {
      return (
        <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 text-[10px]">
          {tr('Material Env.', 'Material Env.', 'Doc Envoyé', 'Materiale Inv.')}
        </Badge>
      );
    }
    if (status === 'scheduled') {
      return (
        <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px]">
          {tr('Agendado', 'Agendado', 'Planifié', 'Pianificato')}
        </Badge>
      );
    }
    if (status === 'no_answer') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
          {tr('Fim da Fila / Reintento', 'Fin de Cola / Reintento', 'Fin de File / Relance', 'Fine Coda / Riprova')}
        </Badge>
      );
    }
    if (status === 'rejected') {
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 text-[10px]">
          {tr('Recusado', 'Rechazado', 'Refusé', 'Rifiutato')}
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25 text-[10px]">
        {tr('Pendente', 'Pendiente', 'En Attente', 'In Attesa')}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col bg-card border-border text-foreground p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2 flex-wrap">
                  {tr(
                    'Relação de Filas & Busca Instantânea de Clientes',
                    'Relación de Colas y Búsqueda Instantánea de Clientes',
                    'Liste des Files & Recherche Instantanée de Clients',
                    'Elenco Code & Ricerca Istantanea Clienti'
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {tr(
                    'Selecione qualquer cliente deste trabalho, de todos os trabalhos ou da base geral para colocá-lo em tela agora mesmo.',
                    'Seleccione cualquier cliente de este trabajo, de todos sus trabajos o de la base general para ponerlo en pantalla ahora mismo.',
                    'Sélectionnez n’importe quel client de ce lot, de tous vos lots ou de la base CRM pour l’afficher immédiatement à l’écran.',
                    'Seleziona qualsiasi cliente di questo lavoro, di tutti i lavori o del CRM per aprirlo subito a schermo.'
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {activeCampaign && (
              <button
                type="button"
                onClick={() => setActiveTab('current_work')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  activeTab === 'current_work'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-background text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {tr('Deste Trabalho', 'Este Trabajo', 'Ce Lot', 'Questo Lavoro')} ({currentCampaignQueue.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('all_works')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                activeTab === 'all_works'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-background text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              {tr(
                'Todos os Trabalhos (Unificado)',
                'Todos los Trabajos (Unificado)',
                'Tous les Lots (Unifié)',
                'Tutti i Lavori (Unificato)'
              )}
              {unifiedAllWorksItems.length > 0 ? ` (${unifiedAllWorksItems.length})` : ''}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crm_search')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                activeTab === 'crm_search'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-background text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              {tr(
                'Recebeu Ligação / Base Geral CRM',
                'Recibió Llamada / Base General CRM',
                'Appel Entrant / Base CRM',
                'Chiamata Ricevuta / Base CRM'
              )}
            </button>
          </div>

          {/* Search + Filters Bar */}
          <div className="pt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(
                  'Buscar por empresa, contato, telefone (mesmo parcial), cidade, #tag ou nome do trabalho...',
                  'Buscar por empresa, contacto, teléfono (parcial), ciudad, #etiqueta o nombre del trabajo...',
                  'Rechercher par entreprise, contact, téléphone, ville, #tag ou nom du lot...',
                  'Cerca per azienda, contatto, telefono, città, #tag o nome del lavoro...'
                )}
                className="pl-9 pr-8 h-9 text-xs bg-background border-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeTab !== 'crm_search' && (
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    ['all', tr('Todos', 'Todos', 'Tous', 'Tutti')],
                    ['callable', tr('Na Fila', 'En Cola', 'En File', 'In Coda')],
                    ['scheduled', tr('Agendados', 'Agendados', 'Planifiés', 'Pianificati')],
                    ['completed', tr('Concluídos', 'Completados', 'Traités', 'Completati')],
                  ] as [StatusQuickFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      statusFilter === key
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-background text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {activeTab === 'all_works' && availableWorkOptions.length > 1 && (
                  <select
                    value={workFilterId}
                    onChange={(e) => setWorkFilterId(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold text-foreground max-w-[190px]"
                  >
                    <option value="all">
                      {tr('Todos os Trabalhos', 'Todos los Trabajos', 'Tous les Lots', 'Tutti i Lavori')}
                    </option>
                    {availableWorkOptions.map(([id, title]) => (
                      <option key={id} value={id}>
                        {title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Results Table */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[320px]">
          {activeTab === 'current_work' && (
            <>
              {filteredCurrentQueue.length === 0 ? (
                <div className="py-14 text-center text-xs text-muted-foreground">
                  {tr(
                    'Nenhum cliente encontrado neste filtro.',
                    'Ningún cliente encontrado con este filtro.',
                    'Aucun client trouvé avec ce filtre.',
                    'Nessun cliente trovato con questo filtro.'
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-12">#</th>
                        <th className="py-2.5 px-3">{tr('Empresa / Contato', 'Empresa / Contacto', 'Entreprise / Contact', 'Azienda / Contatto')}</th>
                        <th className="py-2.5 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                        <th className="py-2.5 px-3">{tr('Agendamento Global', 'Cita Global', 'RDV Global', 'Appuntamento Globale')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                        <th className="py-2.5 px-3 text-right">{tr('Atender', 'Atender', 'Appeler', 'Chiama')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCurrentQueue.map((item, idx) => {
                        const isCurrent = item.id === currentQueueItemId;
                        const globalSched =
                          item.global_appointment?.status === 'scheduled'
                            ? item.global_appointment.scheduled_for
                            : item.status === 'scheduled'
                            ? item.scheduled_for
                            : null;

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isCurrent ? 'bg-indigo-500/10' : 'hover:bg-muted/35'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground">
                                  {item.lead?.company_name || item.lead?.name}
                                </span>
                                {isCurrent && (
                                  <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0">
                                    {tr('EM TELA', 'EN PANTALLA', 'À L’ÉCRAN', 'A SCHERMO')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {item.lead?.name && item.lead?.company_name ? `${item.lead.name} • ` : ''}
                                {item.lead?.city || item.lead?.province || ''}
                                {item.attempts_count > 0 ? ` • ${item.attempts_count}x` : ''}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                              {item.lead?.phone || '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {globalSched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                  <CalendarDays className="w-3 h-3" />
                                  {format(parseISO(globalSched), 'dd/MM HH:mm')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">{renderStatusBadge(item)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  onSelectQueueItem(item);
                                  onClose();
                                }}
                                className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 rounded-lg"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                {tr('Colocar em Tela', 'Poner en Pantalla', 'Afficher', 'Apri a Schermo')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'all_works' && (
            <>
              {loadingAllWorks ? (
                <div className="py-16 text-center text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                  {tr(
                    'Carregando clientes de todos os seus trabalhos...',
                    'Cargando clientes de todos sus trabajos...',
                    'Chargement des clients de tous vos lots...',
                    'Caricamento clienti da tutti i lavori...'
                  )}
                </div>
              ) : filteredAllWorks.length === 0 ? (
                <div className="py-14 text-center text-xs text-muted-foreground">
                  {tr(
                    'Nenhum cliente encontrado nos trabalhos com este filtro.',
                    'Ningún cliente encontrado en los trabajos con este filtro.',
                    'Aucun client trouvé dans vos lots avec ce filtre.',
                    'Nessun cliente trovato nei lavori con questo filtro.'
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">{tr('Empresa / Contato', 'Empresa / Contacto', 'Entreprise / Contact', 'Azienda / Contatto')}</th>
                        <th className="py-2.5 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                        <th className="py-2.5 px-3">{tr('Trabalho(s)', 'Trabajo(s)', 'Lot(s)', 'Lavoro/i')}</th>
                        <th className="py-2.5 px-3">{tr('Agendamento Global', 'Cita Global', 'RDV Global', 'Appuntamento Globale')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('Status', 'Estado', 'Statut', 'Stato')}</th>
                        <th className="py-2.5 px-3 text-right">{tr('Atender Agora', 'Atender Ahora', 'Appeler', 'Chiama Ora')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAllWorks.slice(0, 250).map((item) => {
                        const globalSched =
                          item.global_appointment?.status === 'scheduled'
                            ? item.global_appointment.scheduled_for
                            : item.status === 'scheduled'
                            ? item.scheduled_for
                            : null;

                        return (
                          <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-foreground">
                                {item.lead?.company_name || item.lead?.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.lead?.name && item.lead?.company_name ? `${item.lead.name} • ` : ''}
                                {item.lead?.city || item.lead?.province || ''}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                              {item.lead?.phone || '-'}
                            </td>
                            <td className="py-2.5 px-3 max-w-[220px]">
                              {item.workTitles && item.workTitles.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  <span className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-medium truncate max-w-[185px]">
                                    {item.workTitles[0]}
                                  </span>
                                  {item.workTitles.length > 1 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      +{item.workTitles.length - 1}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Agenda / Direto</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {globalSched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                  <CalendarDays className="w-3 h-3" />
                                  {format(parseISO(globalSched), 'dd/MM/yy HH:mm')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">{renderStatusBadge(item)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  onSelectDirectQueueItem(item.id, item.campaign_id);
                                  onClose();
                                }}
                                className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 rounded-lg"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                {tr('Colocar em Tela', 'Poner en Pantalla', 'Afficher', 'Apri a Schermo')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'crm_search' && (
            <>
              {searchQuery.trim().length < 2 ? (
                <div className="py-16 text-center space-y-2">
                  <PhoneCall className="w-8 h-8 text-emerald-500/60 mx-auto" />
                  <p className="text-sm font-bold text-foreground">
                    {tr(
                      'Recebeu ligação ou quer puxar qualquer empresa da Base Geral?',
                      '¿Recibió una llamada o desea buscar cualquier empresa de su Base General?',
                      'Vous avez reçu un appel ou cherchez un client dans toute la Base CRM ?',
                      'Hai ricevuto una chiamata o cerchi un cliente nella Base CRM?'
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {tr(
                      'Digite pelo menos 2 letras ou números de telefone acima para localizar o cliente e abri-lo imediatamente no Cockpit com todo o histórico.',
                      'Escriba al menos 2 letras o dígitos del teléfono arriba para localizar al cliente y abrirlo de inmediato en el Cockpit.',
                      'Tapez au moins 2 lettres ou chiffres du téléphone ci-dessus pour ouvrir immédiatement la fiche complète du client.',
                      'Digita almeno 2 lettere o cifre del telefono qui sopra per aprire subito la scheda completa del cliente.'
                    )}
                  </p>
                </div>
              ) : loadingCrm ? (
                <div className="py-16 text-center text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                  {tr('Buscando na base geral...', 'Buscando en la base general...', 'Recherche CRM...', 'Ricerca nel CRM...')}
                </div>
              ) : crmResults.length === 0 ? (
                <div className="py-14 text-center text-xs text-muted-foreground">
                  {tr(
                    'Nenhum lead encontrado na Base Geral para esta busca.',
                    'Ningún lead encontrado en la Base General para esta búsqueda.',
                    'Aucun prospect trouvé dans la Base CRM.',
                    'Nessun lead trovato nel CRM per questa ricerca.'
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">{tr('Empresa / Contato', 'Empresa / Contacto', 'Entreprise / Contact', 'Azienda / Contatto')}</th>
                        <th className="py-2.5 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                        <th className="py-2.5 px-3">{tr('Cidade / Setor', 'Ciudad / Sector', 'Ville / Secteur', 'Città / Settore')}</th>
                        <th className="py-2.5 px-3 text-right">{tr('Ação', 'Acción', 'Action', 'Azione')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {crmResults.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/35 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-foreground flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              {lead.company_name || lead.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {lead.name && lead.company_name ? `${lead.name} • ` : ''}
                              {lead.email || ''}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                            {lead.phone || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-500" />
                              {lead.city || lead.province || '-'}
                            </span>
                            {lead.sector ? ` • ${lead.sector}` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              disabled={isEnsuringQueueItem}
                              onClick={() => handleOpenCrmLead(lead.id)}
                              className="h-7 px-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 rounded-lg"
                            >
                              <PhoneCall className="w-3 h-3" />
                              {tr('Abrir no Cockpit', 'Abrir en Cockpit', 'Ouvrir au Cockpit', 'Apri nel Cockpit')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
