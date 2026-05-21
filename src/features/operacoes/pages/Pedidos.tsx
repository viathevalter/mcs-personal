import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchPedidos, fetchPedidoDetails } from '../services/queries';
import type { Pedido, PedidoItem, ColaboradorAlocado } from '../services/types';
import { Download, X, Briefcase, User, Calendar } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
export const Pedidos: React.FC = () => {
  const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();
    const [data, setData] = useState<Pedido[]>([]);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

    // Details state
    const [details, setDetails] = useState<{ itens: PedidoItem[], alocados: ColaboradorAlocado[] } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchPedidos(filters).then(setData);
    }, [filters]);

    // Fetch details when a row is clicked
    useEffect(() => {
        if (selectedPedido) {
            setLoadingDetails(true);
            fetchPedidoDetails(selectedPedido.id).then(res => {
                setDetails(res);
                setLoadingDetails(false);
            });
        } else {
            setDetails(null);
        }
    }, [selectedPedido]);

    return (
        <div className="relative space-y-6 animate-fade-in">
            <FilterBar filters={filters} setFilters={setFilters} />

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Pedidos (Execução Comercial)</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Download size={16} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-3 font-medium">Código</th>
                            <th className="px-6 py-3 font-medium">Cliente</th>
                            <th className="px-6 py-3 font-medium">Comercial</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium text-right">Solicitados</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((row) => (
                            <tr
                                key={row.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                onClick={() => setSelectedPedido(row)}
                            >
                                <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{row.CodPedido}</td>
                                <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{row.Cliente}</td>
                                <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{row.Comercial}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.Status === 'Ativo' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                                        row.Status === 'Cancelado' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                        {row.Status}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-slate-700 dark:text-slate-300">{row.TrabalhadoresSolicitados}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Drawer for Pedido Detail */}
            {selectedPedido && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPedido(null)}>
                    <div className="w-[700px] bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto animate-slide-in flex flex-col border-l border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Detalhes do Pedido</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPedido.CodPedido}</p>
                            </div>
                            <button onClick={() => setSelectedPedido(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 flex-1">
                            {/* General Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Cliente</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPedido.Cliente}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Empresa</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPedido.Empresa}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Data Início</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPedido.DataInicio}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Total Solicitado</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 text-lg">{selectedPedido.TrabalhadoresSolicitados}</span>
                                </div>
                            </div>

                            {loadingDetails ? (
                                <div className="text-center py-10 text-slate-500">Carregando itens e alocação...</div>
                            ) : (
                                <>
                                    {/* Itens Pedido (Requested) */}
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                            <Briefcase size={18} className="text-blue-500" />
                                            Itens Solicitados (Por Perfil)
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Perfil (Funcion)</th>
                                                        <th className="px-4 py-2 text-left text-xs uppercase tracking-wide">Ref. Original</th>
                                                        <th className="px-4 py-2 text-right">Qtd</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {details?.itens.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                                                                {item.resolvedName || "Sem Perfil"}
                                                                <span className="text-xs text-slate-400 ml-1">(ID: {item.idFuncionCol})</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-400 dark:text-slate-500 italic text-xs">{item.nombrePerfil}</td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-300">{item.qtdSolicitada}</td>
                                                        </tr>
                                                    ))}
                                                    {(!details?.itens || details.itens.length === 0) && (
                                                        <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400">Nenhum item encontrado.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Allocation List */}
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                            <User size={18} className="text-emerald-500" />
                                            Colaboradores Alocados
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Colaborador</th>
                                                        <th className="px-4 py-2 text-left">Perfil (Funcion)</th>
                                                        <th className="px-4 py-2 text-left">Tipo</th>
                                                        <th className="px-4 py-2 text-right">Início</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {details?.alocados.map((alloc) => (
                                                        <tr key={alloc.id}>
                                                            <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{alloc.nome}</td>
                                                            <td className="px-4 py-2">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                                                    {alloc.funcionNome}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                    {alloc.tipoAlocacao || 'Contratado'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                                                                <Calendar size={12} /> {alloc.dataInicio}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!details?.alocados || details.alocados.length === 0) && (
                                                        <tr><td colSpan={4} className="px-4 py-3 text-center text-slate-400">Nenhum colaborador alocado.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
