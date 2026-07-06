import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { fetchPedidos, fetchPedidoDetails } from '../services/queries';
import type { Pedido, PedidoItem, ColaboradorAlocado } from '../services/types';
import { Download, X, Briefcase, User, Calendar, AlertTriangle, List, CalendarDays, Clock, ShieldAlert, Phone, Mail } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';

export const Pedidos: React.FC = () => {
    const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();
    const [data, setData] = useState<Pedido[]>([]);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const navigate = useNavigate();

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

    // Calculate deadline states for KPIs and table rows
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const activePedidos = data.filter(p => p.Status === 'Ativo');

    const endingSoonCount = activePedidos.filter(p => {
        if (!p.DataFim) return false;
        const endDate = new Date(p.DataFim);
        return endDate >= now && endDate <= thirtyDaysFromNow;
    }).length;

    const overdueCount = activePedidos.filter(p => {
        if (!p.DataFim) return false;
        const endDate = new Date(p.DataFim);
        return endDate < now;
    }).length;

    const formatPortugueseDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('pt-PT');
        } catch {
            return dateStr;
        }
    };

    const getDaysRemainingStr = (dateFim?: string, status?: string) => {
        if (!dateFim) {
            return {
                text: 'Sem Fim Definido',
                color: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
            };
        }
        
        const endDate = new Date(dateFim);
        endDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return {
                text: status === 'Ativo' ? `Atrasado há ${Math.abs(diffDays)} dia(s)` : `Finalizado há ${Math.abs(diffDays)} dia(s)`,
                color: status === 'Ativo' 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            };
        } else if (diffDays === 0) {
            return {
                text: 'Termina hoje',
                color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold animate-pulse'
            };
        } else if (diffDays <= 15) {
            return {
                text: `Faltam ${diffDays} dias (Crítico)`,
                color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-bold'
            };
        } else if (diffDays <= 30) {
            return {
                text: `Faltam ${diffDays} dias`,
                color: 'bg-amber-500/10 text-amber-650 dark:text-amber-450 border border-amber-500/20'
            };
        } else {
            return {
                text: `Faltam ${diffDays} dias`,
                color: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20'
            };
        }
    };

    return (
        <div className="relative space-y-6 animate-fade-in flex flex-col h-full overflow-y-auto">
            <FilterBar filters={filters} setFilters={setFilters} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block font-semibold">Obras Ativas</span>
                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                            {activePedidos.length}
                        </span>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/45 text-blue-500 rounded-lg">
                        <Briefcase size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block font-semibold">Finalizando (30 dias)</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1 block">
                            {endingSoonCount}
                        </span>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/45 text-amber-500 rounded-lg">
                        <CalendarDays size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block font-semibold">Prazo Excedido</span>
                        <span className="text-2xl font-bold text-rose-600 mt-1 block">
                            {overdueCount}
                        </span>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/45 text-rose-500 rounded-lg">
                        <AlertTriangle size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block font-semibold">Total de Pedidos</span>
                        <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                            {data.length}
                        </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg">
                        <List size={20} />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100 transition-colors">Pedidos (Execução Comercial)</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <Download size={16} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors flex-1 min-h-0">
                <div className="overflow-auto h-full">
                    <table className="w-full text-left text-sm relative">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-medium">Código</th>
                                <th className="px-6 py-4 font-medium">Cliente</th>
                                <th className="px-6 py-4 font-medium">Comercial</th>
                                <th className="px-6 py-4 font-medium">Início</th>
                                <th className="px-6 py-4 font-medium">Fim Programado</th>
                                <th className="px-6 py-4 font-medium">Status do Prazo</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Solicitados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((row) => {
                                const deadlineStatus = getDaysRemainingStr(row.DataFim, row.Status);

                                return (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                                        onClick={() => setSelectedPedido(row)}
                                    >
                                        <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{row.CodPedido}</td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{row.Cliente}</td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400">{row.Comercial}</td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400">{formatPortugueseDate(row.DataInicio)}</td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-mono text-xs">{formatPortugueseDate(row.DataFim)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${deadlineStatus.color}`}>
                                                {deadlineStatus.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${row.Status === 'Ativo' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' :
                                                row.Status === 'Cancelado' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450 border border-rose-200 dark:border-rose-900/50' :
                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450'
                                                }`}>
                                                {row.Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">{row.TrabalhadoresSolicitados}</td>
                                    </tr>
                                );
                            })}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-medium">Nenhum pedido cadastrado ou retornado nos filtros.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drawer for Pedido Detail */}
            {selectedPedido && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/55 backdrop-blur-xs" onClick={() => setSelectedPedido(null)}>
                    <div className="w-[700px] bg-white dark:bg-slate-900 h-full shadow-2xl overflow-hidden animate-slide-in flex flex-col border-l border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Detalhes do Pedido (Obra)</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPedido.CodPedido}</p>
                            </div>
                            <button onClick={() => setSelectedPedido(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Body content */}
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            
                            {/* Deadline Alerts */}
                            {selectedPedido.DataFim && selectedPedido.Status === 'Ativo' && (
                                (() => {
                                    const endDate = new Date(selectedPedido.DataFim);
                                    const isEnding = endDate >= now && endDate <= thirtyDaysFromNow;
                                    const isPast = endDate < now;

                                    if (isEnding || isPast) {
                                        return (
                                            <div className={`p-4 rounded-xl border flex items-start space-x-3 animate-fade-in ${
                                                isPast 
                                                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400 dark:bg-rose-950/20' 
                                                    : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400 dark:bg-amber-950/20'
                                            }`}>
                                                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-450" />
                                                <div className="text-sm space-y-1">
                                                    <span className="font-bold block text-slate-950 dark:text-white">
                                                        {isPast ? '⚠️ Prazo da Obra Excedido!' : '⚠️ Obra Finalizando em Breve'}
                                                    </span>
                                                    <p className="text-slate-650 dark:text-slate-300">
                                                        {isPast 
                                                            ? `Esta obra ultrapassou a data final programada de ${endDate.toLocaleDateString('pt-PT')}. Certifique-se de prorrogar o prazo da obra ou efetuar a baixa operacional (Finalização de Obra) para cessar todos os custos e recursos ativos.`
                                                            : `Esta obra está programada para finalizar em ${endDate.toLocaleDateString('pt-PT')}. Se necessário, planeje a Prorrogação de Obra ou inicie os trâmites de Finalização de Obra para desmobilização.`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}

                            {/* General Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Cliente</span>
                                    <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedPedido.Cliente}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Contato do Cliente</span>
                                    <div className="space-y-1.5 pt-1">
                                        {selectedPedido.ClienteEmail ? (
                                            <a 
                                                href={`mailto:${selectedPedido.ClienteEmail}`} 
                                                className="flex items-center text-xs text-blue-650 hover:underline gap-1 font-medium truncate"
                                                title={selectedPedido.ClienteEmail}
                                            >
                                                <Mail size={12} className="shrink-0" /> {selectedPedido.ClienteEmail}
                                            </a>
                                        ) : null}
                                        {selectedPedido.ClientePhone ? (
                                            <a 
                                                href={`tel:${selectedPedido.ClientePhone}`} 
                                                className="flex items-center text-xs text-blue-650 hover:underline gap-1 font-medium"
                                            >
                                                <Phone size={12} className="shrink-0" /> {selectedPedido.ClientePhone}
                                            </a>
                                        ) : null}
                                        {!selectedPedido.ClienteEmail && !selectedPedido.ClientePhone && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500">Sem contato cadastrado</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Status do Prazo</span>
                                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getDaysRemainingStr(selectedPedido.DataFim, selectedPedido.Status).color}`}>
                                        {getDaysRemainingStr(selectedPedido.DataFim, selectedPedido.Status).text}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Data Início</span>
                                    <span className="font-semibold text-slate-850 dark:text-slate-200">{formatPortugueseDate(selectedPedido.DataInicio)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Fim Programado</span>
                                    <span className="font-semibold text-slate-850 dark:text-slate-200">{formatPortugueseDate(selectedPedido.DataFim)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Total Solicitado</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{selectedPedido.TrabalhadoresSolicitados}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 col-span-2 md:col-span-3">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase block mb-1">Comercial Responsável</span>
                                    <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedPedido.Comercial}</span>
                                </div>
                            </div>

                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-450 space-y-2">
                                    <Clock className="w-8 h-8 animate-spin text-slate-400" />
                                    <span>Carregando itens e alocações...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Itens Pedido (Requested) */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                                            <Briefcase size={16} className="text-blue-500" />
                                            Itens Solicitados (Por Perfil)
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left font-medium">Perfil</th>
                                                        <th className="px-4 py-2.5 text-left font-medium text-xs">Ref. Original</th>
                                                        <th className="px-4 py-2.5 text-right font-medium">Qtd</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {details?.itens.map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                                                {item.resolvedName || "Sem Perfil"}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500 italic text-xs">{item.nombrePerfil}</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">{item.qtdSolicitada}</td>
                                                        </tr>
                                                    ))}
                                                    {(!details?.itens || details.itens.length === 0) && (
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-4 text-center text-slate-400 font-medium">Nenhum item cadastrado.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Allocation List */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                                            <User size={16} className="text-emerald-500" />
                                            Colaboradores Alocados
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                                                        <th className="px-4 py-2.5 text-left font-medium">Função</th>
                                                        <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                                                        <th className="px-4 py-2.5 text-right font-medium">Alocado Desde</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {details?.alocados.map((alloc) => (
                                                        <tr key={alloc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{alloc.nome}</td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                                                                    {alloc.funcionNome}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-150 dark:bg-slate-800 text-slate-650 dark:text-slate-350">
                                                                    {alloc.tipoAlocacao || 'Contratado'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400 font-medium">
                                                                {formatPortugueseDate(alloc.dataInicio)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!details?.alocados || details.alocados.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-4 text-center text-slate-400 font-medium">Nenhum colaborador alocado nesta obra.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions Footer */}
                        {selectedPedido.Status === 'Ativo' ? (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end space-x-3 shrink-0">
                                <button 
                                    onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=order_extension&pedido_id=${selectedPedido.id}`)}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer animate-fade-in"
                                >
                                    <CalendarDays size={14} /> Prorrogar Obra
                                </button>
                                <button 
                                    onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=order_termination&pedido_id=${selectedPedido.id}`)}
                                    className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer animate-fade-in"
                                >
                                    <ShieldAlert size={14} /> Finalizar Obra
                                </button>
                            </div>
                        ) : (selectedPedido.Status !== 'Cancelado' && selectedPedido.Status !== 'Concluído') ? (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end space-x-3 shrink-0">
                                <button 
                                    onClick={() => navigate(`/operacoes/solicitudes/nova?tipo=order_postponement&pedido_id=${selectedPedido.id}`)}
                                    className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer animate-fade-in"
                                >
                                    <CalendarDays size={14} /> Adiar Início da Obra
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};
