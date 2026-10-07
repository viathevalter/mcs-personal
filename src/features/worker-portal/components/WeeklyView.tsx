import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Plus, Clock, Sun, Moon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { TimesheetDayEntry } from '../services/timesheetPdfService';
import type { WeekBreakdown } from '../hooks/useWorkerTimesheet';

interface WeeklyViewProps {
    activeWeek: WeekBreakdown | null;
    weekIndex: number;
    totalWeeks: number;
    year: number;
    month: number;
    onSelectWeekIndex: (idx: number) => void;
    onSelectDay: (dayNumber: number) => void;
    activeTab: 'semana' | 'mes';
    onTabChange: (tab: 'semana' | 'mes') => void;
}

const WEEKDAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WeeklyView({
    activeWeek,
    weekIndex,
    totalWeeks,
    year,
    month,
    onSelectWeekIndex,
    onSelectDay,
    activeTab,
    onTabChange
}: WeeklyViewProps) {
    if (!activeWeek) return null;

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

            {/* Navegação da Semana */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
                <button
                    type="button"
                    disabled={weekIndex <= 0}
                    onClick={() => onSelectWeekIndex(weekIndex - 1)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-center">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700 block">
                        {activeWeek.label.toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                        {activeWeek.startDateStr} – {activeWeek.endDateStr} {year}
                    </span>
                </div>

                <button
                    type="button"
                    disabled={weekIndex >= totalWeeks - 1}
                    onClick={() => onSelectWeekIndex(weekIndex + 1)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* 3 Mini KPIs da Semana */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-xs">
                    <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {activeWeek.daysWorked}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                        dias trabalhados
                    </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-center shadow-xs">
                    <span className="text-2xl font-black text-emerald-800 block leading-tight">
                        {activeWeek.totalHours.toFixed(1).replace('.', ',')} h
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-tight block">
                        total da semana
                    </span>
                </div>

                <div className={`rounded-2xl p-3 text-center border shadow-xs ${
                    activeWeek.pendingDays > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-900'
                }`}>
                    <span className={`text-2xl font-black block leading-tight ${activeWeek.pendingDays > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {activeWeek.pendingDays}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-tight block ${activeWeek.pendingDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        dias pendentes
                    </span>
                </div>
            </div>

            {/* Lista Compacta dos 7 Dias */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
                {activeWeek.days.map((day) => {
                    const dateObj = new Date(year, month - 1, day.dia);
                    const dayOfWeek = dateObj.getDay();
                    const weekdayShort = WEEKDAY_NAMES_SHORT[dayOfWeek];
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    const hasHours = Number(day.totalHoras || 0) > 0;
                    const isRest = day.obs === 'Descanso' || day.obs === 'Folga';
                    const isPending = !hasHours && !isRest && dateObj <= new Date() && !isWeekend;

                    return (
                        <div
                            key={day.dia}
                            onClick={() => onSelectDay(day.dia)}
                            className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors select-none"
                        >
                            {/* Dia e Dia da Semana */}
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-base font-black text-slate-800 w-7">
                                    {String(day.dia).padStart(2, '0')}
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-wider ${isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {weekdayShort}
                                </span>
                            </div>

                            {/* Informação Central de Horas */}
                            <div className="flex items-center gap-3">
                                {hasHours ? (
                                    <div className="text-right">
                                        <span className="text-sm font-extrabold text-slate-900 block">
                                            {Number(day.totalHoras).toFixed(1).replace('.', ',')} h
                                        </span>
                                        {Number(day.horasNoturnas || 0) > 0 && (
                                            <span className="text-[10px] font-bold text-indigo-600 block">
                                                Noturno
                                            </span>
                                        )}
                                    </div>
                                ) : isRest ? (
                                    <span className="text-xs font-medium text-slate-400 italic">
                                        Folga/Descanso
                                    </span>
                                ) : isPending ? (
                                    <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        Pendente
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-slate-400">
                                        Não informado
                                    </span>
                                )}

                                {/* Ícone de Status à Direita */}
                                {hasHours ? (
                                    <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                ) : isPending ? (
                                    <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200">
                                        <Plus className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
