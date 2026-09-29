import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Users, 
    Eye, 
    LayoutGrid, 
    Table as TableIcon, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    CreditCard, 
    ChevronLeft, 
    ChevronRight,
    Globe2,
    ShieldCheck
} from 'lucide-react';
import { fetchClientes } from '../services/queries';
import type { Cliente } from '../services/types';

export const Clientes: React.FC = () => {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = viewMode === 'gallery' ? 24 : 30;

    useEffect(() => {
        fetchClientes().then(data => {
            setClientes(data || []);
            setLoading(false);
        });
    }, []);

    // Unique countries
    const countries = useMemo(() => {
        const set = new Set<string>();
        clientes.forEach(c => {
            if (c.pais && c.pais.trim()) set.add(c.pais.trim());
        });
        return Array.from(set).sort();
    }, [clientes]);

    // KPI metrics
    const stats = useMemo(() => {
        const total = clientes.length;
        const comCif = clientes.filter(c => !!c.cif_dni).length;
        const comContato = clientes.filter(c => !!c.telefono || !!c.email).length;
        const paisesCount = countries.length || 1;
        return { total, comCif, comContato, paisesCount };
    }, [clientes, countries]);

    // Filtering
    const filteredClientes = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return clientes.filter(c => {
            const matchesCountry = selectedCountry === 'all' || (c.pais || 'España') === selectedCountry;
            if (!matchesCountry) return false;

            if (!term) return true;

            const name = (c.nome || '').toLowerCase();
            const legalName = (c.razon_social || '').toLowerCase();
            const cif = (c.cif_dni || '').toLowerCase();
            const code = (c.cod_cliente || '').toLowerCase();
            const idStr = String(c.id);
            const city = (c.municipio || c.provincia || '').toLowerCase();
            const phone = (c.telefono || c.movil || '').toLowerCase();
            const email = (c.email || '').toLowerCase();

            return (
                name.includes(term) ||
                legalName.includes(term) ||
                cif.includes(term) ||
                code.includes(term) ||
                idStr.includes(term) ||
                city.includes(term) ||
                phone.includes(term) ||
                email.includes(term)
            );
        });
    }, [clientes, searchTerm, selectedCountry]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCountry, viewMode]);

    const totalPages = Math.ceil(filteredClientes.length / pageSize) || 1;
    const paginatedClientes = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredClientes.slice(start, start + pageSize);
    }, [filteredClientes, currentPage, pageSize]);

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Carregando perfil dos clientes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-500" />
                        Clientes 360
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Painel central de clientes, faturamento, obras e acompanhamento operacional completo
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewMode('gallery')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'gallery'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title="Visualizar em Galeria de Cartões"
                    >
                        <LayoutGrid size={15} />
                        Galeria
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'table'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title="Visualizar em Tabela Detalhada"
                    >
                        <TableIcon size={15} />
                        Tabela
                    </button>
                </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Clientes</span>
                        <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.total}</div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Cadastrados no sistema</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Com NIF / CIF</span>
                        <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.comCif}</div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Fiscais validados</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Contatos Diretos</span>
                        <Phone size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.comContato}</div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Telefone ou e-mail</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Países de Atuação</span>
                        <Globe2 size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.paisesCount}</div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Espanha, França, etc.</span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, razão social, CIF, ID, cidade, telefone..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {countries.length > 1 && (
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos os Países</option>
                            {countries.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    )}

                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'}
                    </span>
                </div>
            </div>

            {/* View Mode: Gallery (Cards Grid) */}
            {viewMode === 'gallery' ? (
                <div>
                    {paginatedClientes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {paginatedClientes.map((cliente) => {
                                const initials = (cliente.nome || 'CL')
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map(w => w[0])
                                    .join('')
                                    .toUpperCase();

                                return (
                                    <div
                                        key={cliente.id}
                                        onClick={() => navigate(`/operacoes/clientes/${cliente.id}`)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {cliente.nome}
                                                        </h3>
                                                        <p className="text-xs text-slate-400 truncate">
                                                            {cliente.razon_social || cliente.cod_cliente || `#${cliente.id}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shrink-0">
                                                    Ativo
                                                </span>
                                            </div>

                                            {/* Details Pills & Rows */}
                                            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <ShieldCheck size={13} className="text-slate-400" /> NIF/CIF
                                                    </span>
                                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                                        {cliente.cif_dni || 'Não informado'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <MapPin size={13} className="text-slate-400" /> Local
                                                    </span>
                                                    <span className="truncate max-w-[150px] text-right" title={cliente.domicilio || cliente.pais}>
                                                        {cliente.provincia || cliente.municipio || cliente.pais || 'Espanha'}
                                                    </span>
                                                </div>

                                                {cliente.telefono && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 flex items-center gap-1.5">
                                                            <Phone size={13} className="text-slate-400" /> Telefone
                                                        </span>
                                                        <span className="font-mono text-[11px] truncate max-w-[150px]">
                                                            {cliente.telefono}
                                                        </span>
                                                    </div>
                                                )}

                                                {cliente.email && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 flex items-center gap-1.5">
                                                            <Mail size={13} className="text-slate-400" /> E-mail
                                                        </span>
                                                        <span className="truncate max-w-[150px] text-[11px]" title={cliente.email}>
                                                            {cliente.email}
                                                        </span>
                                                    </div>
                                                )}

                                                {cliente.prazo_pagamento && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 flex items-center gap-1.5">
                                                            <CreditCard size={13} className="text-slate-400" /> Cond. Pag.
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                            {cliente.prazo_pagamento}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                #{cliente.id} {cliente.cod_cliente ? `• ${cliente.cod_cliente}` : ''}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/operacoes/clientes/${cliente.id}`);
                                                }}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group-hover:translate-x-0.5 transition-transform"
                                            >
                                                <Eye size={14} /> Ver Raio-X 360
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center text-slate-400">
                            <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Nenhum cliente encontrado</h3>
                            <p className="text-sm mt-1">Tente ajustar os termos de pesquisa ou remover os filtros aplicados.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* View Mode: Table */
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Empresa / Razão Social</th>
                                    <th className="px-4 py-4">Código / ID</th>
                                    <th className="px-4 py-4">CIF / NIF</th>
                                    <th className="px-4 py-4">Localização</th>
                                    <th className="px-4 py-4">Contatos</th>
                                    <th className="px-4 py-4">Prazo</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 dark:text-slate-300 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedClientes.length > 0 ? (
                                    paginatedClientes.map((cliente) => (
                                        <tr 
                                            key={cliente.id} 
                                            onClick={() => navigate(`/operacoes/clientes/${cliente.id}`)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {cliente.nome}
                                                </div>
                                                {cliente.razon_social && cliente.razon_social !== cliente.nome && (
                                                    <div className="text-xs text-slate-400 truncate max-w-xs">{cliente.razon_social}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {cliente.cod_cliente || `#${cliente.id}`}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                                                {cliente.cif_dni || '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                                                {cliente.provincia || cliente.municipio || cliente.pais || 'España'}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs">
                                                <div className="text-slate-700 dark:text-slate-300 truncate max-w-xs">
                                                    {cliente.telefono || cliente.email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {cliente.prazo_pagamento ? (
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        {cliente.prazo_pagamento}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                                    Ativo
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/operacoes/clientes/${cliente.id}`);
                                                    }}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs"
                                                >
                                                    <Eye size={14} /> Ver 360
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-slate-400">
                                            <Users size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p>Nenhum cliente encontrado.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Mostrando página <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> de <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({filteredClientes.length} registros)
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                                            currentPage === pageNum
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
