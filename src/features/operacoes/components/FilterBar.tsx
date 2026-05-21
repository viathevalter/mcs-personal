import React from 'react';
import { Filter, Calendar, Building, ChevronDown } from 'lucide-react';
import type { Filters } from '../services/types';
import { useLanguage } from '../i18n';

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const { t } = useLanguage();
  const empresas = ['Stocco', 'Wiseowe', 'Luminous', 'Triangulo', 'Kotrik Rosas', 'KR Industrial', 'Magentecho'];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between animate-fade-in transition-colors duration-300">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 md:mb-0">
        <Filter size={20} className="text-blue-600 dark:text-blue-500" />
        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{t('common.filters_global')}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
        <div className="w-full md:w-48">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Calendar size={10} /> {t('common.period')}
          </label>
          <input
            type="month"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            value={filters.monthRange?.[0] || '2023-10'}
            onChange={(e) => setFilters({ ...filters, monthRange: [e.target.value, filters.monthRange?.[1]] })}
          />
        </div>

        <div className="w-full md:w-64">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Building size={10} /> {t('common.company')}
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 appearance-none hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              value={filters.empresa || ''}
              onChange={(e) => setFilters({ ...filters, empresa: e.target.value || null })}
            >
              <option value="">{t('common.all_companies')}</option>
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
