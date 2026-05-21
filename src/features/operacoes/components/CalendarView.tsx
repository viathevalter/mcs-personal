import { useState, useMemo } from 'react';
import type {  IncidenciaTarefaExpandida  } from '../services/types';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isToday,
    parseISO,
    getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// NOTE: To support isAdmin check in CalendarView without breaking existing props,
// we can either add an isAdmin prop or use AuthContext directly.
// Adding isAdmin prop is cleaner.
interface CalendarViewProps {
    tasks: IncidenciaTarefaExpandida[];
    onTaskClick: (task: IncidenciaTarefaExpandida) => void;
    currentUserId?: string;
    onAssignMe?: (taskId: string) => void;
    onEditClick: (task: IncidenciaTarefaExpandida) => void;
    onDeleteClick: (task: IncidenciaTarefaExpandida) => void;
}

export function CalendarView({ tasks, onTaskClick, currentUserId, onAssignMe: _onAssignMe, onEditClick, onDeleteClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const goToday = () => setCurrentDate(new Date());

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);

        // Fill the start with blank days if month doesn't start on Sunday
        const startOffset = getDay(monthStart); // 0 = Sunday, 1 = Monday...
        const blankPrevDays = Array.from({ length: startOffset }).map(() => null);

        const days = eachDayOfInterval({
            start: monthStart,
            end: monthEnd
        });

        return [...blankPrevDays, ...days];
    }, [currentDate]);

    // Group tasks by Date (YYYY-MM-DD string as key)
    const groupedTasks = useMemo(() => {
        const map = new Map<string, IncidenciaTarefaExpandida[]>();

        tasks.forEach(task => {
            // Prioritize scheduled_for, fallback to prazo (due_at)
            const targetDateStr = task.scheduled_for || task.prazo;
            if (!targetDateStr) return;

            try {
                const d = parseISO(targetDateStr);
                const key = format(d, 'yyyy-MM-dd');

                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(task);
            } catch (e) {
                // invalid date
            }
        });

        return map;
    }, [tasks]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Concluida': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            case 'Em Andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'; // Pendente
        }
    };

    const getStatusIcon = (status: string, overdue: boolean) => {
        if (status === 'Concluida') return null;
        if (overdue) return <AlertTriangle size={10} className="text-rose-500 flex-shrink-0" />;
        return <Clock size={10} className="text-slate-400 flex-shrink-0" />;
    };

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] animate-fade-in transition-colors">

            {/* Calendar Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <button
                        onClick={goToday}
                        className="px-3 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Hoje
                    </button>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Header (Days of week) */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                {dayNames.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-slate-100 dark:bg-slate-800 gap-[1px]">
                {calendarDays.map((day, idx) => {
                    if (!day) {
                        return <div key={`empty-${idx}`} className="bg-white dark:bg-slate-900 min-h-[120px]"></div>;
                    }

                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = groupedTasks.get(dateKey) || [];
                    const isCurrentDay = isToday(day);

                    return (
                        <div
                            key={dateKey}
                            className={`bg-white dark:bg-slate-900 min-h-[120px] p-2 flex flex-col transition-colors group hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`w-7 h-7 flex flex-col items-center justify-center rounded-full text-sm font-medium ${isCurrentDay
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                                {dayTasks.length > 0 && (
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                        {dayTasks.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                {dayTasks.map(task => {
                                    const isOverdue = task.status !== 'Concluida' && task.prazo && new Date(task.prazo).getTime() < new Date().getTime();
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            className={`text-xs p-1.5 rounded cursor-pointer border hover:shadow-sm transition-all text-left group/item break-words
                        ${getStatusColor(task.status)}
                      `}
                                            title={task.titulo}
                                        >
                                            <div className="flex items-start gap-1">
                                                <div className="mt-0.5">
                                                    {getStatusIcon(task.status, Boolean(isOverdue))}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold truncate">{task.titulo}</div>
                                                    {task.departamento && (
                                                        <div className="text-[9px] opacity-80 truncate">{task.departamento}</div>
                                                    )}
                                                </div>
                                                {currentUserId === task.created_by && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEditClick(task);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-white rounded"
                                                            title="Editar"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteClick(task);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
};
