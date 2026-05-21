import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Filter, ArrowUpDown, ArrowUp, ArrowDown, Eye, CheckSquare, Square, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type SortKey = 'Dt_venc' | 'Valot_total' | 'Saldo_a_pagar' | 'Cliente' | 'Empresa' | 'Status' | 'id';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const ALL_STATUSES = ['Pago', 'Vencido', 'A vencer', 'Parcial', 'Judicial'];

export const Titulos = () => {
    const { filteredData } = useData();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('cliente') || queryParams.get('search') || '';

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });

    // Multi-select Status Filter
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
        setCurrentPage(1);
    };

    const clearStatusFilter = () => {
        setSelectedStatuses([]);
        setIsStatusDropdownOpen(false);
        setCurrentPage(1);
    };

    // 1. Filtragem Local (Busca Texto + Status)
    const localFilteredData = useMemo(() => {
        let data = filteredData;

        // Status Filter
        if (selectedStatuses.length > 0) {
            data = data.filter(item => selectedStatuses.includes(item.Status || 'Desconhecido'));
        }

        // Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(item => {
                const cliente = (item.clienteInfo?.NombreComercial || item.Cliente || '').toLowerCase();
                const doc = (item.Num_doc || '').toLowerCase();
                const empresa = (item.Empresa || '').toLowerCase();
                return cliente.includes(lowerTerm) || doc.includes(lowerTerm) || empresa.includes(lowerTerm);
            });
        }
        return data;
    }, [filteredData, searchTerm, selectedStatuses]);

    // KPIs Calculation
    const kpis = useMemo(() => {
        return localFilteredData.reduce((acc, item) => {
            acc.count += 1;
            acc.totalValue += (item.Valot_total || 0);

            // Sum by status
            switch (item.Status) {
                case 'Pago':
                    acc.pago += (item.Valot_total || 0);
                    break;
                case 'Vencido':
                    acc.vencido += (item.Valot_total || 0);
                    break;
                case 'A vencer':
                    acc.aVencer += (item.Valot_total || 0);
                    break;
                case 'Parcial':
                    acc.parcial += (item.Valot_total || 0);
                    break;
                case 'Judicial':
                    acc.judicial += (item.Valot_total || 0);
                    break;
            }
            return acc;
        }, { count: 0, totalValue: 0, pago: 0, vencido: 0, aVencer: 0, parcial: 0, judicial: 0 });
    }, [localFilteredData]);

    // 2. Ordenação
    const sortedData = useMemo(() => {
        const sorted = [...localFilteredData];
        sorted.sort((a, b) => {
            let aVal: any = '';
            let bVal: any = '';

            switch (sortConfig.key) {
                case 'Cliente':
                    aVal = a.clienteInfo?.NombreComercial || a.Cliente || '';
                    bVal = b.clienteInfo?.NombreComercial || b.Cliente || '';
                    break;
                case 'Dt_venc':
                    aVal = a.Dt_venc ? a.Dt_venc.getTime() : 0;
                    bVal = b.Dt_venc ? b.Dt_venc.getTime() : 0;
                    break;
                case 'Valot_total':
                    aVal = a.Valot_total;
                    bVal = b.Valot_total;
                    break;
                case 'Saldo_a_pagar':
                    aVal = a.Saldo_a_pagar;
                    bVal = b.Saldo_a_pagar;
                    break;
                case 'Empresa':
                    aVal = a.Empresa;
                    bVal = b.Empresa;
                    break;
                case 'Status':
                    aVal = a.Status;
                    bVal = b.Status;
                    break;
                case 'id':
                    // Parse ID to number for correct sorting (10 > 2)
                    aVal = parseInt(a.id, 10) || 0;
                    bVal = parseInt(b.id, 10) || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [localFilteredData, sortConfig]);

    // 3. Paginação
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-300 ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-brand-action ml-1" />
            : <ArrowDown size={14} className="text-brand-action ml-1" />;
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Pago': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Vencido': return 'bg-red-100 text-red-700 border-red-200';
            case 'A vencer': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Parcial': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Judicial': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-4">
            <div className="flex-none space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Títulos</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Visualize e gerencie todos os títulos da carteira.
                    </p>
                </div>

                {/* KPIs Row */}
                {/* KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Quantidade</p>
                        <p className="text-lg font-bold text-gray-900">{kpis.count}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Valor Total</p>
                        <p className="text-lg font-bold text-gray-900 truncate" title={formatCurrency(kpis.totalValue)}>{formatCompactCurrency(kpis.totalValue)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center border-l-4 border-l-emerald-500">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Pago</p>
                        <p className="text-lg font-bold text-emerald-700 truncate" title={formatCurrency(kpis.pago)}>{formatCompactCurrency(kpis.pago)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Vencido</p>
                        <p className="text-lg font-bold text-red-700 truncate" title={formatCurrency(kpis.vencido)}>{formatCompactCurrency(kpis.vencido)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center border-l-4 border-l-blue-500">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">A Vencer</p>
                        <p className="text-lg font-bold text-blue-700 truncate" title={formatCurrency(kpis.aVencer)}>{formatCompactCurrency(kpis.aVencer)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center border-l-4 border-l-orange-500">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Parcial</p>
                        <p className="text-lg font-bold text-orange-700 truncate" title={formatCurrency(kpis.parcial)}>{formatCompactCurrency(kpis.parcial)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center border-l-4 border-l-purple-500">
                        <p className="text-[10px] text-gray-500 font-medium uppercase truncate">Judicial</p>
                        <p className="text-lg font-bold text-purple-700 truncate" title={formatCurrency(kpis.judicial)}>{formatCompactCurrency(kpis.judicial)}</p>
                    </div>
                </div>

                {/* Check Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    {/* Left: Search */}
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente, doc ou empresa..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-action/20 transition-all"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Right: Filters */}
                    <div className="relative">
                        <button
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${selectedStatuses.length > 0
                                ? 'bg-brand-surface border-brand-action text-brand-dark'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Filter size={16} />
                            Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
                        </button>

                        {isStatusDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-2">
                                <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-gray-50">
                                    <span className="text-xs font-semibold text-gray-500">Filtrar Status</span>
                                    {selectedStatuses.length > 0 && (
                                        <button onClick={clearStatusFilter} className="text-xs text-red-500 hover:text-red-600">
                                            Limpar
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {ALL_STATUSES.map(status => (
                                        <button
                                            key={status}
                                            onClick={() => toggleStatus(status)}
                                            className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700"
                                        >
                                            {selectedStatuses.includes(status)
                                                ? <CheckSquare size={16} className="text-brand-action" />
                                                : <Square size={16} className="text-gray-300" />
                                            }
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto w-full">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Cliente')}
                                >
                                    <div className="flex items-center">Cliente {getSortIcon('Cliente')}</div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Empresa')}
                                >
                                    <div className="flex items-center">Empresa {getSortIcon('Empresa')}</div>
                                </th>
                                <th className="px-6 py-4">Período Fat.</th>
                                <th className="px-6 py-4">Doc / Obra</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Dt_venc')}
                                >
                                    <div className="flex items-center">Vencimento {getSortIcon('Dt_venc')}</div>
                                </th>
                                <th
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Valot_total')}
                                >
                                    <div className="flex items-center justify-end">Valor Total {getSortIcon('Valot_total')}</div>
                                </th>
                                <th
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Saldo_a_pagar')}
                                >
                                    <div className="flex items-center justify-end">Saldo {getSortIcon('Saldo_a_pagar')}</div>
                                </th>
                                <th
                                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('Status')}
                                >
                                    <div className="flex items-center justify-center">Status {getSortIcon('Status')}</div>
                                </th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.length > 0 ? paginatedData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 max-w-[200px] truncate" title={item.clienteInfo?.NombreComercial || item.Cliente}>
                                            {item.clienteInfo?.NombreComercial || item.Cliente}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{item.Empresa}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">{item.periodo_fat}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900 font-medium">{item.Num_doc}</div>
                                        <div className="text-xs text-gray-400 truncate max-w-[120px]">{item.Obra}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {formatDate(item.Dt_venc)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {formatCurrency(item.Valot_total)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {formatCurrency(item.Saldo_a_pagar)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusClass(item.Status)}`}>
                                            {item.Status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link
                                            to={`/financeiro/titulos/${item.id}`}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-action hover:bg-green-50 transition-all"
                                            title="Ver detalhes"
                                        >
                                            <Eye size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Filter size={32} className="opacity-20" />
                                            <p>Nenhum título encontrado com os filtros atuais.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-none flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando <span className="font-medium">{paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> até <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> de <span className="font-medium">{sortedData.length}</span> resultados
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Simple Page Indicator */}
                        <div className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                            Página {currentPage} de {totalPages || 1}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
