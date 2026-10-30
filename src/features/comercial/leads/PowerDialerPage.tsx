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
  Edit
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
  useLeadCallLogs, 
  useMutateDialer 
} from './hooks/useDialer';
import { useCommercialScope } from './hooks/useLeads';
import { useComercialLanguage } from './utils/comercialI18n';

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

export function PowerDialerPage() {
  const { tr } = useComercialLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdParam = searchParams.get('campaignId');

  const {
    activeProfile,
    allProfiles,
    selectedCommercialKey,
    setSelectedCommercialKey,
    isCommercialOperator,
  } = useCommercialScope();

  const { data: campaigns = [] } = useDialerCampaigns();

  // Active Campaign State
  const activeCampaignId = useMemo(() => {
    if (campaignIdParam && campaigns.some(c => c.id === campaignIdParam)) {
      return campaignIdParam;
    }
    return campaigns.length > 0 ? campaigns[0].id : null;
  }, [campaignIdParam, campaigns]);

  const { data: activeCampaign } = useDialerCampaign(activeCampaignId);
  const { data: queue = [] } = useDialerQueue(activeCampaignId);
  const { logCallAndAdvance, isLoggingCall, createQuickPresupuesto } = useMutateDialer();

  // Active Lead Pointer in Queue
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);

  // Call Timer & State
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<any>(null);

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

  // Check if a specific queueItemId was requested from Agenda
  const queueItemIdParam = searchParams.get('queueItemId');

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

  // Reset override and call notes when switching leads in the queue
  useEffect(() => {
    setActiveLeadOverride(null);
    setCallNotes('');
  }, [currentQueueIndex, currentQueueItem?.lead?.id]);

  const handleLeadUpdated = (updatedLead: Lead) => {
    setActiveLeadOverride(updatedLead);
    queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
  };

  // History Logs for current lead
  const { data: leadHistory = [], isLoading: loadingHistory } = useLeadCallLogs(currentLead?.id);

  // Keep Index within bounds if queue updates
  useEffect(() => {
    if (currentQueueIndex >= queue.length && queue.length > 0) {
      setCurrentQueueIndex(0);
    }
  }, [queue.length, currentQueueIndex]);

  // Stopwatch effect
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

  const handleStartCall = () => {
    setIsCalling(true);
    setCallDuration(0);
    if (currentLead?.phone) {
      window.open(`tel:${currentLead.phone.replace(/\s+/g, '')}`, '_self');
    }
  };

  const handleEndCall = () => {
    setIsCalling(false);
  };

  const handleWhatsAppClick = () => {
    if (!currentLead?.phone) return;
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      tr(
        `Hola, me pongo en contacto de MCS Servicios Industriales respecto al refuerzo de personal técnico (soldadores y montadores) para ${currentLead.company_name || 'su empresa'}.`,
        `Hola, me pongo en contacto de MCS Servicios Industriales respecto al refuerzo de personal técnico (soldadores y montadores) para ${currentLead.company_name || 'su empresa'}.`,
        `Bonjour, je vous contacte de la part de MCS Services Industriels concernant le renfort de personnel technique (soudeurs et monteurs) pour ${currentLead.company_name || 'votre entreprise'}.`
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
        'Lien de demande de devis copié !'
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
        'Lien de la fiche fiscale copié !'
      )
    );
  };

  const handleSendBudgetWhatsApp = () => {
    if (!currentLead?.phone) {
      toast.error(
        tr(
          'Lead não possui telefone cadastrado.',
          'El lead no tiene teléfono registrado.',
          'Ce lead n’a pas de téléphone enregistré.'
        )
      );
      return;
    }
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      tr(
        `Hola, le comparto el enlace directo para detallar los perfiles de operarios (soldadores, tuberos, etc.) y necesidades de su obra para preparar el presupuesto:\n\n${budgetFormUrl}`,
        `Hola, le comparto el enlace directo para detallar los perfiles de operarios (soldadores, tuberos, etc.) y necesidades de su obra para preparar el presupuesto:\n\n${budgetFormUrl}`,
        `Bonjour, voici le lien direct pour détailler les profils d’opérateurs (soudeurs, tuyauteurs, etc.) et les besoins de votre chantier afin de préparer le devis :\n\n${budgetFormUrl}`
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
          'Ce lead n’a pas de téléphone enregistré.'
        )
      );
      return;
    }
    const cleanNumber = currentLead.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      tr(
        `Hola, le comparto el enlace de la ficha de registro para confirmar los datos fiscales (CIF/NIF, Razón Social y facturación) de ${currentLead.company_name || 'su empresa'}:\n\n${fiscalFormUrl}`,
        `Hola, le comparto el enlace de la ficha de registro para confirmar los datos fiscales (CIF/NIF, Razón Social y facturación) de ${currentLead.company_name || 'su empresa'}:\n\n${fiscalFormUrl}`,
        `Bonjour, voici le lien de la fiche d’enregistrement pour confirmer les données fiscales (SIRET/TVA, Raison Sociale et facturation) de ${currentLead.company_name || 'votre entreprise'} :\n\n${fiscalFormUrl}`
      )
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleOutcomeSubmit = async (
    outcome: CallOutcome, 
    customCallback?: string,
    customPriority: 'high' | 'normal' | 'low' = 'normal',
    customNotes?: string
  ) => {
    if (!currentQueueItem || !currentLead) return;

    try {
      setIsCalling(false);
      await logCallAndAdvance({
        queueItemId: currentQueueItem.id,
        campaignId: activeCampaignId!,
        leadId: currentLead.id,
        outcome,
        durationSeconds: callDuration,
        notes: customNotes || callNotes,
        phoneCalled: currentLead.phone,
        contactPerson: currentLead.name,
        scheduledCallbackAt: customCallback || null,
        priority: customPriority,
        rejectionReason: outcome === 'answered_rejected' ? rejectionReason : null,
      });

      // Clear local states
      setCallNotes('');
      setCallDuration(0);

      toast.success(
        outcome === 'answered_converted' 
          ? tr('🎉 Lead convertido com sucesso!', '🎉 ¡Lead convertido con éxito!', '🎉 Lead converti avec succès !')
          : outcome === 'answered_callback'
          ? tr('📅 Retorno agendado com sucesso na Agenda!', '📅 ¡Llamada de seguimiento agendada con éxito!', '📅 Rappel planifié avec succès dans l’Agenda !')
          : outcome === 'answered_interested'
          ? tr('E-mail com material comercial registrado!', '¡Correo con material comercial registrado!', 'E-mail avec documentation commerciale enregistré !')
          : outcome === 'gatekeeper_blocked'
          ? tr('Contato com a recepção registrado!', '¡Contacto con recepción registrado!', 'Contact avec la réception enregistré !')
          : outcome === 'no_answer'
          ? tr('Lead movido para o rodízio no fim da fila.', 'Lead movido al final de la cola.', 'Lead déplacé à la fin de la file.')
          : tr('Atendimento registrado!', '¡Atención registrada!', 'Appel enregistré !')
      );

      // Advance to next lead
      if (currentQueueIndex < queue.length - 1) {
        setCurrentQueueIndex(prev => prev + 1);
      } else {
        setCurrentQueueIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || tr('Erro ao registrar desfecho', 'Error al registrar resultado', 'Erreur lors de l’enregistrement du résultat'));
    }
  };

  const handleSavePresupuesto = async (payload: any) => {
    try {
      const createdEst = await createQuickPresupuesto(payload);
      await handleOutcomeSubmit('answered_converted');
      toast.success(
        payload?.existing_estimacion_id
          ? tr('🎉 Orçamento atualizado com sucesso!', '🎉 ¡Presupuesto actualizado con éxito!', '🎉 Devis mis à jour avec succès !')
          : tr('🎉 Pré-orçamento gerado com sucesso!', '🎉 ¡Pre-presupuesto generado con éxito!', '🎉 Pré-devis généré avec succès !'),
        {
          action: {
            label: tr('Ver Orçamento', 'Ver Presupuesto', 'Voir le Devis'),
            onClick: () => navigate(`/comercial/estimaciones/${createdEst.id}`),
          },
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || tr('Erro ao gerar pré-orçamento', 'Error al generar pre-presupuesto', 'Erreur lors de la génération du pré-devis'));
    }
  };

  const handleConfirmScheduleCallback = async (
    scheduledIso: string, 
    richNotes: string, 
    priority: 'high' | 'normal' | 'low'
  ) => {
    setIsCallbackModalOpen(false);
    setCallNotes(richNotes);
    await handleOutcomeSubmit('answered_callback', scheduledIso, priority, richNotes);
  };

  const handleConfirmSendMaterial = async (materialTitle: string, emailUsed: string, notes: string) => {
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header & Navigation Bar */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Campaign Switcher */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-foreground tracking-tight">Power Dialer</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  Cockpit SDR
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tr(
                  'Prospecção Ativa & Gestão de Chamadas Outbound',
                  'Prospección Activa y Gestión de Llamadas Outbound',
                  'Prospection Active & Gestion des Appels Sortants'
                )}
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Commercial Scope Filter (for Super Admin or locked indicator for Commercial) */}
          {isCommercialOperator && activeProfile ? (
            <div className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
              <span>{activeProfile.flag}</span>
              <span>{activeProfile.shortName}</span>
              <span className="text-[10px] opacity-80">({activeProfile.empresaName})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setSelectedCommercialKey('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCommercialKey === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tr('Todos', 'Todos', 'Tous')}
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
          <div className="flex items-center gap-2">
            <Select value={activeCampaignId || ''} onValueChange={handleSelectCampaign}>
              <SelectTrigger className="bg-background text-foreground border-input text-xs h-9 w-[220px] sm:w-[280px]">
                <SelectValue placeholder={tr('Selecione o Trabalho / Fila...', 'Seleccione el Trabajo / Cola...', 'Sélectionnez le Lot / File...')} />
              </SelectTrigger>
              <SelectContent className="bg-card text-card-foreground border-border">
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.title} ({c.items_count?.pending || 0} {tr('pendentes', 'pendientes', 'en attente')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/comercial/discador/trabalhos')}
              className="h-9 text-xs bg-background text-foreground border-input hover:bg-muted gap-1.5"
              title={tr('Gerenciar Trabalhos & Filas', 'Gestionar Trabajos y Colas', 'Gérer les Lots & Files')}
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" /> {tr('Trabalhos', 'Trabajos', 'Lots')}
            </Button>
          </div>
        </div>

        {/* Right: Quick Links to Sub-Modules */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/agenda')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" /> {tr('Agenda', 'Agenda', 'Agenda')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/trabalhos')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" /> {tr('Filas', 'Colas', 'Files')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/supervisao')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> {tr('Supervisão', 'Supervisión', 'Supervision')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/operadores')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-purple-500" /> {tr('Operadores & Scripts', 'Operadores y Guiones', 'Opérateurs & Scripts')}
          </Button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-4">
        {/* Priority Callback Alert Banner */}
        {dueCallback && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/50 shadow-md flex items-center justify-between gap-4 animate-bounce-short">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  {tr(
                    'Retorno Agendado com Prioridade Máxima',
                    'Seguimiento Agendado con Prioridad Máxima',
                    'Rappel Planifié avec Priorité Maximale'
                  )}
                </h4>
                <p className="text-xs text-foreground">
                  {tr('Empresa:', 'Empresa:', 'Entreprise :')}{' '}
                  <strong className="text-foreground font-bold">{dueCallback.lead.company_name || dueCallback.lead.name}</strong> •{' '}
                  {tr('Contato:', 'Contacto:', 'Contact :')} {dueCallback.lead.name} ({dueCallback.lead.phone})
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                const targetIdx = queue.findIndex(q => q.id === dueCallback.id);
                if (targetIdx !== -1) setCurrentQueueIndex(targetIdx);
              }}
              className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
            >
              <PhoneCall className="w-3.5 h-3.5" /> {tr('Atender Retorno Agora', 'Atender Ahora', 'Appeler Maintenant')}
            </Button>
          </div>
        )}

        {/* Queue Progress & Call Status Bar */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Queue Counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">{tr('Fila:', 'Cola:', 'File :')}</span>
              <span className="text-base font-black text-foreground px-3 py-1 rounded-xl bg-muted/60 border border-border">
                Lead {totalQueue > 0 ? currentQueueIndex + 1 : 0} <span className="text-muted-foreground font-normal">{tr('de', 'de', 'sur')} {totalQueue}</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 w-48">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{progressPercent}%</span>
            </div>
          </div>

          {/* Active Call Stopwatch & Trigger */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-muted/60 border border-border font-mono text-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${isCalling ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground uppercase font-semibold">{tr('Duração:', 'Duración:', 'Durée :')}</span>
              <span className={`font-bold ${isCalling ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {Math.floor(callDuration / 60).toString().padStart(2, '0')}:
                {(callDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {isCalling ? (
              <Button
                size="sm"
                onClick={handleEndCall}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 gap-1.5 shadow-md shadow-rose-500/20"
              >
                <PhoneOff className="w-4 h-4" /> {tr('Finalizar Chamada', 'Finalizar Llamada', 'Terminer l’Appel')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStartCall}
                disabled={!currentLead?.phone}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <PhoneCall className="w-4 h-4" /> {tr('Iniciar Ligação', 'Iniciar Llamada', 'Démarrer l’Appel')}
              </Button>
            )}

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1 border-l border-border pl-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevLead}
                disabled={currentQueueIndex === 0}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={tr('Lead Anterior', 'Lead Anterior', 'Lead Précédent')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextLead}
                disabled={currentQueueIndex >= totalQueue - 1}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={tr('Próximo Lead', 'Siguiente Lead', 'Lead Suivant')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Core Cockpit Grid: 3-Column Layout */}
        {!currentLead ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-4 my-8">
            <PhoneOff className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">
              {tr('Nenhum lead pendente nesta fila', 'Ningún lead pendiente en esta cola', 'Aucun lead en attente dans cette file')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {tr(
                'Parabéns! Todos os leads deste lote foram processados ou a fila está vazia. Selecione outro trabalho ou gere um novo lote na tela de leads.',
                '¡Enhorabuena! Todos los leads de este lote fueron procesados o la cola está vacía. Seleccione otro trabajo o genere un nuevo lote en la pantalla de leads.',
                'Bravo ! Tous les leads de ce lot ont été traités ou la file est vide. Sélectionnez un autre lot ou créez-en un nouveau depuis la base de leads.'
              )}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => navigate('/comercial/discador/trabalhos')}
                variant="outline"
                className="text-xs font-semibold"
              >
                {tr('Ver Outros Trabalhos', 'Ver Otros Trabajos', 'Voir les Autres Lots')}
              </Button>
              <Button
                onClick={() => navigate('/comercial/leads')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {tr('Ir para Base de Leads', 'Ir a Base de Leads', 'Aller à la Base de Leads')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Lead 360 & Quick Contacts (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Lead Profile Card */}
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                {/* Company Title & Flag */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" title={currentLead.country_id || 'ES'}>
                        {countryFlags[currentLead.country_id || 'ES'] || '🇪🇸'}
                      </span>
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        {currentLead.company_name || currentLead.name}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {currentLead.city || currentLead.province || tr('Espanha', 'España', 'Espagne')} • {currentLead.sector || tr('Industrial', 'Industrial', 'Industriel')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditLeadModalOpen(true)}
                      className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold gap-1 px-2.5 shadow-sm"
                      title={tr(
                        'Editar cadastro completo do Lead (Telefone, E-mail, CIF, etc.)',
                        'Editar registro completo del Lead (Teléfono, Correo, CIF, etc.)',
                        'Modifier la fiche complète du Lead (Téléphone, E-mail, SIRET, etc.)'
                      )}
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-500" />
                      {tr('Editar Lead', 'Editar Lead', 'Modifier Lead')}
                    </Button>

                    {currentLead.do_not_call ? (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        Blacklist
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] uppercase">
                        {currentQueueItem.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Scheduled Callback Alert Box if lead was scheduled */}
                {currentQueueItem.scheduled_for && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-xs space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        {tr('Retorno Agendado', 'Seguimiento Agendado', 'Rappel Planifié')}
                      </span>
                      <Badge className={
                        currentQueueItem.priority === 'high' 
                          ? 'bg-rose-500 text-white text-[10px]' 
                          : 'bg-amber-500 text-white text-[10px]'
                      }>
                        {currentQueueItem.priority === 'high'
                          ? tr('🔥 Alta Prioridade', '🔥 Alta Prioridad', '🔥 Haute Priorité')
                          : tr('⚡ Agendado', '⚡ Agendado', '⚡ Planifié')}
                      </Badge>
                    </div>

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

                    {currentQueueItem.scheduled_notes && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {tr(
                            'Anotações / Instruções Salvas no Agendamento:',
                            'Notas / Instrucciones Guardadas en el Agendamiento:',
                            'Notes / Instructions Enregistrées dans le Rappel :'
                          )}
                        </span>
                        <div 
                          className="p-2.5 rounded-lg bg-background/90 border border-border text-foreground text-[11px] leading-relaxed max-h-32 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: currentQueueItem.scheduled_notes }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Person */}
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-xs border">
                      {currentLead.name ? currentLead.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {currentLead.name || tr('Decisor / Compras', 'Decisor / Compras', 'Décideur / Achats')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {currentLead.cargo || tr('Responsável Técnico / Compras', 'Responsable Técnico / Compras', 'Responsable Technique / Achats')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone & Quick Actions Bar */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-mono text-sm font-bold text-foreground select-all">
                        {currentLead.phone || tr('Sem telefone', 'Sin teléfono', 'Sans téléphone')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditLeadModalOpen(true)}
                        className="h-7 w-7 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        title={tr(
                          'Corrigir ou alterar número de telefone do lead',
                          'Corregir o cambiar número de teléfono del lead',
                          'Corriger ou modifier le numéro de téléphone du lead'
                        )}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (currentLead.phone) {
                            navigator.clipboard.writeText(currentLead.phone);
                            toast.success(tr('Telefone copiado!', '¡Teléfono copiado!', 'Téléphone copié !'));
                          }
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title={tr('Copiar Telefone', 'Copiar Teléfono', 'Copier le Téléphone')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleWhatsAppClick}
                        disabled={!currentLead.phone}
                        className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1 font-semibold"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </Button>
                    </div>
                  </div>

                  {/* Email & Website links */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {currentLead.email && (
                      <a
                        href={`mailto:${currentLead.email}`}
                        className="p-2.5 rounded-xl bg-muted/30 border border-border text-foreground/80 hover:text-foreground hover:bg-muted truncate flex items-center gap-1.5 transition-colors"
                        title={currentLead.email}
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{currentLead.email}</span>
                      </a>
                    )}

                    {currentLead.website && (
                      <a
                        href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-muted/30 border border-border text-foreground/80 hover:text-foreground hover:bg-muted truncate flex items-center gap-1.5 transition-colors"
                        title={currentLead.website}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">Website</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Links & Formulários Comerciais do Lead */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {tr('Links & Formulários do Lead', 'Enlaces y Formularios del Lead', 'Liens & Formulaires du Lead')}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {tr('Cliente / Obra', 'Cliente / Obra', 'Client / Chantier')}
                    </Badge>
                  </div>

                  {/* 1. Demanda de Obra & Perfis (Solicitação de Orçamento) */}
                  <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          📋 {tr('Demanda & Perfis (Orçamento)', 'Demanda y Perfiles (Presupuesto)', 'Demande & Profils (Devis)')}
                        </span>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                        {tr('Orçamento', 'Presupuesto', 'Devis')}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {tr(
                        'Envie o link para o cliente ou anote os operários (soldadores, tubistas, etc.) na chamada.',
                        'Envíe el enlace al cliente o anote los operarios (soldadores, tuberos, etc.) en la llamada.',
                        'Envoyez le lien au client ou notez les opérateurs (soudeurs, tuyauteurs, etc.) pendant l’appel.'
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Button
                        size="sm"
                        onClick={() => setIsDemandModalOpen(true)}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 shadow-sm px-2.5"
                      >
                        <Wrench className="w-3 h-3" /> {tr('Preencher na Chamada', 'Completar en Llamada', 'Remplir Pendant l’Appel')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyBudgetLink}
                        className="h-7 text-xs border-input gap-1 px-2"
                      >
                        <Copy className="w-3 h-3" /> {tr('Copiar Link', 'Copiar Enlace', 'Copier le Lien')}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSendBudgetWhatsApp}
                        disabled={!currentLead.phone}
                        className="h-7 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1 font-semibold px-2"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(budgetFormUrl, '_blank')}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 2. Ficha de Cadastro & Dados Fiscais (CIF / Faturamento) */}
                  <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          🏢 {tr('Ficha Cadastral (CIF / NIF)', 'Ficha de Registro (CIF / NIF)', 'Fiche Fiscale (SIRET / TVA)')}
                        </span>
                      </div>
                      {currentLead.tax_id ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                          ✓ CIF: {currentLead.tax_id}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                          ⚠️ {tr('Sem CIF Fiscal', 'Sin CIF Fiscal', 'Sans N° Fiscal')}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {tr(
                        'Razão Social, CIF e endereço fiscal para emissão do contrato e faturamento.',
                        'Razón Social, CIF y dirección fiscal para emisión del contrato y facturación.',
                        'Raison Sociale, SIRET/TVA et adresse fiscale pour l’émission du contrat et la facturation.'
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Button
                        size="sm"
                        onClick={() => setIsFiscalModalOpen(true)}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1 shadow-sm px-2.5"
                      >
                        <Building2 className="w-3 h-3" /> {tr('Preencher na Chamada', 'Completar en Llamada', 'Remplir Pendant l’Appel')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyFiscalLink}
                        className="h-7 text-xs border-input gap-1 px-2"
                      >
                        <Copy className="w-3 h-3" /> {tr('Copiar Link', 'Copiar Enlace', 'Copier le Lien')}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSendFiscalWhatsApp}
                        disabled={!currentLead.phone}
                        className="h-7 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1 font-semibold px-2"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(fiscalFormUrl, '_blank')}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Previous Notes / Tags */}
                {currentLead.notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {tr('Notas do Lead:', 'Notas del Lead:', 'Notes du Lead :')}
                    </span>
                    <p className="text-foreground/90 line-clamp-3">{currentLead.notes}</p>
                  </div>
                )}

                {/* Call History Timeline */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {tr('Histórico de Contatos', 'Historial de Contactos', 'Historique des Contacts')} ({leadHistory.length})
                  </span>
                  <div className="max-h-48 overflow-y-auto pr-1">
                    <LeadCallHistoryTimeline logs={leadHistory} isLoading={loadingHistory} />
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Sales Script & Objections (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <SalesScriptCard 
                script={activeCampaign?.script}
                companyName={currentLead.company_name || currentLead.name}
                contactName={currentLead.name || tr('Responsável', 'Responsable', 'Responsable')}
              />
            </div>

            {/* Right Column: Call Outcomes & Actions Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    {tr('Desfecho do Atendimento', 'Resultado de la Llamada', 'Résultat de l’Appel')}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">{tr('1-Clique', '1-Clic', '1-Clic')}</span>
                </div>

                {/* Primary Outcomes: Gerar Orçamento ou Coletar Demanda */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setIsPresupuestoModalOpen(true)}
                    disabled={isLoggingCall}
                    className="h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-left leading-tight truncate">
                      <span className="block font-black truncate">{tr('Gerar Orçamento', 'Generar Presupuesto', 'Générer un Devis')}</span>
                      <span className="text-[10px] opacity-85 font-normal block truncate">{tr('Tarifas & Valores', 'Tarifas y Valores', 'Tarifs & Montants')}</span>
                    </span>
                  </Button>

                  <Button
                    onClick={() => setIsDemandModalOpen(true)}
                    disabled={isLoggingCall}
                    className="h-12 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
                  >
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span className="text-left leading-tight truncate">
                      <span className="block font-black truncate">{tr('Coletar Demanda', 'Recopilar Demanda', 'Collecter Demande')}</span>
                      <span className="text-[10px] opacity-85 font-normal block truncate">{tr('Perfis & Obra', 'Perfiles y Obra', 'Profils & Chantier')}</span>
                    </span>
                  </Button>
                </div>

                {/* Secondary Outcomes Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Não Atendeu / Ocupado (Rodízio) */}
                  <Button
                    variant="outline"
                    onClick={() => handleOutcomeSubmit('no_answer')}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-amber-600 dark:text-amber-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <PhoneOff className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">{tr('Não Atendeu', 'No Contestó', 'Pas de Réponse')}</p>
                      <span className="text-[10px] text-muted-foreground">{tr('Fim da fila', 'Fin de la cola', 'Fin de file')}</span>
                    </div>
                  </Button>

                  {/* Agendar Retorno (Callback) */}
                  <Button
                    variant="outline"
                    onClick={() => setIsCallbackModalOpen(true)}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">{tr('Agendar Retorno', 'Agendar Llamada', 'Planifier Rappel')}</p>
                      <span className="text-[10px] text-muted-foreground">Callback</span>
                    </div>
                  </Button>

                  {/* Pediu Envio de Apresentação / Email */}
                  <Button
                    variant="outline"
                    onClick={() => setIsMaterialModalOpen(true)}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">{tr('Pediu Material', 'Pidió Material', 'Demande Infos')}</p>
                      <span className="text-[10px] text-muted-foreground">{tr('Enviar e-mail', 'Enviar correo', 'Envoyer e-mail')}</span>
                    </div>
                  </Button>

                  {/* Barrado na Recepção */}
                  <Button
                    variant="outline"
                    onClick={() => setIsGatekeeperModalOpen(true)}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-orange-600 dark:text-orange-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <PhoneForwarded className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">{tr('Recepção', 'Recepción', 'Standard')}</p>
                      <span className="text-[10px] text-muted-foreground">{tr('Sem decisor', 'Sin decisor', 'Sans décideur')}</span>
                    </div>
                  </Button>
                </div>

                {/* Rejection / Blacklist Section */}
                <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-slate-950/70 border border-rose-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" /> {tr('Sem Interesse / Recusa', 'Sin Interés / Rechazo', 'Sans Intérêt / Refus')}
                    </span>
                  </div>

                  <Select value={rejectionReason} onValueChange={(v: any) => setRejectionReason(v)}>
                    <SelectTrigger className="bg-background text-foreground border-input text-xs h-8">
                      <SelectValue placeholder={tr('Selecione o motivo...', 'Seleccione el motivo...', 'Sélectionnez le motif...')} />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-card-foreground border-border text-xs">
                      <SelectItem value="has_own_team">{tr('Já possui equipe própria / Fixos', 'Ya tiene equipo propio / Fijos', 'Possède déjà sa propre équipe')}</SelectItem>
                      <SelectItem value="no_demand">{tr('Sem obras no momento', 'Sin obras en este momento', 'Pas de chantier en ce moment')}</SelectItem>
                      <SelectItem value="price_too_high">{tr('Preço acima da meta', 'Precio por encima del objetivo', 'Tarif au-dessus du budget')}</SelectItem>
                      <SelectItem value="does_not_outsource">{tr('Não terceiriza montagem/solda', 'No subcontrata montaje/soldadura', 'Ne sous-traite pas montage/soudure')}</SelectItem>
                      <SelectItem value="bad_contact">{tr('Número incorreto / Inexistente', 'Número incorrecto / Inexistente', 'Numéro incorrect / Inexistant')}</SelectItem>
                      <SelectItem value="other">{tr('Outros motivos', 'Otros motivos', 'Autres motifs')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={() => handleOutcomeSubmit('answered_rejected')}
                    disabled={isLoggingCall}
                    className="w-full h-8 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-semibold gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> {tr('Registrar Recusa & Blacklist', 'Registrar Rechazo y Blacklist', 'Enregistrer Refus & Blacklist')}
                  </Button>
                </div>

                {/* Notes for this specific call */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {tr('Anotações da Ligação (Opcional)', 'Notas de la Llamada (Opcional)', 'Notes de l’Appel (Optionnel)')}
                  </Label>
                  <Textarea
                    value={callNotes}
                    onChange={e => setCallNotes(e.target.value)}
                    placeholder={tr(
                      'Ex: Sr. Pedro disse que em outubro terá parada de refinaria...',
                      'Ej: El Sr. Pedro indicó que en octubre tendrá parada de refinería...',
                      'Ex : M. Pierre a indiqué qu’en octobre il aura un arrêt de raffinerie...'
                    )}
                    rows={2}
                    className="bg-background border-input text-foreground text-xs resize-none"
                  />
                </div>
              </div>
            </div>
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

      {/* Schedule Callback Modal (Expanded with Calendar & Rich Text) */}
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

      {/* Edit Lead Modal (CRUD Cockpit Discador) */}
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

      {/* Collect Project Demand Modal (Demanda de Obra & Perfis) */}
      {currentLead && (
        <CollectProjectDemandModal
          key={`demand-${currentLead.id}`}
          isOpen={isDemandModalOpen}
          onClose={() => setIsDemandModalOpen(false)}
          lead={currentLead}
          onOpenQuickPresupuesto={() => setIsPresupuestoModalOpen(true)}
        />
      )}

      {/* Collect Fiscal Data Modal (Ficha Cadastral & CIF / Faturamento) */}
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
