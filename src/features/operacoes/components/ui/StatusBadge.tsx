import React from 'react';

interface StatusBadgeProps {
    status: string;
    type?: 'status' | 'impact' | 'priority' | 'default';
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'default', className = '' }) => {
    const getColors = () => {
        const s = status.toLowerCase();

        if (type === 'impact' || type === 'priority') {
            if (['crítico', 'critica', 'critico'].includes(s)) return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800';
            if (['alto', 'alta'].includes(s)) return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800';
            if (['médio', 'media', 'medio'].includes(s)) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800';
            if (['baixo', 'baixa'].includes(s)) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800';
            return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
        }

        if (type === 'status') {
            if (['aberto', 'pendente'].includes(s)) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800';
            if (['em andamento', 'working'].includes(s)) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800';
            if (['concluida', 'resolvido', 'fechado', 'done'].includes(s)) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800';
            return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
        }

        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getColors()} ${className}`}>
            {status}
        </span>
    );
};
