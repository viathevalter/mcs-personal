import React from 'react';
import { Calendar, Filter, Bell } from 'lucide-react';
import { useData } from '../context/DataContext';
import { MultiSelect } from './MultiSelect';

export const Navbar = () => {
    const { filters, setFilters, availableEmpresas, availablePeriodos } = useData();

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const dateVal = value ? new Date(value) : null;
        setFilters(prev => {
            const newPeriod = [...prev.periodo] as [Date | null, Date | null];
            if (type === 'start') newPeriod[0] = dateVal;
            if (type === 'end') newPeriod[1] = dateVal;
            return { ...prev, periodo: newPeriod };
        });
    };

    // Helper to format Date object to YYYY-MM-DD for input value
    const formatDateInput = (date: Date | null) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    const periodoOptions = availablePeriodos.map(p => ({ value: p, label: p }));

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-brand-dark hidden md:block">
                    Diretoria
                </h1>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end">
                {/* Periodo Fat Filter */}
                <div className="w-48">
                    <MultiSelect
                        options={periodoOptions}
                        selected={filters.periodoFat || []}
                        onChange={(selected) => setFilters(prev => ({ ...prev, periodoFat: selected }))}
                        placeholder="Período Fat."
                    />
                </div>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Calendar size={14} className="text-gray-400" />
                    <input
                        type="date"
                        className="bg-transparent text-sm text-gray-600 outline-none w-28 md:w-auto"
                        value={formatDateInput(filters.periodo[0])}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                    />
                    <span className="text-gray-400 text-xs">até</span>
                    <input
                        type="date"
                        className="bg-transparent text-sm text-gray-600 outline-none w-28 md:w-auto"
                        value={formatDateInput(filters.periodo[1])}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                    />
                </div>

                {/* Company Filter */}
                <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        className="bg-transparent text-sm text-gray-700 font-medium outline-none cursor-pointer"
                        value={filters.empresa.length === 1 ? filters.empresa[0] : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFilters(prev => ({ ...prev, empresa: val ? [val] : [] }));
                        }}
                    >
                        <option value="">Todas Empresas</option>
                        {availableEmpresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>

                <div className="flex items-center gap-3">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-state-critical rounded-full"></span>
                    </button>
                    <div className="w-8 h-8 bg-brand-dark rounded-full flex items-center justify-center text-white text-xs font-bold">
                        DIR
                    </div>
                </div>
            </div>
        </header>
    );
};
