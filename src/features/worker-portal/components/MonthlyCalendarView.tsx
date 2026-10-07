import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
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

const MONTH_NAMES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    // Calcular dias vazios antes do dia 1 (para alinhar com Segunda-feira como coluna 0)
    const firstDayDate = new Date(year, month - 1, 1);
    // getDay() retorna 0 para Domingo, 1 para Segunda, etc.
    // Convertendo para 0 = Segunda, 6 = Domingo:
    const startPadding = (firstDayDate.getDay() + 6) % 7;
    const numDays = days.length;

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
                    Semana
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
                    Mês
                </button>
            </div>

            {/* Navegação do Mês */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-center">
                    <span className="text-base font-extrabold text-slate-900">
                        {MONTH_NAMES_PT[month - 1]} de {year}
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

            {/* 3 KPIs do Mês */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-xs">
                    <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {monthlyStats.daysWorked}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                        dias trabalhados
                    </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-center shadow-xs">
                    <span className="text-2xl font-black text-emerald-800 block leading-tight">
                        {monthlyStats.totalHours.toFixed(1).replace('.', ',')} h
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-tight block">
                        total do mês
                    </span>
                </div>

                <div className={`rounded-2xl p-3 text-center border shadow-xs ${
                    monthlyStats.pendingDays > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-900'
                }`}>
                    <span className={`text-2xl font-black block leading-tight ${monthlyStats.pendingDays > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {monthlyStats.pendingDays}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-tight block ${monthlyStats.pendingDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        dias pendentes
                    </span>
                </div>
            </div>

            {/* Grade do Calendário */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {WEEKDAY_HEADERS.map((w, idx) => (
                        <div key={idx} className={idx >= 5 ? 'text-slate-300' : ''}>
                            {w}
                        </div>
                    ))}
                </div>

                {/* Grid dos Dias */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {/* Espaços vazios antes do dia 1 */}
                    {Array.from({ length: startPadding }).map((_, idx) => (
                        <div key={`pad-${idx}`} className="h-11 sm:h-13" />
                    ))}

                    {/* Dias do Mês */}
                    {days.map((day) => {
                        const dateObj = new Date(year, month - 1, day.dia);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const isToday = day.dia === todayDay;
                        const hasHours = Number(day.totalHoras || 0) > 0;
                        const isRest = day.obs === 'Descanso' || day.obs === 'Folga';
                        const isPast = dateObj <= today;
                        const isPending = !hasHours && !isRest && isPast && !isWeekend;

                        return (
                            <button
                                key={day.dia}
                                type="button"
                                onClick={() => onSelectDay(day.dia)}
                                className={`h-11 sm:h-13 rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                                    isToday
                                        ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-900/20'
                                        : hasHours
                                        ? 'bg-emerald-50 text-emerald-950 font-bold hover:bg-emerald-100/70 border border-emerald-100'
                                        : isPending
                                        ? 'bg-amber-50 text-amber-950 font-bold hover:bg-amber-100/70 border border-amber-200'
                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'
                                }`}
                            >
                                <span className="text-xs sm:text-sm leading-none">
                                    {day.dia}
                                </span>

                                {/* Ponto Indicador de Status */}
                                <div className="mt-1 flex items-center justify-center">
                                    {hasHours ? (
                                        <div className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-emerald-600'}`} />
                                    ) : isPending ? (
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span>Com horas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Pendente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                        <span>Não trabalhado</span>
                    </div>
                </div>
            </div>

            {/* Ação para ver detalhes da semana */}
            {onViewWeekDetails && (
                <Button
                    type="button"
                    onClick={onViewWeekDetails}
                    className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs"
                >
                    Ver detalhes da semana
                </Button>
            )}
        </div>
    );
}
