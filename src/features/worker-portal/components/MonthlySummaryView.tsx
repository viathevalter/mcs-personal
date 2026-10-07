import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useTranslation } from 'react-i18next';
import type { WeekBreakdown } from '../hooks/useWorkerTimesheet';

interface MonthlySummaryViewProps {
    year: number;
    month: number;
    weeks: WeekBreakdown[];
    monthlyStats: {
        totalHours: number;
        totalNormais: number;
        totalNoturnas: number;
        daysWorked: number;
        pendingDays: number;
    };
    onMonthChange: (month: number, year: number) => void;
    onSelectWeek: (weekIndex: number) => void;
    onBack: () => void;
}

export function MonthlySummaryView({
    year,
    month,
    weeks,
    monthlyStats,
    onMonthChange,
    onSelectWeek,
    onBack
}: MonthlySummaryViewProps) {
    const { t, i18n } = useTranslation();
    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');
    const locale = isSpanish ? 'es-ES' : 'pt-PT';

    const dateObj = new Date(year, month - 1, 1);
    const monthName = dateObj.toLocaleDateString(locale, { month: 'long' });

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
            {/* Topo com botão Voltar */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-extrabold text-slate-900">
                    {t('workerPortal.summaryView.title', 'Resumo do Mês')}
                </h2>
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
                    <span className="text-base font-extrabold text-slate-900 capitalize">
                        {monthName} {year}
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

            {/* 4 KPIs em Grid 2x2 */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                    <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {monthlyStats.daysWorked}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block mt-0.5">
                        {t('workerPortal.summaryView.daysWorked', 'dias trabalhados')}
                    </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
                    <span className="text-2xl font-black text-emerald-800 block leading-tight">
                        {monthlyStats.totalHours.toFixed(1).replace('.', ',')} h
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-tight block mt-0.5">
                        {t('workerPortal.summaryView.totalHours', 'horas totais')}
                    </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                    <span className="text-2xl font-black text-indigo-700 block leading-tight">
                        {monthlyStats.totalNoturnas.toFixed(1).replace('.', ',')} h
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block mt-0.5">
                        {t('workerPortal.summaryView.nightHours', 'horas nocturnas')}
                    </span>
                </div>

                <div className={`rounded-2xl p-3.5 border shadow-xs ${
                    monthlyStats.pendingDays > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-900'
                }`}>
                    <span className={`text-2xl font-black block leading-tight ${monthlyStats.pendingDays > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {monthlyStats.pendingDays}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-tight block mt-0.5 ${monthlyStats.pendingDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {t('workerPortal.summaryView.pendingDays', 'dias pendentes')}
                    </span>
                </div>
            </div>

            {/* Detalhe por semana */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                    {t('workerPortal.summaryView.detailByWeek', 'Detalhe por Semana')}
                </h3>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
                    {weeks.map((week, idx) => (
                        <div
                            key={idx}
                            onClick={() => onSelectWeek(idx)}
                            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
                        >
                            <div>
                                <span className="text-sm font-bold text-slate-900 block">
                                    {week.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {week.daysWorked} {t('workerPortal.dashboard.daysUnit', 'dias')} &bull; {week.startDateStr} – {week.endDateStr}
                                </span>
                            </div>

                            <div className="text-right">
                                <span className="text-sm font-black text-emerald-800 block">
                                    {week.totalHours.toFixed(1).replace('.', ',')} h
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {t('workerPortal.weeklyView.tapToFill', 'Ver semana')} &rarr;
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
