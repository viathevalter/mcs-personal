import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, addDays, parseISO, differenceInMinutes } from 'date-fns';
import { es, fr, it, ptBR } from 'date-fns/locale';
import {
  PhoneCall,
  CheckCircle2,
  TrendingUp,
  Award,
  ShieldAlert,
  Calendar,
  CalendarDays,
  Loader2,
  Clock,
  Timer,
  Download,
  Search,
  User,
  Users,
  Mail,
  PhoneOff,
  PhoneForwarded,
  Ban,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Eye,
  ExternalLink,
  Sparkles,
  Activity,
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useDialerSupervisorKPIs,
  extractTagsFromAppointment,
  type SupervisorPeriodFilter,
  type DetailedCallReportRow,
} from '../hooks/useDialer';
import { useCommercialScope, type CommercialOwnerKey } from '../hooks/useLeads';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';

function formatDurationHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs
      .toString()
      .padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
}

function formatDurationCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${(s % 60).toString().padStart(2, '0')}s`;
  return `${s}s`;
}

function formatDurationMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function stripHtmlToPlainText(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, ' • ')
    .replace(/<\/div>|<\/p>|<\/li>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function DialerSupervisorView() {
  const navigate = useNavigate();
  const {
    activeProfile,
    allProfiles,
    selectedCommercialKey,
    setSelectedCommercialKey,
    isCommercialOperator,
  } = useCommercialScope();

  const operatorLangOverride = (activeProfile?.language as SupportedComercialLang | undefined) || null;
  const { tr, lang } = useComercialLanguage(operatorLangOverride);
  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : lang === 'es' ? es : ptBR;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const [period, setPeriod] = useState<SupervisorPeriodFilter>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>(yesterdayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [logSearch, setLogSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [selectedLogForModal, setSelectedLogForModal] = useState<DetailedCallReportRow | null>(null);

  const {
    data: kpis,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useDialerSupervisorKPIs(period, {
    startDate: customStartDate,
    endDate: customEndDate,
  });

  // Sync date inputs nicely when switching quick presets
  const handleSelectQuickPeriod = (next: SupervisorPeriodFilter) => {
    setPeriod(next);
    const now = new Date();
    if (next === 'today') {
      const s = format(now, 'yyyy-MM-dd');
      setCustomStartDate(s);
      setCustomEndDate(s);
    } else if (next === 'yesterday') {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      setCustomStartDate(y);
      setCustomEndDate(y);
    } else if (next === '7d') {
      setCustomStartDate(format(subDays(now, 6), 'yyyy-MM-dd'));
      setCustomEndDate(format(now, 'yyyy-MM-dd'));
    } else if (next === '30d') {
      setCustomStartDate(format(subDays(now, 29), 'yyyy-MM-dd'));
      setCustomEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  // Step 1 day back or forward quickly
  const handleStepDay = (deltaDays: number) => {
    const baseStr =
      period === 'today'
        ? todayStr
        : period === 'yesterday'
        ? yesterdayStr
        : customStartDate || todayStr;
    try {
      const nextDate = addDays(parseISO(baseStr), deltaDays);
      const nextStr = format(nextDate, 'yyyy-MM-dd');
      setCustomStartDate(nextStr);
      setCustomEndDate(nextStr);
      if (nextStr === todayStr) setPeriod('today');
      else if (nextStr === yesterdayStr) setPeriod('yesterday');
      else setPeriod('custom');
    } catch {
      // ignore invalid date
    }
  };

  const activePeriodLabel = useMemo(() => {
    if (period === 'today') {
      return `${tr('Hoje', 'Hoy', 'Aujourd’hui', 'Oggi')} (${format(new Date(), 'dd/MM/yyyy')})`;
    }
    if (period === 'yesterday') {
      return `${tr('Ontem', 'Ayer', 'Hier', 'Ieri')} (${format(subDays(new Date(), 1), 'dd/MM/yyyy')})`;
    }
    if (period === '7d') {
      return tr('Últimos 7 Dias', 'Últimos 7 Días', '7 Derniers Jours', 'Ultimi 7 Giorni');
    }
    if (period === '30d') {
      return tr('Últimos 30 Dias', 'Últimos 30 Días', '30 Derniers Jours', 'Ultimi 30 Giorni');
    }
    if (period === 'custom') {
      const fmtStart = customStartDate ? format(parseISO(customStartDate), 'dd/MM/yyyy') : '...';
      const fmtEnd = customEndDate ? format(parseISO(customEndDate), 'dd/MM/yyyy') : '...';
      return customStartDate === customEndDate ? fmtStart : `${fmtStart} → ${fmtEnd}`;
    }
    return tr('Todo o Histórico', 'Todo el Historial', 'Tout l’Historique', 'Tutto lo Storico');
  }, [period, customStartDate, customEndDate, tr]);

  const rejectionLabels: Record<string, string> = {
    has_own_team: tr(
      'Já possui equipe própria / Fixos',
      'Ya tiene equipo propio / Fijos',
      'Possède déjà sa propre équipe',
      'Ha già squadra interna / Fissi'
    ),
    no_demand: tr(
      'Sem obras ou paradas no momento',
      'Sin obras o paradas en este momento',
      'Pas de chantier ou d’arrêt en ce moment',
      'Nessun cantiere al momento'
    ),
    price_too_high: tr(
      'Tarifa horária acima do orçamento',
      'Tarifa horaria por encima del presupuesto',
      'Tarif horaire au-dessus du budget',
      'Tariffa oraria oltre il budget'
    ),
    does_not_outsource: tr(
      'Não terceiriza mão de obra',
      'No subcontrata mano de obra',
      'Ne sous-traite pas la main-d’œuvre',
      'Non esternalizza manodopera'
    ),
    bad_contact: tr(
      'Contato incorreto / Sem decisor',
      'Contacto incorrecto / Sin decisor',
      'Contact incorrect / Sans décideur',
      'Contatto errato / Senza decisore'
    ),
    other: tr('Outros motivos', 'Otros motivos', 'Autres motifs', 'Altri motivi'),
  };

  const getOutcomeInfo = (outcome: string) => {
    switch (outcome) {
      case 'answered_converted':
        return {
          label: tr('Orçamento Gerado', 'Presupuesto Generado', 'Devis Généré', 'Preventivo Generato'),
          icon: CheckCircle2,
          cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
      case 'answered_callback':
        return {
          label: tr('Agendou Retorno', 'Agendó Seguimiento', 'Rappel Planifié', 'Richiamo Pianificato'),
          icon: Calendar,
          cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        };
      case 'answered_interested':
        return {
          label: tr('Pediu Material', 'Pidió Material', 'Demande Dossier', 'Richiede Materiale'),
          icon: Mail,
          cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        };
      case 'answered_rejected':
        return {
          label: tr('Sem Interesse', 'Sin Interés', 'Sans Intérêt', 'Nessun Interesse'),
          icon: Ban,
          cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        };
      case 'gatekeeper_blocked':
        return {
          label: tr('Recepção / Filtro', 'Recepción / Filtro', 'Standard / Filtre', 'Reception / Filtro'),
          icon: PhoneForwarded,
          cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        };
      case 'no_answer':
      case 'busy':
        return {
          label: tr('Não Atendeu', 'No Contestó', 'Pas de Réponse', 'Non Risponde'),
          icon: PhoneOff,
          cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      default:
        return {
          label: outcome,
          icon: PhoneCall,
          cls: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const filteredLogs = useMemo(() => {
    const list = kpis?.recentCallLogs || [];
    const q = logSearch.trim().toLowerCase();
    return list.filter((row) => {
      if (outcomeFilter !== 'all') {
        if (outcomeFilter === 'no_answer') {
          if (row.outcome !== 'no_answer' && row.outcome !== 'busy') return false;
        } else if (row.outcome !== outcomeFilter) {
          return false;
        }
      }
      if (!q) return true;
      const plainNotes = stripHtmlToPlainText(row.notes).toLowerCase();
      return (
        row.companyName.toLowerCase().includes(q) ||
        row.contactName.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.phoneCalled.toLowerCase().includes(q) ||
        plainNotes.includes(q)
      );
    });
  }, [kpis?.recentCallLogs, logSearch, outcomeFilter]);

  const handleExportCsv = () => {
    if (!filteredLogs.length) return;
    const headers = [
      'Data_Hora',
      'Comercial',
      'Empresa_Grupo',
      'Cliente_Empresa',
      'Contato',
      'Telefone',
      'Resultado',
      'Duracao_Segundos',
      'Duracao_MMSS',
      'Notas_Limpas',
    ];
    const rows = filteredLogs.map((r) => [
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm:ss'),
      r.userName,
      r.empresaName || '',
      r.companyName,
      r.contactName,
      r.phoneCalled,
      getOutcomeInfo(r.outcome).label,
      String(r.durationSeconds || 0),
      formatDurationMMSS(r.durationSeconds || 0),
      stripHtmlToPlainText(r.notes),
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeTag =
      period === 'custom' ? `${customStartDate}_${customEndDate}` : `${period}_${todayStr}`;
    link.download = `supervisao-discador-${rangeTag}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSdrActivityBadge = (lastCallAt?: string | null) => {
    if (!lastCallAt) {
      return {
        dotCls: 'bg-slate-400',
        text: tr('Sem registro recente', 'Sin registro reciente', 'Aucun appel récent', 'Nessuna chiamata recente'),
        cls: 'text-muted-foreground bg-muted/60 border-border',
      };
    }
    const dt = new Date(lastCallAt);
    const minsAgo = differenceInMinutes(new Date(), dt);
    if (minsAgo <= 25) {
      return {
        dotCls: 'bg-emerald-500 animate-ping',
        text:
          minsAgo <= 1
            ? tr('Em linha agora', 'En línea ahora', 'En ligne', 'In linea ora')
            : tr(`Ativo há ${minsAgo}m`, `Activo hace ${minsAgo}m`, `Actif il y a ${minsAgo}m`, `Attivo ${minsAgo}m fa`),
        cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      };
    }
    const formatted =
      format(dt, 'yyyy-MM-dd') === todayStr
        ? `${tr('Hoje', 'Hoy', 'Auj.', 'Oggi')} ${format(dt, 'HH:mm')}`
        : format(dt, 'yyyy-MM-dd') === yesterdayStr
        ? `${tr('Ontem', 'Ayer', 'Hier', 'Ieri')} ${format(dt, 'HH:mm')}`
        : format(dt, 'dd/MM HH:mm');
    return {
      dotCls: format(dt, 'yyyy-MM-dd') === todayStr ? 'bg-blue-500' : 'bg-amber-500',
      text: `${tr('Última:', 'Última:', 'Dernier :', 'Ultima:')} ${formatted}`,
      cls: 'text-foreground/80 bg-muted/60 border-border',
    };
  };

  const chartBars = useMemo(() => {
    if (!kpis) return [];
    if (kpis.isSingleDayMode) {
      return kpis.hourlyBuckets.map((b) => ({
        key: b.hour,
        label: b.hour,
        calls: b.calls,
        answered: b.answered,
        durationSeconds: b.durationSeconds,
      }));
    }
    return kpis.dailyBuckets.map((d) => ({
      key: d.date,
      label: d.label,
      calls: d.calls,
      answered: d.answered,
      durationSeconds: d.durationSeconds,
    }));
  }, [kpis]);

  const maxBarCalls = useMemo(
    () => Math.max(1, ...chartBars.map((b) => b.calls)),
    [chartBars]
  );

  return (
    <div className="space-y-5">
      {/* Unified Executive Command & Date Range Filter Panel */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Top Row: Commercial Scope + Live Pulse + Export */}
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {tr('Equipe Comercial:', 'Equipo Comercial:', 'Équipe Commerciale :', 'Team Commerciale:')}
            </span>

            {isCommercialOperator && activeProfile ? (
              <Badge className="bg-indigo-600 text-white text-xs font-bold px-3 py-1">
                {activeProfile.flag} {activeProfile.displayName} ({activeProfile.empresaName})
              </Badge>
            ) : (
              <div className="flex items-center gap-1 bg-background/90 p-1 rounded-xl border border-border shadow-2xs flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedCommercialKey('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedCommercialKey === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tr('Todos (6)', 'Todos (6)', 'Tous (6)', 'Tutti (6)')}
                </button>
                {allProfiles.map((prof) => {
                  const isSel = selectedCommercialKey === prof.key;
                  return (
                    <button
                      key={prof.key}
                      type="button"
                      onClick={() =>
                        setSelectedCommercialKey(isSel ? 'all' : (prof.key as CommercialOwnerKey))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span>{prof.flag}</span>
                      <span>{prof.shortName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Live Sync Status + Refresh + CSV Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tr('Monitoramento ao Vivo', 'Monitoreo en Vivo', 'Suivi en Direct', 'Monitoraggio Live')}</span>
              {dataUpdatedAt > 0 && (
                <span className="font-mono opacity-80">
                  • {format(new Date(dataUpdatedAt), 'HH:mm:ss')}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs font-bold gap-1.5 bg-background"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isFetching ? 'animate-spin' : ''}`} />
              {tr('Atualizar', 'Actualizar', 'Actualiser', 'Aggiorna')}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!filteredLogs.length}
              className="h-8 text-xs font-bold gap-1.5 bg-background border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              <Download className="w-3.5 h-3.5" />
              {tr('Exportar CSV', 'Exportar CSV', 'Exporter CSV', 'Esporta CSV')}
            </Button>
          </div>
        </div>

        {/* Bottom Row: Quick Period Shortcuts (Hoje, Ontem, 7d, 30d, Tudo) + Day Stepper + Custom Date Range */}
        <div className="px-4 py-3 bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              {tr('Período:', 'Período:', 'Période :', 'Periodo:')}
            </span>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border flex-wrap">
              {(
                [
                  { id: 'today', label: tr('Hoje', 'Hoy', 'Aujourd’hui', 'Oggi') },
                  { id: 'yesterday', label: tr('Ontem', 'Ayer', 'Hier', 'Ieri') },
                  { id: '7d', label: tr('7 Dias', '7 Días', '7 Jours', '7 Giorni') },
                  { id: '30d', label: tr('30 Dias', '30 Días', '30 Jours', '30 Giorni') },
                  { id: 'all', label: tr('Tudo', 'Todo', 'Tout', 'Tutto') },
                ] as { id: SupervisorPeriodFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectQuickPeriod(opt.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    period === opt.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Day-by-Day Stepper + Custom Date Range Picker */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-xl border border-border flex-wrap">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="h-7 w-7 rounded-lg bg-background hover:bg-muted border border-border flex items-center justify-center text-foreground transition-colors"
                title={tr('Dia anterior', 'Día anterior', 'Jour précédent', 'Giorno precedente')}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {tr('De', 'Desde', 'Du', 'Dal')}
                </span>
                <Input
                  type="date"
                  value={customStartDate}
                  max={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomStartDate(val);
                    if (customEndDate && val > customEndDate) {
                      setCustomEndDate(val);
                    }
                    setPeriod('custom');
                  }}
                  className="h-7 w-[132px] text-xs font-mono bg-background border-input px-2"
                />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {tr('até', 'hasta', 'au', 'al')}
                </span>
                <Input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  max={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomEndDate(val);
                    if (customStartDate && val < customStartDate) {
                      setCustomStartDate(val);
                    }
                    setPeriod('custom');
                  }}
                  className="h-7 w-[132px] text-xs font-mono bg-background border-input px-2"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                disabled={
                  period === 'today' ||
                  (period === 'custom' && customStartDate === todayStr && customEndDate === todayStr)
                }
                className="h-7 w-7 rounded-lg bg-background hover:bg-muted disabled:opacity-40 border border-border flex items-center justify-center text-foreground transition-colors"
                title={tr('Dia seguinte', 'Día siguiente', 'Jour suivant', 'Giorno successivo')}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Window Indicator + Reference Today/Yesterday */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 font-bold px-2.5 py-1">
              📅 {activePeriodLabel}
            </Badge>
            {kpis && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-bold">
                  {tr('Hoje:', 'Hoy:', 'Auj. :', 'Oggi:')} {kpis.todayCalls}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold">
                  {tr('Ontem:', 'Ayer:', 'Hier :', 'Ieri:')} {kpis.yesterdayCalls}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center rounded-2xl bg-card border border-border text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-medium">
            {tr(
              'Carregando painel executivo de supervisão...',
              'Cargando panel ejecutivo de supervisión...',
              'Chargement du tableau de bord de supervision...',
              'Caricamento pannello esecutivo di supervisione...'
            )}
          </p>
        </div>
      ) : !kpis ? null : (
        <>
          {/* 6 High-Impact Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. Total Calls */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr('Total Chamadas', 'Total Llamadas', 'Total d’Appels', 'Totale Chiamate')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-3xl font-black text-foreground tracking-tight">{kpis.totalCalls}</p>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  <strong className="text-blue-600 dark:text-blue-400">{kpis.todayCalls}</strong>{' '}
                  {tr('hoje', 'hoy', 'auj.', 'oggi')} •{' '}
                  <strong className="text-amber-600 dark:text-amber-400">{kpis.yesterdayCalls}</strong>{' '}
                  {tr('ontem', 'ayer', 'hier', 'ieri')}
                </span>
              </div>
            </div>

            {/* 2. Total Talk Time */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {tr('Tempo em Linha', 'Tiempo Total Atención', 'Temps Total d’Appel', 'Tempo Totale Chiamate')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 tracking-tight">
                {formatDurationHMS(kpis.totalDurationSeconds)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                {tr(
                  'Tempo real cronometrado em tela',
                  'Tiempo real cronometrado en atención',
                  'Temps réel chronométré en ligne',
                  'Tempo reale cronometrato in linea'
                )}
              </div>
            </div>

            {/* 3. Average Duration */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-indigo-500/30 shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  {tr('Tempo Médio (TMA)', 'Tiempo Medio Llamada', 'Durée Moyenne', 'Durata Media')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-indigo-700 dark:text-indigo-300 tracking-tight">
                {formatDurationMMSS(kpis.avgDurationSeconds)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                {tr('Com decisor:', 'Con decisor:', 'Avec décideur :', 'Con decisore:')}{' '}
                <strong className="font-mono text-foreground">
                  {formatDurationMMSS(kpis.answeredAvgDurationSeconds)}
                </strong>
              </div>
            </div>

            {/* 4. Contact Rate */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr('Taxa de Contato', 'Tasa de Contacto', 'Taux de Contact', 'Tasso di Contatto')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
                {kpis.contactRate}%
              </p>
              <div className="text-[11px] text-muted-foreground">
                <strong>{kpis.answeredCount}</strong> {tr('decisor', 'decisor', 'décideur', 'decisore')} •{' '}
                <strong>{kpis.noAnswerCount}</strong> {tr('s/ resp.', 'sin resp.', 'sans rép.', 'senza risp.')}
              </div>
            </div>

            {/* 5. Quotes / Demand */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-lime-500" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {tr('Orçamentos / Obras', 'Presupuestos', 'Devis Générés', 'Preventivi')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {kpis.convertedCount}
              </p>
              <div className="text-[11px] text-muted-foreground">
                <strong>{kpis.conversionRate}%</strong>{' '}
                {tr('taxa de conversão', 'tasa de conversión', 'taux de conversion', 'tasso conversione')}
              </div>
            </div>

            {/* 6. Callbacks + Materials */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {tr('Agenda & Dossiês', 'Agenda y Material', 'Agenda & Dossiers', 'Agenda e Materiali')}
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {kpis.scheduledCount + (kpis.materialCount || 0)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                <strong>{kpis.scheduledCount}</strong> {tr('agend.', 'agend.', 'rappels', 'richiami')} •{' '}
                <strong>{kpis.materialCount || 0}</strong> {tr('materiais', 'correos', 'dossiers', 'materiali')}
              </div>
            </div>
          </div>

          {/* Live Team Pulse Grid (Visible when monitoring all commercials!) */}
          {!isCommercialOperator && selectedCommercialKey === 'all' && kpis.sdrPerformances.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  {tr(
                    'Painel de Acompanhamento Individual em Tempo Real (Clique em um comercial para isolar)',
                    'Panel de Seguimiento Individual en Tiempo Real (Clic en un comercial para filtrar)',
                    'Suivi Individuel en Temps Réel (Cliquez sur un commercial pour filtrer)',
                    'Monitoraggio Individuale in Tempo Reale (Clicca su un commerciale per filtrare)'
                  )}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {tr('Meta diária: 20–30 ligações', 'Meta diaria: 20–30 llamadas', 'Objectif : 20–30 appels/j', 'Target: 20–30 chiamate/g')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {kpis.sdrPerformances.slice(0, 6).map((sdr) => {
                  const act = getSdrActivityBadge(sdr.lastCallAt);
                  const refCount =
                    period === 'yesterday'
                      ? sdr.yesterdayCalls
                      : period === 'today'
                      ? sdr.todayCalls
                      : sdr.todayCalls;
                  const dailyGoalPct = Math.min(100, Math.round((refCount / 25) * 100));

                  return (
                    <div
                      key={sdr.userId}
                      onClick={() => {
                        if (sdr.ownerKey) setSelectedCommercialKey(sdr.ownerKey as CommercialOwnerKey);
                      }}
                      className="p-3.5 rounded-2xl bg-card border border-border hover:border-indigo-500/60 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {sdr.flag || sdr.userName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground truncate">
                              {sdr.shortName || sdr.userName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {sdr.empresaName || 'Comercial'}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-black font-mono text-foreground shrink-0">
                          {sdr.totalCalls}
                        </span>
                      </div>

                      {/* Activity Status Pill */}
                      <div
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 truncate ${act.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.dotCls}`} />
                        <span className="truncate">{act.text}</span>
                      </div>

                      {/* Daily Goal Bar + Talk Time */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-muted-foreground">
                            {period === 'yesterday'
                              ? `${tr('Ontem:', 'Ayer:', 'Hier :', 'Ieri:')} ${sdr.yesterdayCalls}/25`
                              : `${tr('Hoje:', 'Hoy:', 'Auj. :', 'Oggi:')} ${sdr.todayCalls}/25`}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ⏱ {formatDurationCompact(sdr.totalDuration)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              refCount >= 20
                                ? 'bg-emerald-500'
                                : refCount >= 10
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${dailyGoalPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Mini Outcome Counters */}
                      <div className="pt-1.5 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span title={tr('Materiais enviados', 'Materiales enviados', 'Dossiers envoyés', 'Materiali inviati')}>
                          📧 <strong className="text-foreground">{sdr.materialCalls}</strong>
                        </span>
                        <span title={tr('Agendamentos', 'Agendamientos', 'Rappels', 'Appuntamenti')}>
                          📅 <strong className="text-foreground">{sdr.scheduledCalls}</strong>
                        </span>
                        <span title={tr('Orçamentos', 'Presupuestos', 'Devis', 'Preventivi')}>
                          ✅ <strong className="text-emerald-600 dark:text-emerald-400">{sdr.convertedCalls}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Rhythm Chart (7 cols) + Outcome Funnel (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Rhythm / Trend Chart */}
            <div className="lg:col-span-7 rounded-2xl bg-card border border-border shadow-sm p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {kpis.isSingleDayMode
                        ? tr(
                            'Ritmo de Ligações por Hora do Dia (08h às 20h)',
                            'Ritmo de Llamadas por Hora del Día (08h a 20h)',
                            'Rythme des Appels par Heure (08h à 20h)',
                            'Ritmo Chiamate per Ora del Giorno (08h - 20h)'
                          )
                        : tr(
                            'Evolução Diária de Ligações & Atendimento',
                            'Evolución Diaria de Llamadas y Atención',
                            'Évolution Quotidienne des Appels',
                            'Evoluzione Giornaliera Chiamate'
                          )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {tr(
                        'Passe o mouse nas colunas para ver total de chamadas, atendidas e tempo falado em cada faixa.',
                        'Pase el cursor sobre las barras para ver llamadas totales, atendidas y tiempo hablado.',
                        'Survolez les barres pour voir le total d’appels, répondus et temps parlé.',
                        'Passa il mouse sulle barre per vedere chiamate totali, risposte e tempo parlato.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
                    {tr('Total chamadas', 'Total llamadas', 'Total appels', 'Totale chiamate')}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    {tr('Atendidas', 'Atendidas', 'Répondus', 'Risposte')}
                  </span>
                </div>
              </div>

              {chartBars.length === 0 || kpis.totalCalls === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  {tr(
                    'Nenhuma chamada registrada na janela selecionada.',
                    'Ninguna llamada registrada en el período seleccionado.',
                    'Aucun appel enregistré sur la période sélectionnée.',
                    'Nessuna chiamata registrata nel periodo selezionato.'
                  )}
                </div>
              ) : (
                <div className="h-44 flex items-end gap-1.5 pt-4 px-1">
                  {chartBars.map((bar) => {
                    const totalHeightPct = Math.max(bar.calls > 0 ? 8 : 2, Math.round((bar.calls / maxBarCalls) * 100));
                    const ansHeightPct =
                      bar.calls > 0 ? Math.round((bar.answered / bar.calls) * 100) : 0;

                    return (
                      <div
                        key={bar.key}
                        className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end min-w-0"
                        title={`${bar.label}: ${bar.calls} chamadas (${bar.answered} atendidas) • ⏱ ${formatDurationCompact(
                          bar.durationSeconds
                        )}`}
                      >
                        <span className="text-[10px] font-mono font-bold text-foreground/80 opacity-85 group-hover:opacity-100">
                          {bar.calls > 0 ? bar.calls : ''}
                        </span>
                        <div className="w-full max-w-[34px] bg-muted/60 rounded-t-lg h-32 flex items-end overflow-hidden p-0.5">
                          <div
                            className="w-full bg-indigo-500/85 group-hover:bg-indigo-600 rounded-t-md transition-all duration-300 flex items-end overflow-hidden"
                            style={{ height: `${totalHeightPct}%` }}
                          >
                            {ansHeightPct > 0 && (
                              <div
                                className="w-full bg-emerald-500 transition-all duration-300"
                                style={{ height: `${ansHeightPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-full">
                          {bar.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outcome Distribution & Rejection Breakdown (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {tr(
                      'Raio-X de Resultados & Objeções',
                      'Radiografía de Resultados y Rechazos',
                      'Répartition des Résultats & Refus',
                      'Distribuzione Risultati e Rifiuti'
                    )}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {kpis.totalCalls} {tr('registros', 'registros', 'appels', 'chiamate')}
                </span>
              </div>

              {/* Outcome Funnel Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    label: tr('Material Enviado', 'Pidió Material', 'Dossier Envoyé', 'Materiale Inv.'),
                    val: kpis.materialCount,
                    cls: 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300',
                  },
                  {
                    label: tr('Retorno Agendado', 'Agendó Cita', 'Rappel Planifié', 'Richiamo Pianif.'),
                    val: kpis.scheduledCount,
                    cls: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
                  },
                  {
                    label: tr('Orçamento Gerado', 'Presupuesto', 'Devis Généré', 'Preventivo'),
                    val: kpis.convertedCount,
                    cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
                  },
                  {
                    label: tr('Recepção / Filtro', 'Recepción / Filtro', 'Standard / Filtre', 'Reception / Filtro'),
                    val: kpis.gatekeeperCount || 0,
                    cls: 'bg-orange-500/10 border-orange-500/25 text-orange-700 dark:text-orange-300',
                  },
                  {
                    label: tr('Não Atendeu', 'No Contestó', 'Sans Réponse', 'Non Risponde'),
                    val: kpis.noAnswerCount,
                    cls: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300',
                  },
                  {
                    label: tr('Sem Interesse', 'Sin Interés', 'Sans Intérêt', 'Nessun Interesse'),
                    val: kpis.rejectedCount,
                    cls: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300',
                  },
                ].map((item) => (
                  <div key={item.label} className={`p-2.5 rounded-xl border ${item.cls} space-y-0.5`}>
                    <span className="text-[10px] font-bold uppercase block truncate opacity-85">
                      {item.label}
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black font-mono">{item.val}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {kpis.totalCalls > 0 ? `${Math.round((item.val / kpis.totalCalls) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Rejection Reasons */}
              {kpis.rejectedCount > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {tr('Motivos de Recusa:', 'Motivos de Rechazo:', 'Motifs de Refus :', 'Motivi di Rifiuto:')}
                    </span>
                    <span>{kpis.rejectedCount}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(kpis.rejectionBreakdown)
                      .filter(([, c]) => c > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reasonKey, count]) => {
                        const label = rejectionLabels[reasonKey] || reasonKey;
                        const percent = Math.round((count / kpis.rejectedCount) * 100);
                        return (
                          <div key={reasonKey} className="space-y-0.5">
                            <div className="flex justify-between text-[11px] gap-2">
                              <span className="text-foreground/90 truncate">{label}</span>
                              <span className="font-mono text-muted-foreground shrink-0">
                                {count} ({percent}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Complete Commercial Productivity Comparative Table */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-foreground">
                  {tr(
                    'Ranking & Produtividade Consolidada por Comercial',
                    'Ranking y Productividad Consolidada por Comercial',
                    'Classement & Productivité Consolidée par Commercial',
                    'Classifica e Produttività Consolidata per Commerciale'
                  )}
                </h3>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                {tr(
                  'Meta Oficial: 20–30 chamadas/dia',
                  'Meta Oficial: 20–30 llamadas/día',
                  'Objectif : 20–30 appels/jour',
                  'Target: 20–30 chiamate/giorno'
                )}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b border-border text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{tr('Comercial', 'Comercial', 'Commercial', 'Commerciale')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Hoje', 'Hoy', 'Auj.', 'Oggi')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Ontem', 'Ayer', 'Hier', 'Ieri')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('No Período', 'En Período', 'Période', 'Nel Periodo')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Atend.', 'Atend.', 'Rép.', 'Risp.')}</th>
                    <th className="py-3 px-3 text-center">{tr('Tempo em Linha', 'Tiempo Total', 'Temps Total', 'Tempo Totale')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('T. Médio', 'T. Medio', 'T. Moyen', 'T. Medio')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Material', 'Material', 'Dossiers', 'Materiale')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Agenda', 'Agenda', 'Agenda', 'Agenda')}</th>
                    <th className="py-3 px-2.5 text-center">{tr('Orçam.', 'Presup.', 'Devis', 'Prev.')}</th>
                    <th className="py-3 px-4 text-right">{tr('Status / Última', 'Estado / Última', 'Statut / Dernier', 'Stato / Ultima')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {kpis.sdrPerformances.map((sdr) => {
                    const goalPct = Math.min(100, Math.round((sdr.todayCalls / 25) * 100));
                    const act = getSdrActivityBadge(sdr.lastCallAt);

                    return (
                      <tr
                        key={sdr.userId}
                        onClick={() => {
                          if (!isCommercialOperator && sdr.ownerKey) {
                            setSelectedCommercialKey(
                              selectedCommercialKey === sdr.ownerKey
                                ? 'all'
                                : (sdr.ownerKey as CommercialOwnerKey)
                            );
                          }
                        }}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {sdr.flag || sdr.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-foreground block leading-tight">{sdr.userName}</span>
                              {sdr.empresaName && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {sdr.empresaName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2.5 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span
                              className={`font-mono font-black ${
                                sdr.todayCalls >= 20
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-foreground'
                              }`}
                            >
                              {sdr.todayCalls}
                            </span>
                            <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${goalPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-semibold text-amber-700 dark:text-amber-300">
                          {sdr.yesterdayCalls}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-black text-sm text-foreground">
                          {sdr.totalCalls}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono text-sky-600 dark:text-sky-400 font-bold">
                          {sdr.answeredCalls}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-mono font-bold text-[11px]">
                            {formatDurationHMS(sdr.totalDuration)}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatDurationMMSS(sdr.avgDurationSeconds)}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                          {sdr.materialCalls}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                          {sdr.scheduledCalls}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {sdr.convertedCalls}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${act.cls}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${act.dotCls}`} />
                            {act.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Call-by-Call Audit Table */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    {tr(
                      'Auditoria Detalhada de Chamadas & Tempo de Atendimento',
                      'Auditoría Detallada de Llamadas y Tiempos de Atención',
                      'Journal d’Audit Détaillé des Appels & Temps',
                      'Audit Dettagliato Chiamate e Tempi'
                    )}
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {filteredLogs.length}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tr(
                      'Clique em qualquer linha para ler a observação completa formatada ou abrir o cliente diretamente no Cockpit.',
                      'Haga clic en cualquier fila para leer la nota completa formateada o abrir el cliente directamente en el Cockpit.',
                      'Cliquez sur une ligne pour lire la note complète ou ouvrir le client dans le Cockpit.',
                      'Clicca su una riga per leggere la nota completa o aprire il cliente nel Cockpit.'
                    )}
                  </p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder={tr(
                      'Filtrar por empresa, comercial, telefone ou nota...',
                      'Filtrar por empresa, comercial, teléfono o nota...',
                      'Filtrer par client, commercial, téléphone ou note...',
                      'Filtra per azienda, commerciale, telefono o nota...'
                    )}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Outcome Quick Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  ['all', tr('Todos Resultados', 'Todos', 'Tous', 'Tutti')],
                  ['answered_converted', `✅ ${tr('Orçamento', 'Presupuesto', 'Devis', 'Preventivo')}`],
                  ['answered_callback', `📅 ${tr('Agendou', 'Agendó', 'Planifié', 'Pianificato')}`],
                  ['answered_interested', `📧 ${tr('Pediu Material', 'Pidió Material', 'Dossier', 'Materiale')}`],
                  ['gatekeeper_blocked', `🏢 ${tr('Recepção', 'Recepción', 'Standard', 'Reception')}`],
                  ['no_answer', `📵 ${tr('Não Atendeu', 'No Contestó', 'Sans Réponse', 'Non Risponde')}`],
                  ['answered_rejected', `🚫 ${tr('Sem Interesse', 'Sin Interés', 'Refusé', 'Rifiutato')}`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOutcomeFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      outcomeFilter === key
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-background text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                {tr(
                  'Nenhum registro de chamada para os filtros selecionados.',
                  'Ningún registro de llamada para los filtros seleccionados.',
                  'Aucun appel trouvé pour les filtres sélectionnés.',
                  'Nessuna chiamata trovata per i filtri selezionati.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase font-bold border-b border-border text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">{tr('Data / Hora', 'Fecha / Hora', 'Date / Heure', 'Data / Ora')}</th>
                      <th className="py-3 px-3">{tr('Comercial', 'Comercial', 'Commercial', 'Commerciale')}</th>
                      <th className="py-3 px-3">{tr('Empresa / Cliente', 'Empresa / Cliente', 'Entreprise / Client', 'Azienda / Cliente')}</th>
                      <th className="py-3 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                      <th className="py-3 px-3">{tr('Resultado', 'Resultado', 'Résultat', 'Esito')}</th>
                      <th className="py-3 px-3 text-center">{tr('Duração', 'Duración', 'Durée', 'Durata')}</th>
                      <th className="py-3 px-4">{tr('Anotações da Chamada', 'Notas de Llamada', 'Notes d’Appel', 'Note Chiamata')}</th>
                      <th className="py-3 px-3 text-right">{tr('Ver', 'Ver', 'Voir', 'Vedi')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((row) => {
                      const out = getOutcomeInfo(row.outcome);
                      const OutIcon = out.icon;
                      const plainNote = stripHtmlToPlainText(row.notes);
                      const noteTags = extractTagsFromAppointment([], row.notes);

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedLogForModal(row)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <span>{row.commercialFlag || '👤'}</span>
                              <span>{row.userName}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground leading-tight">{row.companyName}</div>
                            {row.contactName && row.contactName !== row.companyName && (
                              <div className="text-[10px] text-muted-foreground">{row.contactName}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-foreground whitespace-nowrap">
                            {row.phoneCalled}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${out.cls}`}
                            >
                              <OutIcon className="w-3 h-3" />
                              {out.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-black ${
                                row.durationSeconds > 0
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {formatDurationMMSS(row.durationSeconds)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-muted-foreground max-w-md">
                            {noteTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-0.5">
                                {noteTags.slice(0, 3).map((tg) => (
                                  <span
                                    key={tg}
                                    className="px-1.5 py-0 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-bold"
                                  >
                                    {tg}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="line-clamp-2 text-foreground/85 leading-snug">
                              {plainNote || '—'}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogForModal(row);
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* Call Detail Inspection Modal */}
      <Dialog
        open={Boolean(selectedLogForModal)}
        onOpenChange={(open) => !open && setSelectedLogForModal(null)}
      >
        <DialogContent className="sm:max-w-xl bg-card border-border text-foreground p-0 shadow-2xl overflow-hidden">
          {selectedLogForModal && (
            <>
              <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                      {selectedLogForModal.companyName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogForModal.commercialFlag || '👤'} {selectedLogForModal.userName} •{' '}
                      {format(new Date(selectedLogForModal.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </DialogDescription>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">
                    ⏱ {formatDurationMMSS(selectedLogForModal.durationSeconds)}
                  </span>
                </div>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      {tr('Contato / Telefone', 'Contacto / Teléfono', 'Contact / Téléphone', 'Contatto / Telefono')}
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{selectedLogForModal.contactName}</p>
                    <p className="font-mono text-muted-foreground">{selectedLogForModal.phoneCalled}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      {tr('Resultado Registrado', 'Resultado Registrado', 'Résultat Enregistré', 'Esito Registrato')}
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                          getOutcomeInfo(selectedLogForModal.outcome).cls
                        }`}
                      >
                        {getOutcomeInfo(selectedLogForModal.outcome).label}
                      </span>
                    </div>
                    {selectedLogForModal.scheduledCallbackAt && (
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                        📅 {format(new Date(selectedLogForModal.scheduledCallbackAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                    {tr(
                      'Anotações Completas do Atendimento',
                      'Notas Completas de la Llamada',
                      'Notes Complètes de l’Appel',
                      'Note Complete della Chiamata'
                    )}
                  </span>
                  {selectedLogForModal.notes ? (
                    <div
                      dir="ltr"
                      translate="no"
                      className="notranslate p-3.5 rounded-xl bg-background border border-border text-foreground leading-relaxed max-h-60 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: selectedLogForModal.notes.includes('<')
                          ? selectedLogForModal.notes
                          : selectedLogForModal.notes.replace(/\n/g, '<br/>'),
                      }}
                    />
                  ) : (
                    <p className="p-3 rounded-xl bg-muted/30 border border-border text-muted-foreground italic">
                      {tr('Sem anotações registradas.', 'Sin notas registradas.', 'Aucune note.', 'Nessuna nota.')}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLogForModal(null)}
                  className="text-xs"
                >
                  {tr('Fechar', 'Cerrar', 'Fermer', 'Chiudi')}
                </Button>

                {selectedLogForModal.queue_item_id && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const qId = selectedLogForModal.queue_item_id;
                      const cId = selectedLogForModal.campaign_id;
                      setSelectedLogForModal(null);
                      navigate(
                        `/comercial/discador?fromAgenda=1${cId ? `&campaignId=${cId}` : ''}&queueItemId=${qId}`
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {tr(
                      'Abrir Cliente no Cockpit',
                      'Abrir Cliente en Cockpit',
                      'Ouvrir Client au Cockpit',
                      'Apri Cliente nel Cockpit'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
