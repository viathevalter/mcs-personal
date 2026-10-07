import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useTranslation } from 'react-i18next';
import type { TimesheetDayEntry } from '../services/timesheetPdfService';

interface MonthlyCalendarViewProps {
    year: number;
    month: number;
    days: TimesheetDayEntry[];
    monthlyStats: {
        totalHours: number;
        totalNormais: number;
        totalNoturnas: number;
        daysWorked: number;
        pendingDays: number;
    };
    onSelectDay: (dayNumber: number) => void;
    onMonthChange: (month: number, year: number) => void;
    onViewWeekDetails?: () => void;
    activeTab: 'semana' | 'mes';
    onTabChange: (tab: 'semana' | 'mes') => void;
}

export function MonthlyCalendarView({
    year,
    month,
    days,
    monthlyStats,
    onSelectDay,
    onMonthChange,
    onViewWeekDetails,
    activeTab,
    onTabChange
}: MonthlyCalendarViewProps) {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');
    const locale = isSpanish ? 'es-ES' : 'pt-PT';

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    // Calcular dias vazios antes do dia 1 (para alinhar com Segunda-feira como coluna 0)
    const firstDayDate = new Date(year, month - 1, 1);
    const startPadding = (firstDayDate.getDay() + 6) % 7;
    const numDays = days.length;

    const monthName = firstDayDate.toLocaleDateString(locale, { month: 'long' });

    const weekdayHeaders = useMemo(() => {
        // Seg a Dom
        const headers: string[] = [];
        for (let i = 1; i <= 7; i++) {
            // 2026-05-04 is a Monday
            const d = new Date(2026, 4, 3 + i);
            headers.push(d.toLocaleDateString(locale, { weekday: 'short' }));
        }
        return headers;
    }, [locale]);

    const handlePrevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) { m = 12; y--; }
        onMonthChange(m, y);
    };

    const handleNextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) { m = 1; y++; }
        onMonthChange(m, y);
    };

    return (
        <div className="space-y-4">
            {/* Toggle Abas: Semana / Mês */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-xs mx-auto shadow-inner">
                <button
                    type="button"
                    onClick={() => onTabChange('semana')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'semana'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    {t('workerPortal.weeklyView.tabWeek', 'Semana')}
                </button>
                <button
                    type="button"
                    onClick={() => onTabChange('mes')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'mes'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    {t('workerPortal.weeklyView.tabMonth', 'Mês')}
                </button>
            </div>

            {/* Cabeçalho do Mês */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-center">
                    <span className="text-base font-black text-slate-900 capitalize block leading-tight">
                        {monthName} {year}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                        {monthlyStats.totalHours.toFixed(1).replace('.', ',')}h &bull; {monthlyStats.daysWorked} {t('workerPortal.dashboard.daysUnit', 'dias')}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Grelha do Calendário Mensal */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {weekdayHeaders.map((header, idx) => (
                        <span
                            key={idx}
                            className={`text-[11px] font-extrabold uppercase tracking-wider py-1 capitalize ${
                                idx >= 5 ? 'text-slate-400' : 'text-slate-600'
                            }`}
                        >
                            {header}
                        </span>
                    ))}
                </div>

                {/* Dias do Mês */}
                <div className="grid grid-cols-7 gap-1.5">
                    {/* Padding inicial (dias vazios antes do dia 1) */}
                    {Array.from({ length: startPadding }).map((_, idx) => (
                        <div key={`pad-${idx}`} className="h-12 rounded-xl" />
                    ))}

                    {/* Células de cada dia */}
                    {days.map((day) => {
                        const dateObj = new Date(year, month - 1, day.dia);
                        const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0=Seg, 6=Dom
                        const isWeekend = dayOfWeek >= 5;
                        const isToday = day.dia === todayDay;

                        const hasHours = Number(day.totalHoras || 0) > 0;
                        const isRest = day.obs === 'Descanso' || day.obs === 'Folga' || day.obs?.toLowerCase().includes('descanso');
                        const isPending = !hasHours && !isRest && dateObj <= today && !isWeekend;

                        return (
                            <button
                                key={day.dia}
                                type="button"
                                onClick={() => onSelectDay(day.dia)}
                                className={`h-12 rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all select-none border ${
                                    isToday
                                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 active:scale-95'
                                }`}
                            >
                                <span className={`text-xs font-black leading-none ${
                                    isToday 
                                        ? 'text-emerald-900 font-black' 
                                        : isWeekend 
                                        ? 'text-slate-400' 
                                        : 'text-slate-700'
                                }`}>
                                    {day.dia}
                                </span>

                                {/* Indicador Visual do Dia */}
                                <div className="flex items-center justify-center">
                                    {hasHours ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black text-emerald-700 leading-none">
                                                {Number(day.totalHoras) % 1 === 0 ? Number(day.totalHoras) : Number(day.totalHoras).toFixed(1)}h
                                            </span>
                                            <div className="h-1 w-1 rounded-full bg-emerald-600 mt-0.5" />
                                        </div>
                                    ) : isPending ? (
                                        <div className="h-2 w-2 rounded-full bg-amber-500 shadow-xs animate-pulse" />
                                    ) : isRest ? (
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                    ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Legenda de Status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span>{t('workerPortal.calendarView.statusFilled', 'Horas Apontadas')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>{t('workerPortal.calendarView.statusPending', 'Dia Pendente')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                        <span>{t('workerPortal.calendarView.statusRest', 'Folga / Descanso')}</span>
                    </div>
                </div>
            </div>

            {/* Ação para ver lista da semana */}
            {onViewWeekDetails && (
                <Button
                    variant="outline"
                    onClick={onViewWeekDetails}
                    className="w-full h-11 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                    {t('workerPortal.calendarView.btnViewWeek', 'Ver Lista da Semana')}
                </Button>
            )}
        </div>
    );
}
