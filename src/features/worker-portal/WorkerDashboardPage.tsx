import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
    Calendar, 
    CalendarDays, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    FileText, 
    UploadCloud, 
    Plus, 
    ChevronRight, 
    ArrowLeft, 
    MapPin, 
    Building2, 
    Sparkles, 
    Download, 
    Send,
    Edit3,
    BarChart3
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useTranslation } from 'react-i18next';
import { useWorkerTimesheet } from './hooks/useWorkerTimesheet';
import { DailyEntryModal } from './components/DailyEntryModal';
import { WeeklyView } from './components/WeeklyView';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { GeneratePdfView } from './components/GeneratePdfView';
import { UploadComponent } from './UploadComponent';
import { getCompanyBranding } from './services/companyLogos';
import { downloadTimesheetPdf, type TimesheetPdfData, type TimesheetDayEntry } from './services/timesheetPdfService';

type SubView = 'home' | 'week' | 'calendar' | 'summary' | 'generate-pdf' | 'upload';

export function WorkerDashboardPage() {
    const { t, i18n } = useTranslation();
    const { workerAuth } = useOutletContext<{ workerAuth: any }>();
    
    // Hook principal de gestão de horas e períodos
    const timesheet = useWorkerTimesheet(workerAuth);
    const {
        allPeriods,
        selectedPeriod,
        selectedPeriodId,
        setSelectedPeriodId,
        loading,
        currentYear,
        currentMonth,
        days,
        weeks,
        activeWeek,
        selectedWeekIndex,
        setSelectedWeekIndex,
        todayDayNumber,
        todayEntry,
        todayIsFilled,
        monthlyStats,
        firstPendingDay,
        saveDayEntry,
        deleteDayEntry,
        setMonthYear,
        availableObras,
        defaultObra,
        reload
    } = timesheet;

    // Sub-visão ativa
    const [subView, setSubView] = useState<SubView>('home');
    
    // Modal de apontamento diário
    const [modalDay, setModalDay] = useState<number | null>(null);

    // Diálogo de troca de obra/cliente (caso haja múltiplos períodos no mês ou múltiplas obras cadastradas)
    const [showObraSelector, setShowObraSelector] = useState(false);

    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');
    const locale = isSpanish ? 'es-ES' : 'pt-PT';

    // Identificação visual do trabalhador
    const workerInitials = useMemo(() => {
        if (!workerAuth?.nome) return 'TR';
        const parts = workerAuth.nome.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [workerAuth?.nome]);

    const branding = getCompanyBranding(
        selectedPeriod?.contratante || workerAuth?.contratante || workerAuth?.empresa_nome
    );

    // Estado da obra selecionada pelo trabalhador para o dia a dia
    const [selectedObraName, setSelectedObraName] = useState<string>('');

    // Nome da obra prioritária vinculada ao cliente (sempre uma obra real)
    const currentObraName = useMemo(() => {
        if (selectedObraName && availableObras.some(s => s.name === selectedObraName)) {
            return selectedObraName;
        }
        if (availableObras.length > 0) return availableObras[0].name;
        return 'Obra Principal';
    }, [selectedObraName, availableObras]);

    // Todos os períodos disponíveis no mês atual para troca de cliente/contrato
    const currentMonthPeriods = useMemo(() => {
        return allPeriods.filter(
            p => p.period_year === currentYear && p.period_month === currentMonth
        );
    }, [allPeriods, currentYear, currentMonth]);

    // Notificação proativa para trabalhadores (com suporte especial a iPhone / Safari)
    useEffect(() => {
        if (loading || !selectedPeriod) return;

        const checkPendingReminder = () => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
            const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            const sessionKey = `last_hours_reminder_${todayKey}`;

            // Se ainda não notificou nesta sessão hoje e faltam horas
            if (!sessionStorage.getItem(sessionKey)) {
                if (isWeekday && !todayIsFilled && todayDayNumber) {
                    sessionStorage.setItem(sessionKey, 'true');
                    toast.info(
                        isSpanish ? '¡Recuerda registrar tus horas de hoy!' : 'Lembrete: Aponte as suas horas de hoje!',
                        {
                            description: isSpanish 
                                ? 'Solo te tomará unos segundos.' 
                                : 'Leva apenas 5 segundos no telemóvel.',
                            action: {
                                label: isSpanish ? 'Registrar' : 'Apontar',
                                onClick: () => handleOpenDailyModal(todayDayNumber)
                            },
                            duration: 8000
                        }
                    );
                } else if (monthlyStats.pendingDays > 0 && firstPendingDay) {
                    sessionStorage.setItem(sessionKey, 'true');
                    toast.warning(
                        isSpanish ? `Tienes ${monthlyStats.pendingDays} día(s) pendiente(s)` : `Tem ${monthlyStats.pendingDays} dia(s) pendente(s)`,
                        {
                            description: isSpanish 
                                ? 'Completa tus horas para tener la hoja al día.' 
                                : 'Complete as horas em falta para fechar o mês.',
                            action: {
                                label: isSpanish ? 'Completar' : 'Preencher',
                                onClick: () => handleOpenDailyModal(firstPendingDay)
                            },
                            duration: 8000
                        }
                    );
                }
            }
        };

        const timer = setTimeout(checkPendingReminder, 1200);
        return () => clearTimeout(timer);
    }, [loading, selectedPeriod, todayIsFilled, todayDayNumber, monthlyStats.pendingDays, firstPendingDay, isSpanish]);

    // Data de hoje formatada no idioma ativo
    const todayDateFormatted = useMemo(() => {
        const now = new Date();
        const weekDay = now.toLocaleDateString(locale, { weekday: 'long' });
        const day = now.getDate();
        const monthName = now.toLocaleDateString(locale, { month: 'long' });
        const prefix = isSpanish ? 'Hoy' : 'Hoje';
        return `${prefix}, ${weekDay} · ${day} ${isSpanish ? 'de' : 'de'} ${monthName}`;
    }, [locale, isSpanish]);

    // Nome do mês atual
    const currentMonthName = useMemo(() => {
        const d = new Date(currentYear, currentMonth - 1, 1);
        return d.toLocaleDateString(locale, { month: 'long' });
    }, [currentYear, currentMonth, locale]);

    // Abertura do modal para um dia específico (garantir sempre número inteiro de 1 a 31)
    const handleOpenDailyModal = (day: number | any) => {
        const parsed = typeof day === 'object' && day !== null 
            ? Number(day.dia ?? day.day ?? 1) 
            : Number(day);
        setModalDay(Number.isFinite(parsed) ? parsed : 1);
    };

    // Download rápido direto do PDF
    const handleQuickDownloadPdf = async () => {
        if (!selectedPeriod) return;
        const compName = selectedPeriod.contratante || workerAuth?.empresa_nome || 'MCS Personal';
        const b = getCompanyBranding(compName);
        const pdfData: TimesheetPdfData = {
            empresaNome: compName,
            empresaNif: workerAuth?.empresa_nif || b?.nif,
            logoUrl: b?.logoUrl,
            workerNome: workerAuth?.nome || 'Trabalhador',
            workerDoc: workerAuth?.pasaporte || workerAuth?.nie || 'N/A',
            workerFuncion: workerAuth?.funcion || 'Operador',
            clienteNome: selectedPeriod.cliente_nombre || 'NÃO DEFINIDO',
            obraNome: currentObraName,
            mes: selectedPeriod.period_month,
            ano: selectedPeriod.period_year,
            apontamentos: (selectedPeriod.apontamentos_diarios as any[]) || [],
            totalNormais: Number(selectedPeriod.total_horas_normais || 0),
            totalNoturnas: Number(selectedPeriod.total_horas_noturnas || 0),
            totalGeral: Number(selectedPeriod.horas_totais || 0),
            encarregadoNome: selectedPeriod.encarregado_nome,
            signedAt: selectedPeriod.signed_at,
            signedIp: selectedPeriod.signed_ip,
            signatureImageUrl: selectedPeriod.signature_image_url
        };
        await downloadTimesheetPdf(pdfData);
    };

    // Estado de carregamento
    if (loading && !selectedPeriod) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-3" />
                <p className="text-sm font-medium text-slate-600">
                    {t('workerPortal.dashboard.loading', 'A carregar os seus apontamentos...')}
                </p>
            </div>
        );
    }

    // SUB-VISÃO: VISÃO SEMANAL (TELA 4)
    if (subView === 'week') {
        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <button
                    type="button"
                    onClick={() => setSubView('home')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> {t('workerPortal.dashboard.backHome', 'Voltar ao Início')}
                </button>

                <WeeklyView
                    activeWeek={activeWeek}
                    weekIndex={selectedWeekIndex}
                    totalWeeks={weeks.length}
                    year={currentYear}
                    month={currentMonth}
                    onSelectWeekIndex={setSelectedWeekIndex}
                    onSelectDay={handleOpenDailyModal}
                    activeTab="semana"
                    onTabChange={(tab) => {
                        if (tab === 'mes') setSubView('calendar');
                    }}
                />

                {/* Modal Diário acoplado */}
                {modalDay !== null && (
                    <DailyEntryModal
                        isOpen={true}
                        dayNumber={modalDay}
                        month={currentMonth}
                        year={currentYear}
                        initialEntry={days.find(d => d.dia === modalDay)}
                        defaultObra={currentObraName || defaultObra}
                        availableObras={availableObras}
                        clientName={selectedPeriod?.cliente_nombre || ''}
                        onClose={() => setModalDay(null)}
                        onSave={async (entry) => {
                            await saveDayEntry(entry);
                            setModalDay(null);
                        }}
                        onDelete={async (day) => {
                            await deleteDayEntry(day);
                            setModalDay(null);
                        }}
                        onNavigateDay={(nextDay) => setModalDay(nextDay)}
                        maxDaysInMonth={days.length}
                    />
                )}
            </div>
        );
    }

    // SUB-VISÃO: CALENDÁRIO MENSAL (TELA 5)
    if (subView === 'calendar') {
        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <button
                    type="button"
                    onClick={() => setSubView('home')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> {t('workerPortal.dashboard.backHome', 'Voltar ao Início')}
                </button>

                <MonthlyCalendarView
                    year={currentYear}
                    month={currentMonth}
                    days={days}
                    monthlyStats={monthlyStats}
                    onSelectDay={handleOpenDailyModal}
                    onMonthChange={setMonthYear}
                    onViewWeekDetails={() => setSubView('week')}
                    activeTab="mes"
                    onTabChange={(tab) => {
                        if (tab === 'semana') setSubView('week');
                    }}
                />

                {/* Modal Diário acoplado */}
                {modalDay !== null && (
                    <DailyEntryModal
                        isOpen={true}
                        dayNumber={modalDay}
                        month={currentMonth}
                        year={currentYear}
                        initialEntry={days.find(d => d.dia === modalDay)}
                        defaultObra={currentObraName || defaultObra}
                        availableObras={availableObras}
                        clientName={selectedPeriod?.cliente_nombre || ''}
                        onClose={() => setModalDay(null)}
                        onSave={async (entry) => {
                            await saveDayEntry(entry);
                            setModalDay(null);
                        }}
                        onDelete={async (day) => {
                            await deleteDayEntry(day);
                            setModalDay(null);
                        }}
                        onNavigateDay={(nextDay) => setModalDay(nextDay)}
                        maxDaysInMonth={days.length}
                    />
                )}
            </div>
        );
    }

    // SUB-VISÃO: RESUMO MENSAL (TELA 7)
    if (subView === 'summary') {
        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <MonthlySummaryView
                    year={currentYear}
                    month={currentMonth}
                    weeks={weeks}
                    monthlyStats={monthlyStats}
                    onMonthChange={setMonthYear}
                    onSelectWeek={(wIdx) => {
                        setSelectedWeekIndex(wIdx);
                        setSubView('week');
                    }}
                    onBack={() => setSubView('home')}
                />

                {/* Botão de ação direta para gerar PDF */}
                <div className="pt-2">
                    <Button
                        onClick={() => setSubView('generate-pdf')}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md gap-2"
                    >
                        <FileText className="h-5 w-5" />
                        {t('workerPortal.summaryView.btnGeneratePdf', 'Gerar PDF Oficial do Mês')}
                    </Button>
                </div>
            </div>
        );
    }

    // SUB-VISÃO: GERAR E ENVIAR PDF (TELAS 8, 9, 10)
    if (subView === 'generate-pdf' && selectedPeriod) {
        return (
            <div className="max-w-lg mx-auto">
                <GeneratePdfView
                    worker={workerAuth}
                    period={selectedPeriod}
                    days={days}
                    monthlyStats={monthlyStats}
                    onBack={() => setSubView('home')}
                    onSwitchToUpload={() => setSubView('upload')}
                    onCompleted={() => {
                        reload();
                        setSubView('home');
                    }}
                />
            </div>
        );
    }

    // SUB-VISÃO: UPLOAD EM PAPEL (PLANO B)
    if (subView === 'upload' && selectedPeriod) {
        return (
            <div className="space-y-4 max-w-lg mx-auto">
                <button
                    type="button"
                    onClick={() => setSubView('home')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> {t('workerPortal.dashboard.backHome', 'Voltar ao Início')}
                </button>

                <UploadComponent
                    worker={workerAuth}
                    period={selectedPeriod}
                    onCancel={() => setSubView('home')}
                    onSuccess={() => {
                        reload();
                        setSubView('home');
                    }}
                />
            </div>
        );
    }

    // VISÃO PRINCIPAL (TELA 2 - DASHBOARD MOBILE-FIRST)
    return (
        <div className="space-y-4 max-w-lg mx-auto">
            {/* 1. CABEÇALHO DO TRABALHADOR */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-base flex items-center justify-center shadow-xs flex-shrink-0">
                        {workerInitials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 truncate leading-tight">
                            {workerAuth?.nome || t('workerPortal.dashboard.workerTitle', 'Trabalhador')}
                        </h2>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                {workerAuth?.pasaporte || workerAuth?.nie || 'Doc. N/A'}
                            </span>
                            <span>•</span>
                            <span className="truncate font-semibold text-slate-700">
                                {branding?.name || selectedPeriod?.contratante || workerAuth?.contratante || 'MCS Personal'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Seletor de mês rápido */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <select
                        aria-label="Selecionar Mês"
                        value={`${currentYear}-${currentMonth}`}
                        onChange={(e) => {
                            const [y, m] = e.target.value.split('-').map(Number);
                            setMonthYear(m, y);
                        }}
                        className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                        {Array.from({ length: 6 }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - i);
                            const yr = d.getFullYear();
                            const mo = d.getMonth() + 1;
                            const mName = d.toLocaleDateString(locale, { month: 'short' });
                            return (
                                <option key={`${yr}-${mo}`} value={`${yr}-${mo}`}>
                                    {mName} {yr}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* TAG DA OBRA REAL / CLIENTE ATUAL + TROCA CASO TENHA MAIS DE UMA */}
            <div className="bg-slate-100/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs border border-slate-200/60">
                <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-500">{t('workerPortal.dashboard.obraActual', 'Obra atual:')}</span>
                    <strong className="text-slate-800 truncate">
                        {currentObraName}
                    </strong>
                    {selectedPeriod?.cliente_nombre && selectedPeriod.cliente_nombre !== currentObraName && (
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                            &bull; {selectedPeriod.cliente_nombre}
                        </span>
                    )}
                </div>
                {(currentMonthPeriods.length > 1 || availableObras.length > 1) && (
                    <button
                        type="button"
                        onClick={() => setShowObraSelector(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline ml-2 flex-shrink-0"
                    >
                        {t('workerPortal.dashboard.changeObra', 'Trocar')}
                    </button>
                )}
            </div>

            {/* MODAL DE SELEÇÃO DE OBRA / CLIENTE (Se houver múltiplas) */}
            {showObraSelector && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-emerald-600" />
                                {t('workerPortal.dashboard.selectObraTitle', 'Selecionar Obra / Cliente')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowObraSelector(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {/* Obras cadastradas para o cliente */}
                            {availableObras.length > 1 && (
                                <div className="space-y-1.5 mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Obras Cadastradas
                                    </span>
                                    {availableObras.map((site) => {
                                        const isSelected = currentObraName === site.name;
                                        return (
                                            <button
                                                key={site.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedObraName(site.name);
                                                    setShowObraSelector(false);
                                                }}
                                                className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                                                    isSelected
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                                                        : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span>{site.name}</span>
                                                </div>
                                                {isSelected ? (
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Ativa ✓</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Selecionar</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Contratos / Clientes do Trabalhador */}
                            {currentMonthPeriods.map((period) => (
                                <button
                                    key={period.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedPeriodId(period.id);
                                        setShowObraSelector(false);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                                        selectedPeriod?.id === period.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <span className="truncate">{period.cliente_nombre || 'Geral'}</span>
                                    {selectedPeriod?.id === period.id && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CARD PRINCIPAL DE HOJE (AÇÃO RÁPIDA DE 5 SEGUNDOS) */}
            <Card className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 shadow-md overflow-hidden">
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 capitalize">
                            {todayDateFormatted}
                        </span>
                        {todayIsFilled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {t('workerPortal.dashboard.todayRecorded', 'Registado')}
                            </span>
                        )}
                    </div>

                    {/* Situação: Se já apontou hoje vs Se ainda falta apontar */}
                    {todayIsFilled ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
                                <div>
                                    <div className="text-2xl font-black text-emerald-900 flex items-center gap-1.5">
                                        {Number(todayEntry?.totalHoras || 0).toFixed(1).replace('.', ',')}
                                        <span className="text-sm font-bold text-emerald-700">
                                            {t('workerPortal.dashboard.hours', 'horas')}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        {todayEntry?.horasNoturnas && todayEntry.horasNoturnas > 0
                                            ? `${t('workerPortal.dashboard.nightShift', 'Nocturno')} (${todayEntry.horasNoturnas}h)`
                                            : t('workerPortal.dashboard.dayShift', 'Turno Diurno')}
                                        {todayEntry?.entrada && ` • ${todayEntry.entrada} - ${todayEntry.saida}`}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => handleOpenDailyModal(todayDayNumber)}
                                    variant="outline"
                                    className="h-10 px-4 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs gap-1.5 shadow-2xs"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    {t('workerPortal.dashboard.editToday', 'Editar')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <Button
                                onClick={() => handleOpenDailyModal(todayDayNumber)}
                                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <Plus className="h-5 w-5 stroke-[2.5]" />
                                {t('workerPortal.dashboard.pointTodayHours', 'Apontar minhas horas de hoje')}
                            </Button>
                            <p className="text-center text-[11px] text-slate-500 font-medium">
                                {t('workerPortal.dashboard.quickTimeTip', 'Leva apenas 5 a 10 segundos no seu telemóvel')}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. ALERTA DE DIAS PENDENTES (Se houver dias passados sem registo) */}
            {monthlyStats.pendingDays > 0 && firstPendingDay && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs font-bold text-amber-900 truncate">
                                {t('workerPortal.dashboard.pendingAlertTitle', 'Faltam horas de dias anteriores')}
                            </h4>
                            <p className="text-[11px] text-amber-700 font-medium">
                                {t('workerPortal.dashboard.pendingDaysCount', {
                                    count: monthlyStats.pendingDays,
                                    defaultValue: `${monthlyStats.pendingDays} dia(s) pendente(s) no mês`
                                })}
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => handleOpenDailyModal(firstPendingDay)}
                        className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex-shrink-0 shadow-2xs"
                    >
                        {t('workerPortal.dashboard.fillNow', 'Preencher')}
                    </Button>
                </div>
            )}

            {/* 4. MINI KPIS DE RESUMO */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        {t('workerPortal.dashboard.kpiWeek', 'Semana')}
                    </span>
                    <span className="text-lg font-black text-slate-900 block mt-0.5">
                        {Number(activeWeek?.totalHours || 0).toFixed(1).replace('.', ',')}h
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                        {activeWeek?.daysWorked || 0} {t('workerPortal.dashboard.daysUnit', 'dias')}
                    </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        {t('workerPortal.dashboard.kpiMonth', 'Total Mês')}
                    </span>
                    <span className="text-lg font-black text-emerald-700 block mt-0.5">
                        {Number(monthlyStats.totalHours || 0).toFixed(1).replace('.', ',')}h
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                        {monthlyStats.daysWorked} {t('workerPortal.dashboard.daysUnit', 'dias')}
                    </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                        {t('workerPortal.dashboard.kpiPending', 'Pendentes')}
                    </span>
                    <span className={`text-lg font-black block mt-0.5 ${
                        monthlyStats.pendingDays > 0 ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                        {monthlyStats.pendingDays}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                        {monthlyStats.pendingDays === 0 
                            ? t('workerPortal.dashboard.upToDate', 'Em dia') 
                            : t('workerPortal.dashboard.toFill', 'a lançar')}
                    </span>
                </div>
            </div>

            {/* 5. AÇÕES RÁPIDAS (MENUS EM CARDS) */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                    {t('workerPortal.dashboard.quickActions', 'Ações Rápidas')}
                </h3>

                <div className="grid gap-2">
                    {/* CARD: Minhas horas da semana */}
                    <button
                        type="button"
                        onClick={() => setSubView('week')}
                        className="w-full bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50 transition-all flex items-center justify-between text-left shadow-2xs group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                    {t('workerPortal.dashboard.actionWeekTitle', 'Minhas horas da semana')}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    {t('workerPortal.dashboard.actionWeekDesc', 'Visualizar os 7 dias e apontar horas passadas')}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* CARD: Calendário do mês */}
                    <button
                        type="button"
                        onClick={() => setSubView('calendar')}
                        className="w-full bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50 transition-all flex items-center justify-between text-left shadow-2xs group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                    {t('workerPortal.dashboard.actionCalendarTitle', 'Calendário do mês')}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    {t('workerPortal.dashboard.actionCalendarDesc', 'Grelha completa com pontos de status')}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* CARD: Resumo do mês */}
                    <button
                        type="button"
                        onClick={() => setSubView('summary')}
                        className="w-full bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50 transition-all flex items-center justify-between text-left shadow-2xs group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                    {t('workerPortal.dashboard.actionSummaryTitle', 'Resumo do mês')}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    {t('workerPortal.dashboard.actionSummaryDesc', 'Totais por semana, horas diurnas e nocturnas')}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* CARD: Gerar PDF para assinatura */}
                    <button
                        type="button"
                        onClick={() => setSubView('generate-pdf')}
                        className="w-full bg-gradient-to-r from-emerald-50 to-teal-50/60 p-3.5 rounded-2xl border border-emerald-200 hover:border-emerald-300 transition-all flex items-center justify-between text-left shadow-2xs group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold text-emerald-950 leading-tight">
                                        {t('workerPortal.dashboard.actionPdfTitle', 'Gerar PDF para assinatura')}
                                    </h4>
                                    <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                                        {t('workerPortal.dashboard.officialBadge', 'Oficial')}
                                    </span>
                                </div>
                                <p className="text-[11px] text-emerald-800/80 font-medium">
                                    {t('workerPortal.dashboard.actionPdfDesc', 'Enviar para o encarregado validar digitalmente')}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* CARD: Enviar folha em papel (Plano B) */}
                    <button
                        type="button"
                        onClick={() => setSubView('upload')}
                        className="w-full bg-white p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50/50 transition-all flex items-center justify-between text-left group"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                                <UploadCloud className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-700 leading-tight">
                                    {t('workerPortal.dashboard.actionPaperTitle', 'Enviar foto da folha em papel (Plano B)')}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {t('workerPortal.dashboard.actionPaperDesc', 'Caso tenha preenchido o modelo físico impresso')}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* STATUS DO PERÍODO ATUAL & DOWNLOAD RÁPIDO */}
            {selectedPeriod && (
                <div className="bg-white rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-600 font-medium capitalize">
                            {t('workerPortal.dashboard.timesheetOf', { month: currentMonthName, defaultValue: `Folha de ${currentMonthName}:` })}
                        </span>
                        <StatusPill status={selectedPeriod.status} />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleQuickDownloadPdf}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold gap-1"
                        title="Baixar PDF do Mês"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t('workerPortal.dashboard.pdfBtn', 'PDF')}
                    </Button>
                </div>
            )}

            {/* MODAL DIÁRIO DE 5 SEGUNDOS (Acoplado ao Dashboard) */}
            {modalDay !== null && (
                <DailyEntryModal
                    isOpen={true}
                    dayNumber={modalDay}
                    month={currentMonth}
                    year={currentYear}
                    initialEntry={days.find(d => d.dia === modalDay)}
                    defaultObra={currentObraName || defaultObra}
                    availableObras={availableObras}
                    clientName={selectedPeriod?.cliente_nombre || ''}
                    onClose={() => setModalDay(null)}
                    onSave={async (entry) => {
                        await saveDayEntry(entry);
                        setModalDay(null);
                    }}
                    onDelete={async (day) => {
                        await deleteDayEntry(day);
                        setModalDay(null);
                    }}
                    onNavigateDay={(nextDay) => setModalDay(nextDay)}
                    maxDaysInMonth={days.length}
                />
            )}
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    switch (status) {
        case 'pendente':
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Pendente
                </span>
            );
        case 'em_andamento':
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Rascunho
                </span>
            );
        case 'aguardando_assinatura':
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Aguardando Assinatura
                </span>
            );
        case 'assinado_encarregado':
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Assinado
                </span>
            );
        case 'validado':
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Validado
                </span>
            );
        default:
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {status}
                </span>
            );
    }
}
