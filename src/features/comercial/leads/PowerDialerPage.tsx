import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  CheckCircle2, 
  Calendar, 
  CalendarDays,
  Clock, 
  Ban, 
  User, 
  Building2, 
  MapPin, 
  Globe, 
  MessageSquare, 
  Copy, 
  ChevronRight, 
  ChevronLeft, 
  BarChart3, 
  Zap, 
  Layers, 
  Flame, 
  ExternalLink,
  Wrench,
  FileText,
  Edit,
  Tag,
  Play,
  Square,
  RotateCcw,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import { 
  useDialerCampaigns, 
  useDialerCampaign, 
  useDialerQueue, 
  useDialerDirectQueueItems,
  useSalesScripts,
  extractTagsFromAppointment,
  useLeadCallLogs, 
  useMutateDialer 
} from './hooks/useDialer';
import { useCommercialScope } from './hooks/useLeads';
import { useComercialLanguage, type SupportedComercialLang } from './utils/comercialI18n';

import { QuickPresupuestoModal } from './components/QuickPresupuestoModal';
import { SalesScriptCard } from './components/SalesScriptCard';
import { LeadCallHistoryTimeline } from './components/LeadCallHistoryTimeline';
import { ScheduleCallbackModal } from './components/ScheduleCallbackModal';
import { SendMaterialModal } from './components/SendMaterialModal';
import { GatekeeperModal } from './components/GatekeeperModal';
import { CollectProjectDemandModal } from './components/CollectProjectDemandModal';
import { CollectFiscalDataModal } from './components/CollectFiscalDataModal';
import { EditLeadModal } from './components/EditLeadModal';
import type { Lead } from '../estimaciones/types';
import type { CallOutcome, RejectionReason, DialerQueueItem } from './types/dialerTypes';

const countryFlags: Record<string, string> = {
  ES: '🇪🇸',
  PT: '🇵🇹',
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  NL: '🇳🇱',
  BE: '🇧🇪',
  GB: '🇬🇧',
};

function formatTimerMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function PowerDialerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdParam = searchParams.get('campaignId');
  const queueItemIdParam = searchParams.get('queueItemId');
  const queueItemIdsParam = searchParams.get('queueItemIds');

  const {
    activeProfile,
    allProfiles,
    selectedCommercialKey,
    setSelectedCommercialKey,
    isCommercialOperator,
  } = useCommercialScope();

  // Respect active commercial operator's language (es for Alex/Alba/Ayslan/Liseth, fr for Fatumata, it for Giada)
  const operatorLangOverride = (activeProfile?.language as SupportedComercialLang | undefined) || null;
  const { tr } = useComercialLanguage(operatorLangOverride);

  const directAgendaItemIds = useMemo(() => {
    const ids: string[] = [];
    if (queueItemIdsParam) {
      queueItemIdsParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(id => {
          if (!ids.includes(id)) ids.push(id);
        });
    }
    if (queueItemIdParam && !ids.includes(queueItemIdParam)) {
      ids.push(queueItemIdParam);
    }
    return ids;
  }, [queueItemIdParam, queueItemIdsParam]);

  const { data: campaigns = [] } = useDialerCampaigns();
  const { data: allScripts = [] } = useSalesScripts();

  // Active Campaign State
  const activeCampaignId = useMemo(() => {
    if (campaignIdParam && campaigns.some(c => c.id === campaignIdParam)) {
      return campaignIdParam;
    }
    if (directAgendaItemIds.length > 0 && !campaignIdParam) {
      return null;
    }
    return campaigns.length > 0 ? campaigns[0].id : null;
  }, [campaignIdParam, campaigns, directAgendaItemIds.length]);

  const { data: activeCampaign } = useDialerCampaign(activeCampaignId);
  const { data: campaignQueue = [] } = useDialerQueue(activeCampaignId);
  const { data: directQueueItems = [] } = useDialerDirectQueueItems(directAgendaItemIds);

  const isDirectAgendaMode = useMemo(() => {
    return (
      directAgendaItemIds.length > 0 &&
      (!activeCampaignId ||
        Boolean(queueItemIdsParam) ||
        (directQueueItems.length > 0 && !campaignQueue.some(q => q.id === directQueueItems[0]?.id)))
    );
  }, [directAgendaItemIds.length, activeCampaignId, queueItemIdsParam, directQueueItems, campaignQueue]);

  const queue = useMemo(() => {
    if (isDirectAgendaMode && directQueueItems.length > 0) {
      return directQueueItems;
    }
    return campaignQueue;
  }, [isDirectAgendaMode, directQueueItems, campaignQueue]);

  const { logCallAndAdvance, isLoggingCall, createQuickPresupuesto } = useMutateDialer();

  // Script selection & expanded mode
  const [selectedScriptIdOverride, setSelectedScriptIdOverride] = useState<string | null>(null);
  const [isScriptExpanded, setIsScriptExpanded] = useState<boolean>(false);

  // Reset manual script override when switching commercial operator tab
  useEffect(() => {
    setSelectedScriptIdOverride(null);
  }, [activeProfile?.key, activeCampaignId]);

  const effectiveScript = useMemo(() => {
    if (selectedScriptIdOverride) {
      const found = allScripts.find(s => s.id === selectedScriptIdOverride);
      if (found) return found;
    }
    if (activeProfile) {
      const officialPrefix = `oficial_${activeProfile.key}_`;
      if (activeCampaign?.script && (activeCampaign.script.sector || '').startsWith(officialPrefix)) {
        return activeCampaign.script;
      }
      const matchedOfficial = allScripts.find(s => (s.sector || '').startsWith(officialPrefix));
      if (matchedOfficial) return matchedOfficial;
    }
    if (activeCampaign?.script) return activeCampaign.script;
    return allScripts[0] || null;
  }, [selectedScriptIdOverride, allScripts, activeProfile, activeCampaign?.script]);

  // Active Lead Pointer in Queue
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);

  // Instant Practical Attendance Stopwatch (NO external tel: popup!)
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [leadScreenSeconds, setLeadScreenSeconds] = useState(0);
  const [sessionCallsCount, setSessionCallsCount] = useState(0);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0);
  const timerRef = useRef<any>(null);
  const screenTimerRef = useRef<any>(null);

  // Call Outcomes Form State
  const [callNotes, setCallNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>('has_own_team');
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isGatekeeperModalOpen, setIsGatekeeperModalOpen] = useState(false);
  const [isPresupuestoModalOpen, setIsPresupuestoModalOpen] = useState(false);
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [activeLeadOverride, setActiveLeadOverride] = useState<Lead | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (queueItemIdParam && queue.length > 0) {
      const idx = queue.findIndex(q => q.id === queueItemIdParam);
      if (idx !== -1) {
        setCurrentQueueIndex(idx);
      }
    }
  }, [queueItemIdParam, queue]);

  // Selected Lead Data from Queue
  const currentQueueItem: DialerQueueItem | undefined = queue[currentQueueIndex] || queue[0];
  const currentLead: Lead | undefined = (activeLeadOverride && activeLeadOverride.id === currentQueueItem?.lead?.id)
    ? activeLeadOverride
    : currentQueueItem?.lead;

  // Reset override, notes, and screen timer when switching leads in the queue
  useEffect(() => {
    setActiveLeadOverride(null);
    setCallNotes('');
    setIsCalling(false);
    setCallDuration(0);
    setLeadScreenSeconds(0);
  }, [currentQueueIndex, currentQueueItem?.lead?.id]);

  // Passive time on current lead card (fallback if operator forgets to press Start before logging an answered call)
  useEffect(() => {
    if (!currentLead?.id) return;
    screenTimerRef.current = setInterval(() => {
      setLeadScreenSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (screenTimerRef.current) clearInterval(screenTimerRef.current);
    };
  }, [currentLead?.id]);

  const handleLeadUpdated = (updatedLead: Lead) => {
    setActiveLeadOverride(updatedLead);
    queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
    queryClient.invalidateQueries({ queryKey: ['dialer_direct_queue_items'] });
  };

  // History Logs for current lead
  const { data: leadHistory = [], isLoading: loadingHistory } = useLeadCallLogs(currentLead?.id);

  // Keep Index within bounds if queue updates
  useEffect(() => {
    if (currentQueueIndex >= queue.length && queue.length > 0) {
      setCurrentQueueIndex(0);
    }
  }, [queue.length, currentQueueIndex]);

  // Active Call Stopwatch effect
  useEffect(() => {
    if (isCalling) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCalling]);

  // Check for Priority Callbacks (due now)
  const dueCallback = useMemo(() => {
    const now = new Date().getTime();
    return queue.find(
      q => q.status === 'scheduled' && q.scheduled_for && new Date(q.scheduled_for).getTime() <= now
    );
  }, [queue]);

  const handleSelectCampaign = (cId: string) => {
    setSearchParams({ campaignId: cId });
    setCurrentQueueIndex(0);
    setCallDuration(0);
    setIsCalling(false);
  };

  // Instant Start / Resume Call Timer (NO tel: browser popup)
  const handleStartCall = () => {
    setIsCalling(true);
  };

  // Instant Stop / Lock Call Timer (keeps callDuration recorded while operator finishes notes/outcome)
  const handleEndCall = () => {
    setIsCalling(false);
  };

  const handleResetCallTimer = () => {
    setIsCalling(false);
    setCallDuration(0);
  };

  const handleAppendScriptToNotes = (snippet: string) => {
    setCallNotes(prev => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  const getLocalizedQueueStatus = (status?: string) => {
    switch (status) {
      case 'pending':
        return tr('Pendente', 'Pendiente', 'En attente', 'In attesa');
      case 'in_progress':
        return tr('Em Curso', 'En Curso', 'En cours', 'In corso');
      case 'scheduled':
        return tr('Agendado', 'Agendado', 'Planifié', 'Pianificato');
      case 'no_answer':
        return tr('Sem Resposta', 'Sin Respuesta', 'Sans réponse', 'Senza risposta');
      case 'converted':
        return tr('Convertido', 'Convertido', 'Converti', 'Convertito');
      case 'rejected':
        return tr('Recusado', 'Rechazado', 'Refusé', 'Rifiutato');
      case 'skipped':
        return tr('Pulado', 'Omitido', 'Ignoré', 'Saltato');
      default:
        return status || tr('Pendente', 'Pendiente', 'En attente', 'In attesa');
    }
  };

  const handleWhatsAppClick = () => {
    if (!currentLead?.phone) return;
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const brandName = activeProfile?.empresaName || 'Servicios Industriales';
    const message = encodeURIComponent(
      tr(
        `Hola, me pongo en contacto de ${brandName} respecto al refuerzo de personal técnico (soldadores, tuberos y montadores) para ${currentLead.company_name || 'su empresa'}.`,
        `Hola, me pongo en contacto de ${brandName} respecto al refuerzo de personal técnico (soldadores, tuberos y montadores) para ${currentLead.company_name || 'su empresa'}.`,
        `Bonjour, je vous contacte de la part de ${brandName} concernant le renfort de personnel technique (soudeurs, tuyauteurs et monteurs) pour ${currentLead.company_name || 'votre entreprise'}.`,
        `Buongiorno, La contatto da ${brandName} in merito al supporto di personale tecnico qualificato (saldatori, tubisti e carpentieri) per ${currentLead.company_name || 'la Sua azienda'}.`
      )
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const budgetFormUrl = currentLead ? `${window.location.origin}/public/solicitar-presupuesto?lead_id=${currentLead.id}` : '';
  const fiscalFormUrl = currentLead ? `${window.location.origin}/public/coleta-dados/${currentLead.id}` : '';

  const handleCopyBudgetLink = () => {
    if (!budgetFormUrl) return;
    navigator.clipboard.writeText(budgetFormUrl);
    toast.success(
      tr(
        'Link de solicitação de orçamento copiado!',
        '¡Enlace de solicitud de presupuesto copiado!',
        'Lien de demande de devis copié !',
        'Link richiesta preventivo copiato!'
      )
    );
  };

  const handleCopyFiscalLink = () => {
    if (!fiscalFormUrl) return;
    navigator.clipboard.writeText(fiscalFormUrl);
    toast.success(
      tr(
        'Link da ficha cadastral (CIF) copiado!',
        '¡Enlace de la ficha de registro (CIF) copiado!',
        'Lien de la fiche fiscale copié !',
        'Link scheda dati fiscali (P.IVA) copiato!'
      )
    );
  };

  const handleSendBudgetWhatsApp = () => {
    if (!currentLead?.phone) {
      toast.error(
        tr(
          'Lead não possui telefone cadastrado.',
          'El lead no tiene teléfono registrado.',
          'Ce lead n’a pas de téléphone enregistré.',
          'Il cliente non ha un numero di telefono registrato.'
        )
      );
      return;
    }
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      tr(
        `Hola, le comparto el enlace directo para detallar los perfiles de operarios (soldadores, tuberos, etc.) y necesidades de su obra para preparar el presupuesto:\n\n${budgetFormUrl}`,
        `Hola, le comparto el enlace directo para detallar los perfiles de operarios (soldadores, tuberos, etc.) y necesidades de su obra para preparar el presupuesto:\n\n${budgetFormUrl}`,
        `Bonjour, voici le lien direct pour détailler les profils d’opérateurs (soudeurs, tuyauteurs, etc.) et les besoins de votre chantier afin de préparer le devis :\n\n${budgetFormUrl}`,
        `Buongiorno, condivido il link diretto per indicare i profili tecnici (saldatori, tubisti, carpentieri) e le esigenze del cantiere per preparare il preventivo:\n\n${budgetFormUrl}`
      )
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleSendFiscalWhatsApp = () => {
    if (!currentLead?.phone) {
      toast.error(
        tr(
          'Lead não possui telefone cadastrado.',
          'El lead no tiene teléfono registrado.',
          'Ce lead n’a pas de téléphone enregistré.',
          'Il cliente non ha un numero di telefono registrato.'
        )
      );
      return;
    }
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      tr(
        `Hola, le comparto el enlace de la ficha de registro para confirmar los datos fiscales (CIF/NIF, Razón Social y facturación) de ${currentLead.company_name || 'su empresa'}:\n\n${fiscalFormUrl}`,
        `Hola, le comparto el enlace de la ficha de registro para confirmar los datos fiscales (CIF/NIF, Razón Social y facturación) de ${currentLead.company_name || 'su empresa'}:\n\n${fiscalFormUrl}`,
        `Bonjour, voici le lien de la fiche d’enregistrement pour confirmer les données fiscales (SIRET/TVA, Raison Sociale et facturation) de ${currentLead.company_name || 'votre entreprise'} :\n\n${fiscalFormUrl}`,
        `Buongiorno, condivido il link della scheda anagrafica per confermare i dati fiscali (Partita IVA, Ragione Sociale e fatturazione) di ${currentLead.company_name || 'la Sua azienda'}:\n\n${fiscalFormUrl}`
      )
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleOutcomeSubmit = async (
    outcome: CallOutcome, 
    customCallback?: string,
    customPriority: 'high' | 'normal' | 'low' = 'normal',
    customNotes?: string,
    customTags?: string[]
  ) => {
    if (!currentQueueItem || !currentLead) return;

    // Use explicit stopwatch duration if started, or passive screen time if an answered call happened without pressing Start
    const effectiveDuration =
      callDuration > 0
        ? callDuration
        : outcome.startsWith('answered') || outcome === 'gatekeeper_blocked'
        ? Math.min(leadScreenSeconds, 1800)
        : 0;

    try {
      setIsCalling(false);
      await logCallAndAdvance({
        queueItemId: currentQueueItem.id,
        campaignId: currentQueueItem.campaign_id || activeCampaignId || null,
        leadId: currentLead.id,
        outcome,
        durationSeconds: effectiveDuration,
        notes: customNotes || callNotes,
        phoneCalled: currentLead.phone,
        contactPerson: currentLead.name,
        scheduledCallbackAt: customCallback || null,
        priority: customPriority,
        tags: customTags,
        rejectionReason: outcome === 'answered_rejected' ? rejectionReason : null,
      });

      setSessionCallsCount(prev => prev + 1);
      setSessionTotalSeconds(prev => prev + effectiveDuration);

      // Clear local states
      setCallNotes('');
      setCallDuration(0);
      setLeadScreenSeconds(0);

      toast.success(
        outcome === 'answered_converted' 
          ? tr('🎉 Lead convertido com sucesso!', '🎉 ¡Lead convertido con éxito!', '🎉 Lead converti avec succès !', '🎉 Cliente convertito con successo!')
          : outcome === 'answered_callback'
          ? tr('📅 Retorno agendado com sucesso na Agenda!', '📅 ¡Llamada de seguimiento agendada con éxito!', '📅 Rappel planifié avec succès dans l’Agenda !', '📅 Richiamo pianificato con successo in Agenda!')
          : outcome === 'answered_interested'
          ? tr('E-mail com material comercial registrado!', '¡Correo con material comercial registrado!', 'E-mail avec documentation commerciale enregistré !', 'E-mail con materiale commerciale registrata!')
          : outcome === 'gatekeeper_blocked'
          ? tr('Contato com a recepção registrado!', '¡Contacto con recepción registrado!', 'Contact avec la réception enregistré !', 'Contatto con la reception registrato!')
          : outcome === 'no_answer'
          ? tr('Lead movido para o rodízio no fim da fila.', 'Lead movido al final de la cola.', 'Lead déplacé à la fin de la file.', 'Lead spostato in fondo alla coda.')
          : tr('Atendimento registrado!', '¡Atención registrada!', 'Appel enregistré !', 'Chiamata registrata!')
      );

      // Advance to next lead
      if (currentQueueIndex < queue.length - 1) {
        setCurrentQueueIndex(prev => prev + 1);
      } else {
        setCurrentQueueIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message ||
          tr(
            'Erro ao registrar desfecho',
            'Error al registrar resultado',
            'Erreur lors de l’enregistrement du résultat',
            'Errore durante la registrazione dell’esito'
          )
      );
    }
  };

  const handleSavePresupuesto = async (payload: any) => {
    try {
      const createdEst = await createQuickPresupuesto(payload);
      await handleOutcomeSubmit('answered_converted');
      toast.success(
        payload?.existing_estimacion_id
          ? tr('🎉 Orçamento atualizado com sucesso!', '🎉 ¡Presupuesto actualizado con éxito!', '🎉 Devis mis à jour avec succès !', '🎉 Preventivo aggiornato con successo!')
          : tr('🎉 Pré-orçamento gerado com sucesso!', '🎉 ¡Pre-presupuesto generado con éxito!', '🎉 Pré-devis généré avec succès !', '🎉 Pre-preventivo generato con successo!'),
        {
          action: {
            label: tr('Ver Orçamento', 'Ver Presupuesto', 'Voir le Devis', 'Vedi Preventivo'),
            onClick: () => navigate(`/comercial/estimaciones/${createdEst.id}`),
          },
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message ||
          tr(
            'Erro ao gerar pré-orçamento',
            'Error al generar pre-presupuesto',
            'Erreur lors de la génération du pré-devis',
            'Errore nella generazione del preventivo'
          )
      );
    }
  };

  const handleConfirmScheduleCallback = async (
    scheduledIso: string, 
    richNotes: string, 
    priority: 'high' | 'normal' | 'low',
    tags: string[]
  ) => {
    setIsCallbackModalOpen(false);
    setCallNotes(richNotes);
    await handleOutcomeSubmit('answered_callback', scheduledIso, priority, richNotes, tags);
  };

  const handleConfirmSendMaterial = async (_materialTitle: string, _emailUsed: string, notes: string) => {
    setIsMaterialModalOpen(false);
    await handleOutcomeSubmit('answered_interested', undefined, 'normal', notes);
  };

  const handleConfirmGatekeeper = async (notes: string, actionType: 'requeue_end' | 'schedule_tomorrow', scheduledIso?: string) => {
    setIsGatekeeperModalOpen(false);
    if (actionType === 'schedule_tomorrow' && scheduledIso) {
      await handleOutcomeSubmit('answered_callback', scheduledIso, 'normal', notes);
    } else {
      await handleOutcomeSubmit('gatekeeper_blocked', undefined, 'normal', notes);
    }
  };

  const handleNextLead = () => {
    if (currentQueueIndex < queue.length - 1) {
      setCurrentQueueIndex(prev => prev + 1);
      setCallDuration(0);
      setIsCalling(false);
    }
  };

  const handlePrevLead = () => {
    if (currentQueueIndex > 0) {
      setCurrentQueueIndex(prev => prev - 1);
      setCallDuration(0);
      setIsCalling(false);
    }
  };

  // Queue Statistics
  const totalQueue = queue.length;
  const completedCount = queue.filter(q => ['converted', 'rejected', 'skipped'].includes(q.status)).length;
  const progressPercent = totalQueue > 0 ? Math.round((completedCount / totalQueue) * 100) : 0;

  // Render Outcomes Panel (reusable so it sits cleanly in col-span-3 or stacked when script is ultra-expanded)
  const outcomesPanel = (
    <div className="p-4 xl:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          {tr('Desfecho do Atendimento', 'Resultado de la Llamada', 'Résultat de l’Appel', 'Esito della Chiamata')}
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
          {tr('1-Clique', '1-Clic', '1-Clic', '1-Clic')}
        </span>
      </div>

      {/* Primary Outcomes: Gerar Orçamento ou Coletar Demanda */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => setIsPresupuestoModalOpen(true)}
          disabled={isLoggingCall}
          className="h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] px-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-left leading-tight truncate">
            <span className="block font-black truncate">
              {tr('Gerar Orçamento', 'Generar Presupuesto', 'Générer un Devis', 'Genera Preventivo')}
            </span>
            <span className="text-[10px] opacity-85 font-normal block truncate">
              {tr('Tarifas & Valores', 'Tarifas y Valores', 'Tarifs & Montants', 'Tariffe e Valori')}
            </span>
          </span>
        </Button>

        <Button
          onClick={() => setIsDemandModalOpen(true)}
          disabled={isLoggingCall}
          className="h-12 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] px-2.5"
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span className="text-left leading-tight truncate">
            <span className="block font-black truncate">
              {tr('Coletar Demanda', 'Recopilar Demanda', 'Collecter Demande', 'Raccogli Fabbisogno')}
            </span>
            <span className="text-[10px] opacity-85 font-normal block truncate">
              {tr('Perfis & Obra', 'Perfiles y Obra', 'Profils & Chantier', 'Profili e Cantiere')}
            </span>
          </span>
        </Button>
      </div>

      {/* Secondary Outcomes Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Não Atendeu / Ocupado (Rodízio) */}
        <Button
          variant="outline"
          onClick={() => handleOutcomeSubmit('no_answer')}
          disabled={isLoggingCall}
          className="h-11 bg-background hover:bg-muted text-amber-600 dark:text-amber-300 text-xs font-semibold flex items-center justify-start gap-2 px-2.5 border-input rounded-xl"
        >
          <PhoneOff className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="text-left leading-tight truncate">
            <p className="font-bold truncate">{tr('Não Atendeu', 'No Contestó', 'Pas de Réponse', 'Non Risponde')}</p>
            <span className="text-[10px] text-muted-foreground block truncate">
              {tr('Fim da fila', 'Fin de la cola', 'Fin de file', 'Fine coda')}
            </span>
          </div>
        </Button>

        {/* Agendar Retorno (Callback) */}
        <Button
          variant="outline"
          onClick={() => setIsCallbackModalOpen(true)}
          disabled={isLoggingCall}
          className="h-11 bg-background hover:bg-muted text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center justify-start gap-2 px-2.5 border-input rounded-xl"
        >
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="text-left leading-tight truncate">
            <p className="font-bold truncate">{tr('Agendar Retorno', 'Agendar Llamada', 'Planifier Rappel', 'Pianifica Richiamo')}</p>
            <span className="text-[10px] text-muted-foreground block truncate">Callback</span>
          </div>
        </Button>

        {/* Pediu Envio de Apresentação / Email */}
        <Button
          variant="outline"
          onClick={() => setIsMaterialModalOpen(true)}
          disabled={isLoggingCall}
          className="h-11 bg-background hover:bg-muted text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-start gap-2 px-2.5 border-input rounded-xl"
        >
          <Globe className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="text-left leading-tight truncate">
            <p className="font-bold truncate">{tr('Pediu Material', 'Pidió Material', 'Demande Infos', 'Richiede Materiale')}</p>
            <span className="text-[10px] text-muted-foreground block truncate">
              {tr('Enviar e-mail', 'Enviar correo', 'Envoyer e-mail', 'Invia e-mail')}
            </span>
          </div>
        </Button>

        {/* Barrado na Recepção */}
        <Button
          variant="outline"
          onClick={() => setIsGatekeeperModalOpen(true)}
          disabled={isLoggingCall}
          className="h-11 bg-background hover:bg-muted text-orange-600 dark:text-orange-300 text-xs font-semibold flex items-center justify-start gap-2 px-2.5 border-input rounded-xl"
        >
          <PhoneForwarded className="w-4 h-4 text-orange-500 shrink-0" />
          <div className="text-left leading-tight truncate">
            <p className="font-bold truncate">{tr('Recepção', 'Recepción', 'Standard', 'Reception')}</p>
            <span className="text-[10px] text-muted-foreground block truncate">
              {tr('Sem decisor', 'Sin decisor', 'Sans décideur', 'Senza decisore')}
            </span>
          </div>
        </Button>
      </div>

      {/* Rejection / Blacklist Section */}
      <div className="p-3 rounded-xl bg-rose-500/5 dark:bg-slate-950/70 border border-rose-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5" /> {tr('Sem Interesse / Recusa', 'Sin Interés / Rechazo', 'Sans Intérêt / Refus', 'Nessun Interesse / Rifiuto')}
          </span>
        </div>

        <Select value={rejectionReason} onValueChange={(v: any) => setRejectionReason(v)}>
          <SelectTrigger className="bg-background text-foreground border-input text-xs h-8">
            <SelectValue placeholder={tr('Selecione o motivo...', 'Selecione el motivo...', 'Sélectionnez le motif...', 'Seleziona il motivo...')} />
          </SelectTrigger>
          <SelectContent className="bg-card text-card-foreground border-border text-xs">
            <SelectItem value="has_own_team">
              {tr('Já possui equipe própria / Fixos', 'Ya tiene equipo propio / Fijos', 'Possède déjà sa propre équipe', 'Ha già squadra interna / Fissi')}
            </SelectItem>
            <SelectItem value="no_demand">
              {tr('Sem obras no momento', 'Sin obras en este momento', 'Pas de chantier en ce moment', 'Nessun cantiere al momento')}
            </SelectItem>
            <SelectItem value="price_too_high">
              {tr('Preço acima da meta', 'Precio por encima del objetivo', 'Tarif au-dessus du budget', 'Tariffa oltre il budget')}
            </SelectItem>
            <SelectItem value="does_not_outsource">
              {tr('Não terceiriza montagem/solda', 'No subcontrata montaje/soldadura', 'Ne sous-traite pas montage/soudure', 'Non esternalizza montaggio/saldatura')}
            </SelectItem>
            <SelectItem value="bad_contact">
              {tr('Número incorreto / Inexistente', 'Número incorrecto / Inexistente', 'Numéro incorrect / Inexistant', 'Numero errato / Inesistente')}
            </SelectItem>
            <SelectItem value="other">
              {tr('Outros motivos', 'Otros motivos', 'Autres motifs', 'Altri motivi')}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={() => handleOutcomeSubmit('answered_rejected')}
          disabled={isLoggingCall}
          className="w-full h-8 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-semibold gap-1.5"
        >
          <Ban className="w-3.5 h-3.5" />
          {tr('Registrar Recusa & Blacklist', 'Registrar Rechazo y Blacklist', 'Enregistrer Refus & Blacklist', 'Registra Rifiuto e Blacklist')}
        </Button>
      </div>

      {/* Notes for this specific call */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            {tr('Anotações da Ligação', 'Notas de la Llamada', 'Notes de l’Appel', 'Note della Chiamata')}
          </Label>
          {callNotes && (
            <button
              type="button"
              onClick={() => setCallNotes('')}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              {tr('Limpar', 'Limpiar', 'Effacer', 'Pulisci')}
            </button>
          )}
        </div>
        <Textarea
          value={callNotes}
          onChange={e => setCallNotes(e.target.value)}
          placeholder={tr(
            'Ex: Sr. Pedro disse que em outubro terá parada de refinaria (2 TIG 6G Inox)...',
            'Ej: El Sr. Pedro indicó parada en octubre (2 Soldadores TIG 6G Inox, turno diurno)...',
            'Ex : M. Pierre a indiqué un arrêt en octobre (2 Soudeurs TIG 6G Inox)...',
            'Es: Il Sig. Marco ha indicato fermata ad ottobre (2 Saldatori TIG 6G Inox)...'
          )}
          rows={4}
          className="bg-background border-input text-foreground text-xs leading-relaxed"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background text-foreground flex flex-col">
      {/* Top Header & Navigation Bar — Full Width */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-3 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Brand & Campaign Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-base font-black text-foreground tracking-tight">Power Dialer</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  Cockpit SDR
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {tr(
                  'Prospecção Ativa & Gestão de Atendimento',
                  'Prospección Activa y Control de Atención',
                  'Prospection Active & Suivi des Appels',
                  'Prospezione Attiva e Controllo Chiamate'
                )}
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Commercial Scope Filter */}
          {isCommercialOperator && activeProfile ? (
            <div className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
              <span>{activeProfile.flag}</span>
              <span>{activeProfile.shortName}</span>
              <span className="text-[10px] opacity-80">({activeProfile.empresaName})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCommercialKey('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCommercialKey === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tr('Todos', 'Todos', 'Tous', 'Tutti')}
              </button>
              {allProfiles.map(prof => (
                <button
                  key={prof.key}
                  type="button"
                  onClick={() => setSelectedCommercialKey(prof.key)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    selectedCommercialKey === prof.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{prof.flag}</span>
                  <span>{prof.shortName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Campaign Selector */}
          <div className="flex items-center gap-1.5">
            <Select value={activeCampaignId || ''} onValueChange={handleSelectCampaign}>
              <SelectTrigger className="bg-background text-foreground border-input text-xs h-8 w-[210px] sm:w-[270px]">
                <SelectValue placeholder={tr('Selecione o Trabalho / Fila...', 'Seleccione el Trabajo / Cola...', 'Sélectionnez le Lot / File...', 'Seleziona Lavoro / Coda...')} />
              </SelectTrigger>
              <SelectContent className="bg-card text-card-foreground border-border">
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.title} ({c.items_count?.pending || 0} {tr('pend.', 'pend.', 'att.', 'att.')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: Quick Links to Sub-Modules */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/agenda')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5 px-2.5"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            {tr('Agenda', 'Agenda', 'Agenda', 'Agenda')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/trabalhos')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5 px-2.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            {tr('Trabalhos', 'Trabajos', 'Lots', 'Lavori')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/supervisao')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5 px-2.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            {tr('Relatório & KPIs', 'Tiempos y KPIs', 'Temps & KPIs', 'Tempi e KPI')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/operadores')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5 px-2.5"
          >
            <User className="w-3.5 h-3.5 text-purple-500" />
            {tr('Scripts', 'Guiones', 'Scripts', 'Script')}
          </Button>
        </div>
      </header>

      {/* Main Viewport — Expanded Width (max-w-[1920px], reduced lateral margins) */}
      <main className="flex-1 px-2.5 sm:px-4 lg:px-5 py-3.5 max-w-[1920px] mx-auto w-full flex flex-col gap-3.5">
        {/* Direct Agenda Selection Mode Banner */}
        {isDirectAgendaMode && (
          <div className="p-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/40 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  {tr(
                    `Modo Atendimento da Agenda (${queue.length})`,
                    `Modo Atención de Agenda (${queue.length})`,
                    `Mode Appels de l’Agenda (${queue.length})`,
                    `Modalità Chiamate Agenda (${queue.length})`
                  )}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {tr(
                    'Atendendo diretamente os retornos selecionados na Agenda, com tags e anotações preservadas.',
                    'Atendiendo directamente los seguimientos seleccionados en la Agenda, con etiquetas y notas preservadas.',
                    'Traitement direct des rappels sélectionnés dans l’Agenda, avec tags et notes conservés.',
                    'Gestione diretta dei richiami selezionati in Agenda, con tag e note preservati.'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/comercial/discador/agenda')}
                className="h-8 text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 font-semibold"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                {tr('Voltar à Agenda', 'Volver a la Agenda', 'Retour à l’Agenda', 'Torna in Agenda')}
              </Button>
              {campaigns.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectCampaign(campaigns[0].id)}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  {tr('Ir para Trabalhos', 'Ir a Trabajos', 'Aller aux Lots', 'Vai ai Lavori')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Priority Callback Alert Banner */}
        {dueCallback && (
          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/50 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider">
                  {tr(
                    'Retorno Agendado com Prioridade Máxima',
                    'Seguimiento Agendado con Prioridad Máxima',
                    'Rappel Planifié avec Priorité Maximale',
                    'Richiamo Pianificato con Priorità Massima'
                  )}
                </h4>
                <p className="text-xs text-foreground">
                  <strong className="font-bold">{dueCallback.lead.company_name || dueCallback.lead.name}</strong> •{' '}
                  {dueCallback.lead.name} ({dueCallback.lead.phone})
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                const targetIdx = queue.findIndex(q => q.id === dueCallback.id);
                if (targetIdx !== -1) setCurrentQueueIndex(targetIdx);
              }}
              className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5 shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              {tr('Atender Agora', 'Atender Ahora', 'Appeler Maintenant', 'Atendi Ora')}
            </Button>
          </div>
        )}

        {/* Compact Top Queue Progress & Session Productivity Bar */}
        <div className="px-4 py-2.5 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Queue Counter & Progress */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                {tr('Fila:', 'Cola:', 'File :', 'Coda:')}
              </span>
              <span className="text-sm font-black text-foreground px-2.5 py-0.5 rounded-xl bg-muted/60 border border-border">
                Lead {totalQueue > 0 ? currentQueueIndex + 1 : 0}{' '}
                <span className="text-muted-foreground font-normal">
                  {tr('de', 'de', 'sur', 'di')} {totalQueue}
                </span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 w-44">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{progressPercent}%</span>
            </div>

            {/* Session Stats Pill */}
            <div className="hidden xl:flex items-center gap-3 pl-3 border-l border-border text-xs">
              <span className="text-muted-foreground">
                {tr('Sessão hoje:', 'Sesión hoy:', 'Session :', 'Sessione:')}
              </span>
              <Badge variant="outline" className="font-mono text-[11px] bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                📞 {sessionCallsCount} {tr('atendimentos', 'atenciones', 'appels', 'chiamate')}
              </Badge>
              {sessionTotalSeconds > 0 && (
                <Badge variant="outline" className="font-mono text-[11px] bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                  ⏱ {formatTimerMMSS(sessionTotalSeconds)} {tr('acumulado', 'acumulado', 'cumulé', 'totale')}
                </Badge>
              )}
            </div>
          </div>

          {/* Synced Stopwatch & Lead Navigation */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-xl border font-mono text-xs transition-colors ${
                isCalling
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : callDuration > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                  : 'bg-muted/60 border-border text-foreground'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isCalling
                    ? 'bg-emerald-500 animate-ping'
                    : callDuration > 0
                    ? 'bg-amber-500'
                    : 'bg-muted-foreground/50'
                }`}
              />
              <span className="text-[10px] uppercase font-sans font-bold opacity-80">
                {isCalling
                  ? tr('Em Chamada:', 'En Llamada:', 'En Appel :', 'In Chiamata:')
                  : callDuration > 0
                  ? tr('Tempo Gravado:', 'Tiempo Grabado:', 'Temps Enregistré :', 'Tempo Registrato:')
                  : tr('Tempo:', 'Tiempo:', 'Temps :', 'Tempo:')}
              </span>
              <span className="font-black text-sm">{formatTimerMMSS(callDuration)}</span>
            </div>

            {isCalling ? (
              <Button
                size="sm"
                onClick={handleEndCall}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-8 gap-1.5 px-3 shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {tr('Encerrar Chamada', 'Encerrar Llamada', 'Terminer l’Appel', 'Termina Chiamata')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStartCall}
                disabled={!currentLead}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1.5 px-3 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {callDuration > 0
                  ? tr('Retomar Tempo', 'Reanudar Tiempo', 'Reprendre', 'Riprendi')
                  : tr('Iniciar Chamada', 'Iniciar Llamada', 'Démarrer l’Appel', 'Avvia Chiamata')}
              </Button>
            )}

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevLead}
                disabled={currentQueueIndex === 0}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={tr('Lead Anterior', 'Lead Anterior', 'Lead Précédent', 'Cliente Precedente')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextLead}
                disabled={currentQueueIndex >= totalQueue - 1}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={tr('Próximo Lead', 'Siguiente Lead', 'Lead Suivant', 'Cliente Successivo')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Core Cockpit Grid: Wide Asymmetric Layout */}
        {!currentLead ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-4 my-8">
            <PhoneOff className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">
              {tr(
                'Nenhum lead pendente nesta fila',
                'Ningún lead pendiente en esta cola',
                'Aucun lead en attente dans cette file',
                'Nessun cliente in attesa in questa coda'
              )}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {tr(
                'Todos os leads deste lote foram processados ou a fila está vazia. Selecione outro trabalho ou gere um novo lote na base de leads.',
                'Todos los leads de este lote fueron procesados o la cola está vacía. Seleccione otro trabajo o genere un nuevo lote en la base de leads.',
                'Tous les leads de ce lot ont été traités ou la file est vide. Sélectionnez un autre lot ou créez-en un nouveau depuis la base de leads.',
                'Tutti i contatti di questo lavoro sono stati elaborati o la coda è vuota. Seleziona un altro lavoro o genera una nuova coda.'
              )}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => navigate('/comercial/discador/trabalhos')}
                variant="outline"
                className="text-xs font-semibold"
              >
                {tr('Ver Outros Trabalhos', 'Ver Otros Trabajos', 'Voir les Autres Lots', 'Vedi Altri Lavori')}
              </Button>
              <Button
                onClick={() => navigate('/comercial/leads')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {tr('Ir para Base de Leads', 'Ir a Base de Leads', 'Aller à la Base de Leads', 'Vai ai Contatti')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Lead 360 + Practical Instant Call Control (3 cols normal, 4 cols when Script ultra-expanded) */}
            <div className={`${isScriptExpanded ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-4`}>
              <div className="p-4 xl:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3.5">
                {/* Company Title & Flag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0" title={currentLead.country_id || 'ES'}>
                        {countryFlags[currentLead.country_id || 'ES'] || '🇪🇸'}
                      </span>
                      <h2 className="text-base font-black text-foreground leading-tight break-words">
                        {currentLead.company_name || currentLead.name}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>
                        {currentLead.city || currentLead.province || tr('Espanha', 'España', 'France', 'Italia')} •{' '}
                        {currentLead.sector || tr('Industrial', 'Industrial', 'Industriel', 'Industriale')}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {currentLead.do_not_call ? (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        Blacklist
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 text-[10px] uppercase font-bold">
                        {getLocalizedQueueStatus(currentQueueItem.status)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditLeadModalOpen(true)}
                      className="h-6 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold gap-1 px-2"
                    >
                      <Edit className="w-3 h-3 text-amber-500" />
                      {tr('Editar', 'Editar', 'Modifier', 'Modifica')}
                    </Button>
                  </div>
                </div>

                {/* PRACTICAL INSTANT CALL & TIME CONTROL RIGHT NEXT TO CLIENT NAME/PHONE */}
                <div
                  className={`p-3 rounded-xl border-2 transition-all space-y-2.5 ${
                    isCalling
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                      : callDuration > 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-indigo-500/30'
                  }`}
                >
                  {/* Phone Number Prominent Display */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className={`w-4 h-4 shrink-0 ${isCalling || callDuration > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-400'}`} />
                      <span
                        className={`font-mono text-base font-black tracking-tight select-all truncate ${
                          isCalling || callDuration > 0 ? 'text-foreground' : 'text-white'
                        }`}
                      >
                        {currentLead.phone || tr('Sem telefone', 'Sin teléfono', 'Sans téléphone', 'Senza telefono')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentLead.phone) {
                            navigator.clipboard.writeText(currentLead.phone);
                            toast.success(tr('Telefone copiado!', '¡Teléfono copiado!', 'Téléphone copié !', 'Telefono copiato!'));
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isCalling || callDuration > 0
                            ? 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            : 'hover:bg-white/15 text-slate-300 hover:text-white'
                        }`}
                        title={tr('Copiar Telefone', 'Copiar Teléfono', 'Copier le Téléphone', 'Copia Telefono')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleWhatsAppClick}
                        disabled={!currentLead.phone}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WA
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Open / Close Attendance Button + Live Counter */}
                  <div className="flex items-center gap-2">
                    {isCalling ? (
                      <>
                        <div className="flex-1 px-3 py-2 rounded-xl bg-background/90 border border-emerald-500/40 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 uppercase">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            {tr('Atendendo', 'En Atención', 'En Appel', 'In Corso')}
                          </span>
                          <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
                            {formatTimerMMSS(callDuration)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={handleEndCall}
                          className="h-10 px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl gap-1.5 shadow-md shadow-rose-600/20 shrink-0"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          {tr('Encerrar', 'Encerrar', 'Terminer', 'Termina')}
                        </Button>
                      </>
                    ) : callDuration > 0 ? (
                      <>
                        <div className="flex-1 px-3 py-2 rounded-xl bg-background/90 border border-amber-500/40 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-amber-500" />
                            {tr('Duração:', 'Duración:', 'Durée :', 'Durata:')}
                          </span>
                          <span className="font-mono text-sm font-black text-foreground">
                            {formatTimerMMSS(callDuration)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleStartCall}
                          className="h-9 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1"
                          title={tr('Continuar cronômetro', 'Continuar cronómetro', 'Reprendre le chrono', 'Riprendi timer')}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {tr('Retomar', 'Seguir', 'Reprendre', 'Riprendi')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetCallTimer}
                          className="h-9 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          title={tr('Zerar tempo', 'Reiniciar tiempo', 'Réinitialiser', 'Azzera')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleStartCall}
                        className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl gap-2 shadow-md shadow-emerald-500/20 transition-transform active:scale-[0.99]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        {tr(
                          'Abrir Atendimento (Iniciar Tempo)',
                          'Iniciar Llamada / Abrir Tiempo',
                          'Démarrer l’Appel (Ouvrir Chrono)',
                          'Avvia Chiamata (Apri Tempo)'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Scheduled Callback Alert Box if lead was scheduled */}
                {currentQueueItem.scheduled_for && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5 uppercase text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {tr('Retorno Agendado', 'Seguimiento Agendado', 'Rappel Planifié', 'Richiamo Pianificato')}
                      </span>
                      <Badge className={
                        currentQueueItem.priority === 'high' 
                          ? 'bg-rose-500 text-white text-[10px]' 
                          : 'bg-amber-500 text-white text-[10px]'
                      }>
                        {currentQueueItem.priority === 'high'
                          ? tr('🔥 Alta', '🔥 Alta', '🔥 Haute', '🔥 Alta')
                          : tr('⚡ Agendado', '⚡ Agendado', '⚡ Planifié', '⚡ Pianificato')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {(() => {
                          try {
                            const d = typeof currentQueueItem.scheduled_for === 'string'
                              ? parseISO(currentQueueItem.scheduled_for)
                              : new Date(currentQueueItem.scheduled_for);
                            return format(d, "dd/MM/yyyy '•' HH:mm");
                          } catch {
                            return String(currentQueueItem.scheduled_for);
                          }
                        })()}
                      </div>
                      {currentQueueItem.origin_campaign_title && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border truncate max-w-full">
                          {currentQueueItem.origin_campaign_title}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const itemTags = extractTagsFromAppointment(
                        currentQueueItem.tags,
                        currentQueueItem.scheduled_notes
                      );
                      if (itemTags.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {itemTags.map(tag => (
                            <Badge
                              key={tag}
                              className="bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      );
                    })()}

                    {currentQueueItem.scheduled_notes && (
                      <div className="pt-1.5 border-t border-amber-500/20 space-y-1">
                        <div 
                          className="p-2 rounded-lg bg-background/90 border border-border text-foreground text-[11px] leading-relaxed max-h-28 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: currentQueueItem.scheduled_notes }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Person + Email/Web */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-xs border border-indigo-500/20 shrink-0">
                      {currentLead.name ? currentLead.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {currentLead.name || tr('Decisor / Compras', 'Decisor / Compras', 'Décideur / Achats', 'Decisore / Acquisti')}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {currentLead.cargo || tr('Responsável Técnico / Produção', 'Responsable Técnico / Producción', 'Responsable Technique / Production', 'Responsabile Tecnico / Produzione')}
                      </p>
                    </div>
                  </div>

                  {(currentLead.email || currentLead.website) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      {currentLead.email && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentLead.email!);
                            toast.success(tr('E-mail copiado!', '¡Correo copiado!', 'E-mail copié !', 'E-mail copiata!'));
                          }}
                          className="p-2 rounded-lg bg-background border border-border text-foreground/80 hover:text-foreground truncate flex items-center gap-1.5 text-left"
                          title={currentLead.email}
                        >
                          <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate">{currentLead.email}</span>
                        </button>
                      )}
                      {currentLead.website && (
                        <a
                          href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-background border border-border text-foreground/80 hover:text-foreground truncate flex items-center gap-1.5"
                          title={currentLead.website}
                        >
                          <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">Website</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Links & Formulários Comerciais do Lead */}
                <div className="p-3.5 rounded-xl bg-muted/35 border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {tr('Formulários na Chamada', 'Formularios en Llamada', 'Formulaires d’Appel', 'Moduli in Chiamata')}
                    </span>
                  </div>

                  {/* 1. Demanda de Obra & Perfis */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">
                        📋 {tr('Demanda & Perfis', 'Demanda y Perfiles', 'Demande & Profils', 'Fabbisogno e Profili')}
                      </span>
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                        {tr('Orçamento', 'Presupuesto', 'Devis', 'Preventivo')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => setIsDemandModalOpen(true)}
                        className="h-7 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 px-2"
                      >
                        <Wrench className="w-3 h-3" />
                        {tr('Preencher', 'Completar', 'Remplir', 'Compila')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyBudgetLink}
                        className="h-7 text-[11px] border-input gap-1 px-2"
                      >
                        <Copy className="w-3 h-3" /> Link
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSendBudgetWhatsApp}
                        disabled={!currentLead.phone}
                        className="h-7 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1 font-semibold px-2"
                      >
                        <MessageSquare className="w-3 h-3" /> WA
                      </Button>
                    </div>
                  </div>

                  {/* 2. Ficha Cadastral (CIF / NIF / SIRET / P.IVA) */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">
                        🏢 {tr('Ficha Fiscal (CIF)', 'Ficha Fiscal (CIF)', 'Fiche Fiscale (SIRET)', 'Dati Fiscali (P.IVA)')}
                      </span>
                      {currentLead.tax_id ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                          ✓ {currentLead.tax_id}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                          {tr('Pendente', 'Sin CIF', 'Sans SIRET', 'Senza P.IVA')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => setIsFiscalModalOpen(true)}
                        className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1 px-2"
                      >
                        <Building2 className="w-3 h-3" />
                        {tr('Preencher', 'Completar', 'Remplir', 'Compila')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyFiscalLink}
                        className="h-7 text-[11px] border-input gap-1 px-2"
                      >
                        <Copy className="w-3 h-3" /> Link
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSendFiscalWhatsApp}
                        disabled={!currentLead.phone}
                        className="h-7 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1 font-semibold px-2"
                      >
                        <MessageSquare className="w-3 h-3" /> WA
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Previous Notes */}
                {currentLead.notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {tr('Notas do Lead:', 'Notas del Lead:', 'Notes du Lead :', 'Note del Cliente:')}
                    </span>
                    <p className="text-foreground/90 line-clamp-3 text-[11px]">{currentLead.notes}</p>
                  </div>
                )}

                {/* Call History Timeline */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {tr('Histórico de Contatos', 'Historial de Contactos', 'Historique des Contacts', 'Cronologia Contatti')} ({leadHistory.length})
                  </span>
                  <div className="max-h-48 overflow-y-auto pr-1">
                    <LeadCallHistoryTimeline
                      logs={leadHistory}
                      isLoading={loadingHistory}
                      overrideLang={operatorLangOverride}
                    />
                  </div>
                </div>
              </div>

              {/* When Script is in Ultra-Expanded Mode (8 cols), keep Outcomes accessible right below Lead! */}
              {isScriptExpanded && outcomesPanel}
            </div>

            {/* Center Spotlight Column: Interactive Illustrated Commercial Script (6 cols normal = 50% width, 8 cols expanded = 67% width!) */}
            <div className={`${isScriptExpanded ? 'lg:col-span-8' : 'lg:col-span-6'} space-y-4`}>
              <SalesScriptCard 
                script={effectiveScript}
                allScripts={allScripts}
                onSelectScript={id => setSelectedScriptIdOverride(id)}
                companyName={currentLead.company_name || currentLead.name}
                contactName={currentLead.name || tr('Responsável', 'Responsable', 'Responsable', 'Responsabile')}
                activeOperatorLang={activeProfile?.language || null}
                onAppendToCallNotes={handleAppendScriptToNotes}
                isExpandedLayout={isScriptExpanded}
                onToggleExpandLayout={() => setIsScriptExpanded(prev => !prev)}
              />
            </div>

            {/* Right Column: Call Outcomes & Actions Panel (3 cols in normal mode) */}
            {!isScriptExpanded && (
              <div className="lg:col-span-3 space-y-4">
                {outcomesPanel}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quick Presupuesto Modal */}
      {currentLead && (
        <QuickPresupuestoModal
          key={`presupuesto-${currentLead.id}`}
          isOpen={isPresupuestoModalOpen}
          onClose={() => setIsPresupuestoModalOpen(false)}
          lead={currentLead}
          onSave={handleSavePresupuesto}
        />
      )}

      {/* Schedule Callback Modal */}
      <ScheduleCallbackModal
        key={`callback-${currentLead?.id || 'none'}`}
        isOpen={isCallbackModalOpen}
        onClose={() => setIsCallbackModalOpen(false)}
        lead={currentLead}
        onConfirm={handleConfirmScheduleCallback}
        isSubmitting={isLoggingCall}
      />

      {/* Send Commercial Material Modal (M365 Direct) */}
      <SendMaterialModal
        key={`material-${currentLead?.id || 'none'}`}
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        lead={currentLead}
        queueItemId={currentQueueItem?.id}
        onConfirm={handleConfirmSendMaterial}
        onLeadUpdated={handleLeadUpdated}
        isSubmitting={isLoggingCall}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        key={`edit-lead-${currentLead?.id || 'none'}`}
        isOpen={isEditLeadModalOpen}
        onClose={() => setIsEditLeadModalOpen(false)}
        lead={currentLead}
        onLeadUpdated={handleLeadUpdated}
      />

      {/* Gatekeeper / Reception Modal */}
      <GatekeeperModal
        key={`gatekeeper-${currentLead?.id || 'none'}`}
        isOpen={isGatekeeperModalOpen}
        onClose={() => setIsGatekeeperModalOpen(false)}
        lead={currentLead}
        onConfirm={handleConfirmGatekeeper}
        isSubmitting={isLoggingCall}
      />

      {/* Collect Project Demand Modal */}
      {currentLead && (
        <CollectProjectDemandModal
          key={`demand-${currentLead.id}`}
          isOpen={isDemandModalOpen}
          onClose={() => setIsDemandModalOpen(false)}
          lead={currentLead}
          onOpenQuickPresupuesto={() => setIsPresupuestoModalOpen(true)}
        />
      )}

      {/* Collect Fiscal Data Modal */}
      {currentLead && (
        <CollectFiscalDataModal
          key={`fiscal-${currentLead.id}`}
          isOpen={isFiscalModalOpen}
          onClose={() => setIsFiscalModalOpen(false)}
          lead={currentLead}
        />
      )}
    </div>
  );
}
