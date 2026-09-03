import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Ban, 
  User, 
  Building2, 
  MapPin, 
  Globe, 
  Linkedin, 
  MessageSquare, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Volume2, 
  AlertTriangle, 
  BarChart3, 
  Zap, 
  Layers, 
  Flame, 
  Loader2, 
  Plus, 
  Search,
  ExternalLink,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { 
  useDialerCampaigns, 
  useDialerCampaign, 
  useDialerQueue, 
  useLeadCallLogs, 
  useMutateDialer 
} from './hooks/useDialer';
import { useSalespeople } from './hooks/useLeads';

import { QuickPresupuestoModal } from './components/QuickPresupuestoModal';
import { SalesScriptCard } from './components/SalesScriptCard';
import { LeadCallHistoryTimeline } from './components/LeadCallHistoryTimeline';
import { ScheduleCallbackModal } from './components/ScheduleCallbackModal';
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdParam = searchParams.get('campaignId');

  const { selectedEmpresaId } = useEmpresa();
  const { data: campaigns = [], isLoading: loadingCampaigns } = useDialerCampaigns();
  const { data: salespeople = [] } = useSalespeople();

  // Active Campaign State
  const activeCampaignId = campaignIdParam || (campaigns.length > 0 ? campaigns[0].id : null);
  const { data: activeCampaign, isLoading: loadingActiveCampaign } = useDialerCampaign(activeCampaignId);
  const { data: queue = [], isLoading: loadingQueue } = useDialerQueue(activeCampaignId);
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
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('10:00');
  const [isPresupuestoModalOpen, setIsPresupuestoModalOpen] = useState(false);

  // Selected Lead Data from Queue
  const currentQueueItem: DialerQueueItem | undefined = queue[currentQueueIndex] || queue[0];
  const currentLead = currentQueueItem?.lead;

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
      // Trigger tel: protocol
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
      `Hola, me pongo en contacto de MCS Servicios Industriales respecto al refuerzo de personal técnico (soldadores y montadores) para ${currentLead.company_name || 'su empresa'}.`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleOutcomeSubmit = async (outcome: CallOutcome, customCallback?: string) => {
    if (!currentQueueItem || !currentLead) return;

    try {
      setIsCalling(false);
      await logCallAndAdvance({
        queueItemId: currentQueueItem.id,
        campaignId: activeCampaignId!,
        leadId: currentLead.id,
        outcome,
        durationSeconds: callDuration,
        notes: callNotes,
        phoneCalled: currentLead.phone,
        contactPerson: currentLead.name,
        scheduledCallbackAt: customCallback || null,
        rejectionReason: outcome === 'answered_rejected' ? rejectionReason : null,
      });

      // Clear local states
      setCallNotes('');
      setCallDuration(0);

      toast.success(
        outcome === 'answered_converted' 
          ? '🎉 Lead convertido com sucesso!' 
          : outcome === 'answered_callback'
          ? '📅 Retorno agendado com sucesso!'
          : outcome === 'no_answer'
          ? 'Lead movido para o rodízio no fim da fila.'
          : 'Atendimento registrado!'
      );

      // Advance to next lead
      if (currentQueueIndex < queue.length - 1) {
        setCurrentQueueIndex(prev => prev + 1);
      } else {
        setCurrentQueueIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao registrar desfecho');
    }
  };

  const handleSavePresupuesto = async (payload: any) => {
    await createQuickPresupuesto(payload);
    await handleOutcomeSubmit('answered_converted');
  };

  const handleConfirmScheduleCallback = async (
    scheduledIso: string, 
    richNotes: string, 
    priority: 'high' | 'normal' | 'low'
  ) => {
    setIsCallbackModalOpen(false);
    setCallNotes(richNotes);
    await handleOutcomeSubmit('answered_callback', scheduledIso);
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
              <p className="text-xs text-muted-foreground">Prospecção Ativa & Gestão de Chamadas Outbound</p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Campaign Selector */}
          <div className="flex items-center gap-2">
            <Select value={activeCampaignId || ''} onValueChange={handleSelectCampaign}>
              <SelectTrigger className="bg-background text-foreground border-input text-xs h-9 w-[220px] sm:w-[280px]">
                <SelectValue placeholder="Selecione o Trabalho / Fila..." />
              </SelectTrigger>
              <SelectContent className="bg-card text-card-foreground border-border">
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.title} ({c.items_count?.pending || 0} pendentes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/comercial/discador/trabalhos')}
              className="h-9 text-xs bg-background text-foreground border-input hover:bg-muted gap-1.5"
              title="Gerenciar Trabalhos & Filas"
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" /> Trabalhos
            </Button>
          </div>
        </div>

        {/* Right: Quick Links to Sub-Modules */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/trabalhos')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" /> Filas
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/supervisao')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> Supervisão
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial/discador/operadores')}
            className="h-8 text-xs bg-background hover:bg-muted text-foreground gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-purple-500" /> Operadores & Scripts
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
                  Retorno Agendado com Prioridade Máxima
                </h4>
                <p className="text-xs text-foreground">
                  Empresa: <strong className="text-foreground font-bold">{dueCallback.lead.company_name || dueCallback.lead.name}</strong> • 
                  Contato: {dueCallback.lead.name} ({dueCallback.lead.phone})
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
              <PhoneCall className="w-3.5 h-3.5" /> Atender Retorno Agora
            </Button>
          </div>
        )}

        {/* Queue Progress & Call Status Bar */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Queue Counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Fila:</span>
              <span className="text-base font-black text-foreground px-3 py-1 rounded-xl bg-muted/60 border border-border">
                Lead {totalQueue > 0 ? currentQueueIndex + 1 : 0} <span className="text-muted-foreground font-normal">de {totalQueue}</span>
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
              <span className="text-xs text-muted-foreground uppercase font-semibold">Duração:</span>
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
                <PhoneOff className="w-4 h-4" /> Finalizar Chamada
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStartCall}
                disabled={!currentLead?.phone}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <PhoneCall className="w-4 h-4" /> Iniciar Ligação
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
                title="Lead Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextLead}
                disabled={currentQueueIndex >= totalQueue - 1}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Próximo Lead"
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
            <h3 className="text-base font-bold text-foreground">Nenhum lead pendente nesta fila</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Parabéns! Todos os leads deste lote foram processados ou a fila está vazia. Selecione outro trabalho ou gere um novo lote na tela de leads.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => navigate('/comercial/discador/trabalhos')}
                variant="outline"
                className="text-xs font-semibold"
              >
                Ver Outros Trabalhos
              </Button>
              <Button
                onClick={() => navigate('/comercial/leads')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Ir para Base de Leads
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
                      {currentLead.city || currentLead.province || 'Espanha'} • {currentLead.sector || 'Industrial'}
                    </p>
                  </div>

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

                {/* Contact Person */}
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-xs border">
                      {currentLead.name ? currentLead.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{currentLead.name || 'Decisor / Compras'}</p>
                      <p className="text-[11px] text-muted-foreground">{currentLead.cargo || 'Responsável Técnico / Compras'}</p>
                    </div>
                  </div>
                </div>

                {/* Phone & Quick Actions Bar */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-mono text-sm font-bold text-foreground select-all">
                        {currentLead.phone || 'Sem telefone'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (currentLead.phone) {
                            navigator.clipboard.writeText(currentLead.phone);
                            toast.success('Telefone copiado!');
                          }
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Copiar Telefone"
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

                {/* Previous Notes / Tags */}
                {currentLead.notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Notas do Lead:</span>
                    <p className="text-foreground/90 line-clamp-3">{currentLead.notes}</p>
                  </div>
                )}

                {/* Call History Timeline */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Histórico de Contatos ({leadHistory.length})
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
                contactName={currentLead.name || 'Responsable'}
              />
            </div>

            {/* Right Column: Call Outcomes & Actions Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Desfecho do Atendimento
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">1-Clique</span>
                </div>

                {/* Primary Outcome: SOLICITAR ORÇAMENTO (Success) */}
                <Button
                  onClick={() => setIsPresupuestoModalOpen(true)}
                  disabled={isLoggingCall}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Atendeu: Gerar Pré-Orçamento
                </Button>

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
                      <p className="font-bold">Não Atendeu</p>
                      <span className="text-[10px] text-muted-foreground">Fim da fila</span>
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
                      <p className="font-bold">Agendar Retorno</p>
                      <span className="text-[10px] text-muted-foreground">Callback</span>
                    </div>
                  </Button>

                  {/* Pediu Envio de Apresentação / Email */}
                  <Button
                    variant="outline"
                    onClick={() => handleOutcomeSubmit('answered_interested')}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">Pediu Material</p>
                      <span className="text-[10px] text-muted-foreground">Enviar e-mail</span>
                    </div>
                  </Button>

                  {/* Barrado na Recepção */}
                  <Button
                    variant="outline"
                    onClick={() => handleOutcomeSubmit('gatekeeper_blocked')}
                    disabled={isLoggingCall}
                    className="h-11 bg-background hover:bg-muted text-orange-600 dark:text-orange-300 text-xs font-semibold flex items-center justify-start gap-2 px-3 border-input"
                  >
                    <PhoneForwarded className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="text-left leading-tight truncate">
                      <p className="font-bold">Recepção</p>
                      <span className="text-[10px] text-muted-foreground">Sem decisor</span>
                    </div>
                  </Button>
                </div>

                {/* Rejection / Blacklist Section */}
                <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-slate-950/70 border border-rose-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" /> Sem Interesse / Recusa
                    </span>
                  </div>

                  <Select value={rejectionReason} onValueChange={(v: any) => setRejectionReason(v)}>
                    <SelectTrigger className="bg-background text-foreground border-input text-xs h-8">
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-card-foreground border-border text-xs">
                      <SelectItem value="has_own_team">Já possui equipe própria / Fixos</SelectItem>
                      <SelectItem value="no_demand">Sem obras no momento</SelectItem>
                      <SelectItem value="price_too_high">Preço acima da meta</SelectItem>
                      <SelectItem value="does_not_outsource">Não terceiriza montagem/solda</SelectItem>
                      <SelectItem value="bad_contact">Número incorreto / Inexistente</SelectItem>
                      <SelectItem value="other">Outros motivos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={() => handleOutcomeSubmit('answered_rejected')}
                    disabled={isLoggingCall}
                    className="w-full h-8 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-semibold gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> Registrar Recusa & Blacklist
                  </Button>
                </div>

                {/* Notes for this specific call */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground font-medium">Anotações da Ligação (Opcional)</Label>
                  <Textarea
                    value={callNotes}
                    onChange={e => setCallNotes(e.target.value)}
                    placeholder="Ex: Sr. Pedro disse que em outubro terá parada de refinaria..."
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
          isOpen={isPresupuestoModalOpen}
          onClose={() => setIsPresupuestoModalOpen(false)}
          lead={currentLead}
          onSave={handleSavePresupuesto}
        />
      )}

      {/* Schedule Callback Modal (Expanded with Calendar & Rich Text) */}
      <ScheduleCallbackModal
        isOpen={isCallbackModalOpen}
        onClose={() => setIsCallbackModalOpen(false)}
        lead={currentLead}
        onConfirm={handleConfirmScheduleCallback}
        isSubmitting={isLoggingCall}
      />
    </div>
  );
}
