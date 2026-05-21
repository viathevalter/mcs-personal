import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  subtext?: string;
  color?: "default" | "success" | "warning" | "danger" | "primary";
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, trend, trendLabel, color: _color = "default" }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</h3>
        {/* Optional Icon or Decoration */}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-medium ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : trend < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            <span className="ml-0.5">{Math.abs(trend)}%</span>
          </div>
        )}
        {trendLabel && <span className="text-xs text-slate-400 dark:text-slate-500">{trendLabel}</span>}
      </div>
    </div>
  );
};
