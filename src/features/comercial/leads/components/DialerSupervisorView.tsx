import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  PhoneCall, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  ShieldAlert,
  Calendar,
  Loader2,
  Clock,
  Timer,
  Download,
  Search,
  User,
  Mail,
  PhoneOff,
  PhoneForwarded,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDialerSupervisorKPIs, type SupervisorPeriodFilter } from '../hooks/useDialer';
import { useCommercialScope } from '../hooks/useLeads';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';

function formatDurationHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
}

function formatDurationMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function DialerSupervisorView() {
  const {
    activeProfile,
    allProfiles,
    selectedCommercialKey,
    setSelectedCommercialKey,
    isCommercialOperator,
  } = useCommercialScope();

  const operatorLangOverride = (activeProfile?.language as SupportedComercialLang | undefined) || null;
  const { tr } = useComercialLanguage(operatorLangOverride);

  const [period, setPeriod] = useState<SupervisorPeriodFilter>('all');
  const [logSearch, setLogSearch] = useState('');

  const { data: kpis, isLoading } = useDialerSupervisorKPIs(period);

  const rejectionLabels: Record<string, string> = {
    has_own_team: tr('Já possui equipe própria / Fixos', 'Ya tiene equipo propio / Fijos', 'Possède déjà sa propre équipe', 'Ha già squadra interna / Fissi'),
    no_demand: tr('Sem obras ou paradas no momento', 'Sin obras o paradas en este momento', 'Pas de chantier ou d’arrêt en ce moment', 'Nessun cantiere al momento'),
    price_too_high: tr('Tarifa horária acima do orçamento', 'Tarifa horaria por encima del presupuesto', 'Tarif horaire au-dessus du budget', 'Tariffa oraria oltre il budget'),
    does_not_outsource: tr('Não terceiriza mão de obra', 'No subcontrata mano de obra', 'Ne sous-traite pas la main-d’œuvre', 'Non esternalizza manodopera'),
    bad_contact: tr('Contato incorreto / Sem decisor', 'Contacto incorrecto / Sin decisor', 'Contact incorrect / Sans décideur', 'Contatto errato / Senza decisore'),
    other: tr('Outros motivos', 'Otros motivos', 'Autres motifs', 'Altri motivi'),
  };

  const getOutcomeInfo = (outcome: string) => {
    switch (outcome) {
      case 'answered_converted':
        return {
          label: tr('Orçamento Gerado', 'Presupuesto Generado', 'Devis Généré', 'Preventivo Generato'),
          icon: CheckCircle2,
          cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        };
      case 'answered_callback':
        return {
          label: tr('Agendou Retorno', 'Agendó Seguimiento', 'Rappel Planifié', 'Richiamo Pianificato'),
          icon: Calendar,
          cls: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
        };
      case 'answered_interested':
        return {
          label: tr('Pediu Material', 'Pidió Material', 'Demande Dossier', 'Richiede Materiale'),
          icon: Mail,
          cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
        };
      case 'answered_rejected':
        return {
          label: tr('Sem Interesse', 'Sin Interés', 'Sans Intérêt', 'Nessun Interesse'),
          icon: Ban,
          cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
        };
      case 'gatekeeper_blocked':
        return {
          label: tr('Recepção', 'Recepción', 'Standard', 'Reception'),
          icon: PhoneForwarded,
          cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
        };
      case 'no_answer':
      case 'busy':
        return {
          label: tr('Não Atendeu', 'No Contestó', 'Pas de Réponse', 'Non Risponde'),
          icon: PhoneOff,
          cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
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
    if (!q) return list;
    return list.filter(
      row =>
        row.companyName.toLowerCase().includes(q) ||
        row.contactName.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.phoneCalled.toLowerCase().includes(q) ||
        (row.notes || '').toLowerCase().includes(q)
    );
  }, [kpis?.recentCallLogs, logSearch]);

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
      'Notas',
    ];
    const rows = filteredLogs.map(r => [
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm:ss'),
      r.userName,
      r.empresaName || '',
      r.companyName,
      r.contactName,
      r.phoneCalled,
      getOutcomeInfo(r.outcome).label,
      String(r.durationSeconds || 0),
      formatDurationMMSS(r.durationSeconds || 0),
      (r.notes || '').replace(/\r?\n/g, ' '),
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-tempo-atendimento-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Toolbar: Commercial Isolation + Period Selector + CSV Export */}
      <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Commercial Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {tr('Comercial:', 'Comercial:', 'Commercial :', 'Commerciale:')}
          </span>
          {isCommercialOperator && activeProfile ? (
            <Badge className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1">
              {activeProfile.flag} {activeProfile.displayName} ({activeProfile.empresaName})
            </Badge>
          ) : (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCommercialKey('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCommercialKey === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tr('Todos (6)', 'Todos (6)', 'Tous (6)', 'Tutti (6)')}
              </button>
              {allProfiles.map(prof => (
                <button
                  key={prof.key}
                  type="button"
                  onClick={() => setSelectedCommercialKey(prof.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
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
        </div>

        {/* Period Filter + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
            {(
              [
                { id: 'today', label: tr('Hoje', 'Hoy', 'Aujourd’hui', 'Oggi') },
                { id: '7d', label: tr('7 Dias', '7 Días', '7 Jours', '7 Giorni') },
                { id: '30d', label: tr('30 Dias', '30 Días', '30 Jours', '30 Giorni') },
                { id: 'all', label: tr('Tudo', 'Todo', 'Tout', 'Tutto') },
              ] as { id: SupervisorPeriodFilter; label: string }[]
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  period === opt.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!filteredLogs.length}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            {tr('Exportar Relatório CSV', 'Exportar CSV', 'Exporter CSV', 'Esporta CSV')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm">
            {tr(
              'Carregando relatório de tempo e métricas da equipe...',
              'Cargando informe de tiempos y métricas del equipo...',
              'Chargement du rapport de temps et des métriques...',
              'Caricamento report tempi e metriche del team...'
            )}
          </p>
        </div>
      ) : !kpis || kpis.totalCalls === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
          <PhoneCall className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            {tr(
              'Nenhum atendimento registrado neste período',
              'Ninguna atención registrada en este período',
              'Aucun appel enregistré sur cette période',
              'Nessuna chiamata registrata in questo periodo'
            )}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {tr(
              'Inicie os atendimentos no Cockpit com o botão de Abrir/Encerrar Tempo para acompanhar a duração exata de cada chamada.',
              'Inicie las atenciones en el Cockpit con el botón de Iniciar/Encerrar Tiempo para medir la duración exacta de cada llamada.',
              'Démarrez les appels dans le Cockpit avec le chronomètre pour suivre la durée exacte de chaque appel.',
              'Avvia le chiamate nel Cockpit con il cronometro per monitorare la durata esatta di ogni conversazione.'
            )}
          </p>
        </div>
      ) : (
        <>
          {/* 6 KPI Cards Including Attendance Time Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. Total Calls */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr('Total Atendimentos', 'Total Llamadas', 'Total d’Appels', 'Totale Chiamate')}
                </span>
                <PhoneCall className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{kpis.totalCalls}</p>
              <div className="text-[11px] text-muted-foreground">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{kpis.todayCalls}</span>{' '}
                {tr('hoje (Meta: 20–30/dia)', 'hoy (Meta: 20–30/día)', 'aujourd’hui (Obj: 20–30/j)', 'oggi (Target: 20–30/g)')}
              </div>
            </div>

            {/* 2. Total Time in Attendance */}
            <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {tr('Tempo Total Falado', 'Tiempo Total Atención', 'Temps Total d’Appel', 'Tempo Totale Chiamate')}
                </span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                {formatDurationHMS(kpis.totalDurationSeconds)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                {tr('Soma dos atendimentos', 'Suma de atenciones', 'Cumul des appels', 'Somma delle chiamate')}
              </div>
            </div>

            {/* 3. Average Call Duration */}
            <div className="p-4 rounded-2xl bg-card border border-indigo-500/30 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  {tr('Tempo Médio (TMA)', 'Tiempo Medio Llamada', 'Durée Moyenne', 'Durata Media')}
                </span>
                <Timer className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-300">
                {formatDurationMMSS(kpis.avgDurationSeconds)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                {tr('Atendidas:', 'Atendidas:', 'Répondus :', 'Risposte:')}{' '}
                <strong className="font-mono text-foreground">{formatDurationMMSS(kpis.answeredAvgDurationSeconds)}</strong>
              </div>
            </div>

            {/* 4. Contact Rate */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr('Taxa de Contato', 'Tasa de Contacto', 'Taux de Contact', 'Tasso di Contatto')}
                </span>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{kpis.contactRate}%</p>
              <div className="text-[11px] text-muted-foreground">
                <strong>{kpis.answeredCount}</strong> {tr('atendidas c/ decisor', 'con decisor', 'avec décideur', 'con decisore')}
              </div>
            </div>

            {/* 5. Presupuestos Generated */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {tr('Orçamentos', 'Presupuestos', 'Devis Générés', 'Preventivi')}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.convertedCount}</p>
              <div className="text-[11px] text-muted-foreground">
                <strong>{kpis.conversionRate}%</strong> {tr('conversão', 'conversión', 'conversion', 'conversione')}
              </div>
            </div>

            {/* 6. Callbacks & Materials */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {tr('Agenda & Material', 'Agenda y Material', 'Agenda & Dossiers', 'Agenda e Materiali')}
                </span>
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {kpis.scheduledCount + (kpis.materialCount || 0)}
              </p>
              <div className="text-[11px] text-muted-foreground">
                {kpis.scheduledCount} {tr('agend.', 'agend.', 'rappels', 'richiami')} • {kpis.materialCount || 0}{' '}
                {tr('e-mails', 'correos', 'e-mails', 'e-mail')}
              </div>
            </div>
          </div>

          {/* Grid: SDR Productivity + Time Table (8 cols) & Rejection Reasons (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Salespeople Time & Productivity Table */}
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {tr(
                      'Relatório de Produtividade & Tempo por Comercial',
                      'Informe de Productividad y Tiempos por Comercial',
                      'Rapport de Productivité & Temps par Commercial',
                      'Report Produttività e Tempi per Commerciale'
                    )}
                  </h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {tr('Meta Oficial: 20–30 chamadas/dia', 'Meta Oficial: 20–30 llamadas/día', 'Objectif : 20–30 appels/jour', 'Target: 20–30 chiamate/giorno')}
                </Badge>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b border-border text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{tr('Comercial', 'Comercial', 'Commercial', 'Commerciale')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('Hoje', 'Hoy', 'Auj.', 'Oggi')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('Total', 'Total', 'Total', 'Totale')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('Atend.', 'Atend.', 'Rép.', 'Risp.')}</th>
                      <th className="py-3 px-3 text-center">{tr('Tempo Total', 'Tiempo Total', 'Temps Total', 'Tempo Totale')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('T. Médio', 'T. Medio', 'T. Moyen', 'T. Medio')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('Orçam.', 'Presup.', 'Devis', 'Prev.')}</th>
                      <th className="py-3 px-2.5 text-center">{tr('Agenda', 'Agenda', 'Agenda', 'Agenda')}</th>
                      <th className="py-3 px-3 text-right">{tr('Conv.', 'Conv.', 'Conv.', 'Conv.')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {kpis.sdrPerformances.map(sdr => {
                      const sdrConversion = sdr.totalCalls > 0 ? ((sdr.convertedCalls / sdr.totalCalls) * 100).toFixed(1) : '0.0';
                      const goalPct = Math.min(100, Math.round((sdr.todayCalls / 25) * 100));
                      return (
                        <tr key={sdr.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {sdr.flag || sdr.userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-foreground block leading-tight">{sdr.userName}</span>
                                {sdr.empresaName && (
                                  <span className="text-[10px] text-muted-foreground font-normal">{sdr.empresaName}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2.5 text-center">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className={`font-mono font-black ${sdr.todayCalls >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                {sdr.todayCalls}
                              </span>
                              <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${goalPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2.5 text-center font-mono font-bold text-foreground">{sdr.totalCalls}</td>
                          <td className="py-3 px-2.5 text-center font-mono text-blue-600 dark:text-blue-400 font-semibold">{sdr.answeredCalls}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[11px]">
                              {formatDurationHMS(sdr.totalDuration)}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {formatDurationMMSS(sdr.avgDurationSeconds)}
                          </td>
                          <td className="py-3 px-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">{sdr.convertedCalls}</td>
                          <td className="py-3 px-2.5 text-center font-mono text-amber-600 dark:text-amber-400">{sdr.scheduledCalls}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{sdrConversion}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Breakdown (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {tr('Motivos de Recusa', 'Motivos de Rechazo', 'Motifs de Refus', 'Motivi di Rifiuto')}
                  </h3>
                </div>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">
                  {kpis.rejectedCount} {tr('recusas', 'rechazos', 'refus', 'rifiuti')}
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(kpis.rejectionBreakdown).map(([reasonKey, count]) => {
                  const label = rejectionLabels[reasonKey] || reasonKey;
                  const percent = kpis.rejectedCount > 0 ? Math.round((count / kpis.rejectedCount) * 100) : 0;

                  return (
                    <div key={reasonKey} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium gap-2">
                        <span className="text-foreground/90 truncate">{label}</span>
                        <span className="font-mono text-muted-foreground shrink-0">{count} ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Call-by-Call Time & Attendance Report */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  {tr(
                    'Registro Detalhado de Chamadas & Tempo de Atendimento',
                    'Registro Detallado de Llamadas y Tiempos de Atención',
                    'Journal Détaillé des Appels & Temps d’Intervention',
                    'Registro Dettagliato Chiamate e Tempi di Assistenza'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tr(
                    'Histórico individual com data/hora, comercial, cliente, duração cronometrada e observações.',
                    'Historial individual con fecha/hora, comercial, cliente, duración cronometrada y notas.',
                    'Historique individuel avec date/heure, commercial, client, durée chronométrée et notes.',
                    'Storico individuale con data/ora, commerciale, cliente, durata cronometrata e note.'
                  )}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder={tr('Filtrar por empresa, comercial ou nota...', 'Filtrar por empresa, comercial o nota...', 'Filtrer par client, commercial ou note...', 'Filtra per azienda, commerciale o nota...')}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-bold border-b border-border text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">{tr('Data / Hora', 'Fecha / Hora', 'Date / Heure', 'Data / Ora')}</th>
                    <th className="py-3 px-3">{tr('Comercial', 'Comercial', 'Commercial', 'Commerciale')}</th>
                    <th className="py-3 px-3">{tr('Empresa / Cliente', 'Empresa / Cliente', 'Entreprise / Client', 'Azienda / Cliente')}</th>
                    <th className="py-3 px-3">{tr('Telefone', 'Teléfono', 'Téléphone', 'Telefono')}</th>
                    <th className="py-3 px-3">{tr('Resultado', 'Resultado', 'Résultat', 'Esito')}</th>
                    <th className="py-3 px-3 text-center">{tr('Tempo Atendimento', 'Duración', 'Durée', 'Durata')}</th>
                    <th className="py-3 px-4">{tr('Anotações', 'Notas de Llamada', 'Notes d’Appel', 'Note')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map(row => {
                    const out = getOutcomeInfo(row.outcome);
                    const OutIcon = out.icon;
                    return (
                      <tr key={row.id} className="hover:bg-muted/25 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.created_at), 'dd/MM/yyyy HH:mm')}
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${out.cls}`}>
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
                        <td className="py-3 px-4 text-[11px] text-muted-foreground max-w-xs">
                          <p className="line-clamp-2" title={row.notes || ''}>
                            {row.notes || '—'}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
