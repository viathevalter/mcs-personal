import React from 'react';
import { Filter, Calendar, Building, ChevronDown, User, Users, Globe, Tag } from 'lucide-react';
import type { Filters } from '../services/types';
import { useLanguage } from '../i18n';

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  clients?: string[];
  sellers?: string[];
  countries?: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, clients = [], sellers = [], countries = [] }) => {
  const { t } = useLanguage();
  const empresas = ['Stocco', 'Wiseowe', 'Luminous', 'Triangulo', 'Kotrik Rosas', 'KR Industrial', 'Magentecho'];
  
  const statusOptions = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'review', label: 'Em Revisão' },
    { value: 'sent', label: 'Aguardando Assinatura' },
    { value: 'signed', label: 'Contrato Assinado' },
    { value: 'approved', label: 'Aprovada' },
    { value: 'rejected', label: 'Rejeitada' },
    { value: 'expired', label: 'Expirada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between animate-fade-in transition-colors duration-300">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 xl:mb-0">
        <Filter size={20} className="text-blue-600 dark:text-blue-500" />
        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{t('common.filters_global')}</span>
      </div>

      <div className="flex flex-wrap gap-4 w-full xl:w-auto">
        {/* Período */}
        <div className="w-full md:w-36 flex-1 min-w-[130px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Calendar size={10} /> {t('common.period')}
          </label>
          <input
            type="month"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            value={filters.monthRange?.[0] || new Date().toISOString().substring(0, 7)}
            onChange={(e) => setFilters({ ...filters, monthRange: [e.target.value, e.target.value] })}
          />
        </div>

        {/* Empresa */}
        <div className="w-full md:w-48 flex-1 min-w-[150px]">
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

        {/* Cliente */}
        <div className="w-full md:w-48 flex-1 min-w-[155px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Users size={10} /> Cliente
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 appearance-none hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              value={filters.cliente || ''}
              onChange={(e) => setFilters({ ...filters, cliente: e.target.value || null })}
            >
              <option value="">Todos os Clientes</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Vendedor */}
        <div className="w-full md:w-44 flex-1 min-w-[145px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <User size={10} /> Vendedor
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 appearance-none hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              value={filters.comercial || ''}
              onChange={(e) => setFilters({ ...filters, comercial: e.target.value || null })}
            >
              <option value="">Todos os Vendedores</option>
              {sellers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>

        {/* País */}
        <div className="w-full md:w-40 flex-1 min-w-[130px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Globe size={10} /> País
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 appearance-none hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              value={filters.pais || ''}
              onChange={(e) => setFilters({ ...filters, pais: e.target.value || null })}
            >
              <option value="">Todos os Países</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Status */}
        <div className="w-full md:w-44 flex-1 min-w-[145px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Tag size={10} /> Status
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 appearance-none hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || null })}
            >
              <option value="">Todos os Status</option>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
