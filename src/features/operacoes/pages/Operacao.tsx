import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchOperacao } from '../services/queries';
import { KpiCard } from '../components/KpiCard';
import type { EventoOperacional, KpiData } from '../services/types';
import { AlertTriangle, Repeat, Briefcase, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { useLanguage } from '../i18n';

export const Operacao: React.FC = () => {
  const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();
    const { t } = useLanguage();
    const [data, setData] = useState<{ kpis: KpiData[], eventos: EventoOperacional[] }>({ kpis: [], eventos: [] });
    const [selectedEvento, setSelectedEvento] = useState<EventoOperacional | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'Todos' | 'Reemplazo' | 'Reubicacion'>('Todos');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchOperacao(filters).then(setData);
    }, [filters]);

    const filteredEventos = data.eventos.filter(evento => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return typeFilter === 'Todos' || evento.tipo === typeFilter;

        const matchesSearch = (
            (evento.cliente || '').toLowerCase().includes(term) ||
            (evento.codigo || '').toLowerCase().includes(term) ||
            String(evento.id).includes(term)
        );
        const matchesType = typeFilter === 'Todos' || evento.tipo === typeFilter;
        return matchesSearch && matchesType;
    });

    const sortedEventos = [...filteredEventos].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        let aValue: any;
        let bValue: any;

        if (key === 'codigo') {
            aValue = a.codigo || String(a.id);
            bValue = b.codigo || String(b.id);
        } else if (key === 'cliente') {
            aValue = a.cliente || '';
            bValue = b.cliente || '';
        } else if (key === 'data') {
            aValue = new Date(a.data).getTime();
            bValue = new Date(b.data).getTime();
        } else {
            // Fallback
            aValue = (a as any)[key];
            bValue = (b as any)[key];
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 text-slate-400" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-blue-500" />
            : <ArrowDown size={14} className="ml-1 text-blue-500" />;
    };

    return (
        <div className="relative space-y-6 animate-fade-in">
            <FilterBar filters={filters} setFilters={setFilters} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('operacao.title')}</h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('operacao.filters.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-4 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        {(['Todos', 'Reemplazo', 'Reubicacion'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === type
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.kpis.map((kpi, idx) => (
                    <KpiCard key={idx} {...kpi} />
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors flex flex-col h-[calc(100vh-200px)]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('operacao.table.recent_events', { count: filteredEventos.length })}</h3>
                </div>
                <div className="overflow-auto flex-grow">
                    <table className="w-full text-left text-sm relative">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th
                                    className="px-6 py-3 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none group"
                                    onClick={() => handleSort('codigo')}
                                >
                                    <div className="flex items-center">
                                        {t('operacao.table.operation')}
                                        {getSortIcon('codigo')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none group"
                                    onClick={() => handleSort('cliente')}
                                >
                                    <div className="flex items-center">
                                        {t('operacao.table.client')}
                                        {getSortIcon('cliente')}
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-medium">{t('operacao.table.type')}</th>
                                <th
                                    className="px-6 py-3 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none group"
                                    onClick={() => handleSort('data')}
                                >
                                    <div className="flex items-center">
                                        {t('operacao.table.date')}
                                        {getSortIcon('data')}
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-medium text-right">{t('operacao.table.qty_people')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedEventos.map((row) => (
                                <tr key={`${row.tipo}-${row.id}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedEvento(row)}
                                >
                                    <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">
                                        {row.codigo || row.id}
                                    </td>
                                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 font-medium">{row.cliente}</td>
                                    <td className="px-6 py-3">
                                        <span className={`flex items - center gap - 1.5 font - semibold ${row.tipo === 'Reemplazo' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                                            } `}>
                                            {row.tipo === 'Reemplazo' ? <AlertTriangle size={14} /> : <Repeat size={14} />}
                                            {row.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{row.data ? new Date(row.data).toLocaleDateString('pt-BR') : 'N/A'}</td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium px-2.5 py-0.5 rounded-full text-xs">
                                            {row.colaboradores?.length || 0}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drawer of Details */}
            {selectedEvento && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvento(null)}>
                    <div className="w-[600px] bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto animate-slide-in flex flex-col border-l border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    {selectedEvento.tipo === 'Reemplazo' ? <AlertTriangle className="text-red-500" /> : <Repeat className="text-amber-500" />}
                                    {t('operacao.drawer.details', { type: selectedEvento.tipo })}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">ID: #{selectedEvento.id}</p>
                            </div>
                            <button onClick={() => setSelectedEvento(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                {t('operacao.drawer.close')}
                            </button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-1 block">{t('operacao.drawer.summary_client')}</label>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedEvento.cliente}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-1 block">{t('operacao.drawer.summary_date')}</label>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedEvento.data}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-1 block">{t('operacao.drawer.summary_status')}</label>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedEvento.status}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-slate-500 mb-1 block">{t('operacao.drawer.summary_reason')}</label>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedEvento.motivo}</p>
                                </div>
                            </div>

                            {/* Personnel Movement Table */}
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <Repeat size={18} className="text-blue-500" />
                                    {t('operacao.drawer.movement_title')}
                                </h4>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 text-left">{t('operacao.drawer.collab')}</th>
                                                <th className="px-4 py-2 text-left">{t('operacao.drawer.role')}</th>
                                                <th className="px-4 py-2 text-right">{t('operacao.drawer.movement')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {selectedEvento.colaboradores?.map((c, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2 font-medium">{c.nome}</td>
                                                    <td className="px-4 py-2 text-slate-500">{c.funcao}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <span className={`text - xs px - 2 py - 1 rounded - full font - medium ${c.tipo === 'Saiu' ? 'bg-red-100 text-red-700' :
                                                            c.tipo === 'Entrou' ? 'bg-emerald-100 text-emerald-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            } `}>
                                                            {c.tipo}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!selectedEvento.colaboradores || selectedEvento.colaboradores.length === 0) && (
                                                <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400">{t('operacao.drawer.empty_movement')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Requested Profiles Table */}
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <Briefcase size={18} className="text-purple-500" />
                                    {t('operacao.drawer.profiles_title')}
                                </h4>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 text-left">{t('operacao.drawer.profile')}</th>
                                                <th className="px-4 py-2 text-right">{t('operacao.drawer.qty')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {selectedEvento.itens?.map((item, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2 font-medium">{item.perfil}</td>
                                                    <td className="px-4 py-2 text-right font-bold">{item.qtd}</td>
                                                </tr>
                                            ))}
                                            {(!selectedEvento.itens || selectedEvento.itens.length === 0) && (
                                                <tr><td colSpan={2} className="px-4 py-3 text-center text-slate-400">{t('operacao.drawer.empty_profiles')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
