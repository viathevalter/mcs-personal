import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { 
    ChevronLeft, Calendar, DollarSign, FileText, CheckCircle, XCircle, 
    AlertCircle, RefreshCw, Send, ArrowRight, Link2, Users, Bed, Home, 
    UserCheck, AlertTriangle, CheckCircle2, Wallet, Landmark, Download, 
    Upload, Edit3, Clock, ArrowUpRight, Copy, Check, CreditCard, Zap, Calculator, Plus, Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
    fetchOrdemPagamentoDetails, 
    updateOrdemPagamentoStatus, 
    liquidarOrdemPagamento, 
    updateOrdemPagamentoDados, 
    uploadComprovanteFinanceiro, 
    fetchBancos 
} from '../data/loader';
import { financeLogisticsService, type OcupanteInfo } from '@/features/logistica/services/financeLogisticsService';
import { suministrosLogisticsService, type SuministroFatura, type RateioMoradorItem } from '@/features/logistica/services/suministrosLogisticsService';
import { toast } from 'sonner';
import * as Tooltip from '@radix-ui/react-tooltip';

const getStatusClass = (status: string) => {
    switch (status) {
        case 'pago': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200';
        case 'correcao_solicitada': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300';
        case 'rejeitado':
        case 'cancelado': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200';
        case 'aguardando_aprovacao': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200';
        case 'aprovado': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200';
        case 'rascunho': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const getStatusLabel = (status: string) => {
    switch(status) {
        case 'rascunho': return 'Rascunho';
        case 'aguardando_aprovacao': return 'Aguardando Aprovação';
        case 'correcao_solicitada': return 'Correção Solicitada';
        case 'aprovado': return 'Aprovado';
        case 'pago': return 'Pago';
        case 'rejeitado': return 'Rejeitado';
        case 'cancelado': return 'Cancelado';
        default: return status;
    }
};

export const TitleDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Dialog states
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isLiquidateOpen, setIsLiquidateOpen] = useState(false);
    const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);

    // Form states
    const [actionComments, setActionComments] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');
    
    // Liquidation form states
    const [bancoId, setBancoId] = useState('');
    const [formaPagamento, setFormaPagamento] = useState('Transferência Bancária');
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [comprovanteUrl, setComprovanteUrl] = useState('');
    const [liquidationComments, setLiquidationComments] = useState('');
    const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);

    // Order Edit form states
    const [editDescricao, setEditDescricao] = useState('');
    const [editObservacoes, setEditObservacoes] = useState('');
    const [editAnexos, setEditAnexos] = useState('');

    const { data: title, isLoading, error } = useQuery({
        queryKey: ['ordens_pagamento', id],
        queryFn: async () => {
            if (!id) return null;
            return fetchOrdemPagamentoDetails(id);
        },
        enabled: !!id
    });

    const { data: bancos = [] } = useQuery({
        queryKey: ['bancos_list'],
        queryFn: () => fetchBancos()
    });

    useEffect(() => {
        if (title) {
            setEditDescricao(title.descricao || '');
            setEditObservacoes(title.observaciones || '');
            setEditAnexos(title.anexos || '');
            if (title.banco_id) setBancoId(title.banco_id);
            if (title.forma_pagamento) setFormaPagamento(title.forma_pagamento);
            if (title.comprovante_geral) setComprovanteUrl(title.comprovante_geral);
        }
    }, [title]);

    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`${fieldName} copiado para a área de transferência!`);
        setTimeout(() => {
            setCopiedField(null);
        }, 2500);
    };

    const extractBankDetails = () => {
        const text = title?.observaciones || '';
        
        // Extract IBAN
        const ibanMatch = text.match(/(?:IBAN:?\s*)?([A-Z]{2}[0-9]{2}(?:[\s\-]?[0-9]{4}){4,6}(?:[\s\-]?[0-9]{1,4})?)/i);
        const iban = ibanMatch ? ibanMatch[1].replace(/[\t\r\n]+/g, ' ').trim() : null;

        // Extract Banco
        const bancoMatch = text.match(/(?:BANCO:?\s*|BANCO\s+)([A-Z0-9\s\.\-]{2,30}?)(?=\s+IBAN|\s+TITULAR|\n|$)/i);
        const banco = bancoMatch ? bancoMatch[1].trim() : null;

        // Extract Titular / Favorecido
        const titularMatch = text.match(/(?:TITULAR:?\s*)([^\n\r]+)/i);
        let titular = titularMatch ? titularMatch[1].trim() : null;
        if (!titular) {
            if (title?.cod_provedor && title.cod_provedor !== 'Identificado nos itens') {
                titular = title.cod_provedor;
            } else if (title?.departamento_origem && !['Logística', 'Financeiro', 'Geral'].includes(title.departamento_origem)) {
                titular = title.departamento_origem;
            } else if (title?.itens?.[0]?.cod_provedor) {
                titular = title.itens[0].cod_provedor;
            } else {
                titular = title?.cod_provedor || 'Fornecedor da Ordem';
            }
        }

        return { iban, banco, titular, rawObs: text };
    };

    const handleCopyAll = (details: { iban: string | null; titular: string; banco: string | null }) => {
        if (!title) return;
        const summary = [
            `Favorecido: ${details.titular}`,
            details.iban ? `IBAN: ${details.iban}` : null,
            details.banco ? `Banco: ${details.banco}` : null,
            `Valor: ${formatCurrency(title.valor)}`,
            `Referência: ${title.cod_orden_pago || title.descricao}`
        ].filter(Boolean).join('\n');

        handleCopy(summary, 'todos');
    };

    const isLodgingOrder = Boolean(
        title?.departamento_origem?.toLowerCase().includes('log') ||
        title?.cod_alojamiento ||
        title?.descricao?.toLowerCase().includes('aluguel') ||
        title?.descricao?.toLowerCase().includes('alquiler') ||
        title?.descricao?.toLowerCase().includes('alojamiento') ||
        title?.descricao?.toLowerCase().includes('suministro') ||
        title?.descricao?.toLowerCase().includes('fianza') ||
        /\bAL-\d+\b/i.test(`${title?.descricao || ''} ${title?.observaciones || ''}`)
    );

    const { data: ocupantes = [], isLoading: isLoadingOcupantes } = useQuery({
        queryKey: ['ocupantes_alojamento_ordem', title?.cod_alojamiento, title?.descricao, title?.observaciones],
        queryFn: () => financeLogisticsService.fetchOcupantesAlojamento(
            title?.cod_alojamiento || undefined,
            title?.descricao,
            title?.observaciones
        ),
        enabled: !!title && isLodgingOrder
    });

    const { data: alojamentoDetalhes = null } = useQuery({
        queryKey: ['alojamento_detalhes_ordem', title?.cod_alojamiento, title?.descricao, title?.observaciones],
        queryFn: () => financeLogisticsService.fetchAlojamentoDetalhes(
            title?.cod_alojamiento || undefined,
            title?.descricao,
            title?.observaciones
        ),
        enabled: !!title && isLodgingOrder
    });

    const [selectedClienteOcupanteFilter, setSelectedClienteOcupanteFilter] = useState<string>('TODOS');

    const clientesAlojamento = React.useMemo(() => {
        return Array.from(new Set(ocupantes.map(o => o.cliente_nome).filter(Boolean))) as string[];
    }, [ocupantes]);

    const ocupantesFiltrados = React.useMemo(() => {
        if (selectedClienteOcupanteFilter === 'TODOS') return ocupantes;
        return ocupantes.filter(o => o.cliente_nome === selectedClienteOcupanteFilter);
    }, [ocupantes, selectedClienteOcupanteFilter]);

    // Faturas de Suministros vinculadas a esta Ordem de Pagamento (Ponte Logística <-> Financeiro <-> Folha)
    const { data: faturasSuministros = [], refetch: refetchSuministros } = useQuery({
        queryKey: ['suministros_ordem_pagamento', id],
        queryFn: () => id ? suministrosLogisticsService.fetchFaturasByOrdemPagamento(id, title?.cod_alojamiento) : Promise.resolve([]),
        enabled: !!id
    });

    const [activeSuministroEdit, setActiveSuministroEdit] = useState<Record<string, {
        limiteAceitavel: number;
        valorExcedente: number;
        competenciaDesconto: string;
        rateio: RateioMoradorItem[];
    }>>({});
    const [isLaunchingDiscounts, setIsLaunchingDiscounts] = useState<string | null>(null);

    useEffect(() => {
        if (faturasSuministros.length > 0) {
            const nextState: Record<string, any> = {};
            const defaultComp = new Date().toISOString().slice(0, 7);
            faturasSuministros.forEach((f) => {
                nextState[f.id] = {
                    limiteAceitavel: Number(f.limite_aceitavel_periodo || 0),
                    valorExcedente: Number(f.valor_excedente || 0),
                    competenciaDesconto: f.competencia_desconto || defaultComp,
                    rateio: Array.isArray(f.rateio_detalhes) ? [...f.rateio_detalhes] : []
                };
            });
            setActiveSuministroEdit(nextState);
        }
    }, [faturasSuministros]);

    const handleRecalcRateioFinanceiro = (fatura: SuministroFatura, novoLimite: number) => {
        const current = activeSuministroEdit[fatura.id];
        if (!current) return;
        const novoExc = Math.max(0, Number((Number(fatura.valor_fatura || 0) - novoLimite).toFixed(2)));
        const novoRateio = suministrosLogisticsService.recalcularDistribuicaoProRata(current.rateio, novoExc);
        setActiveSuministroEdit(prev => ({
            ...prev,
            [fatura.id]: {
                ...current,
                limiteAceitavel: novoLimite,
                valorExcedente: novoExc,
                rateio: novoRateio
            }
        }));
    };

    const handleUpdateMoradorRateioFinanceiro = (faturaId: string, idx: number, field: keyof RateioMoradorItem, value: any) => {
        setActiveSuministroEdit(prev => {
            const current = prev[faturaId];
            if (!current) return prev;
            const list = [...current.rateio];
            list[idx] = { ...list[idx], [field]: value };
            const finalRateio = (field === 'dias_alojado' || field === 'isento')
                ? suministrosLogisticsService.recalcularDistribuicaoProRata(list, current.valorExcedente)
                : list;
            return {
                ...prev,
                [faturaId]: {
                    ...current,
                    rateio: finalRateio
                }
            };
        });
    };

    const handleLancarDescontosFolhaFinanceiro = async (fatura: SuministroFatura) => {
        const state = activeSuministroEdit[fatura.id];
        if (!state) return;
        setIsLaunchingDiscounts(fatura.id);
        try {
            const res = await suministrosLogisticsService.lancarDescontosExcedenteFolha({
                faturaId: fatura.id,
                competenciaDesconto: state.competenciaDesconto,
                limiteAceitavelPeriodo: state.limiteAceitavel,
                valorExcedente: state.valorExcedente,
                rateioDetalhes: state.rateio
            });
            toast.success(`${res.lancadosCount} desconto(s) lançado(s)/atualizado(s) na folha (Categoria SUMINISTROS - Total: ${formatCurrency(res.totalDescontado)})!`);
            await refetchSuministros();
        } catch (err: any) {
            toast.error(`Erro ao lançar descontos na folha: ${err.message}`);
        } finally {
            setIsLaunchingDiscounts(null);
        }
    };

    const _unusedGuard = ({
        enabled: !!title && isLodgingOrder
    });

    const actionMutation = useMutation({
        mutationFn: async ({ status, comments }: { status: any; comments: string }) => {
            if (!id || !user) return;
            return updateOrdemPagamentoStatus(id, status, comments, user.id);
        },
        onSuccess: (res: any) => {
            if (res?.success === false) {
                toast.error(`Falha na ação: ${res.error?.message || 'Erro desconhecido'}`);
                return;
            }
            toast.success("Ordem de pagamento atualizada!");
            setIsRejectOpen(false);
            setIsCorrectionOpen(false);
            setIsApproveOpen(false);
            setActionComments('');
            setCorrectionReason('');
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento', id] });
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
        },
        onError: (err: any) => {
            toast.error(`Erro ao atualizar ordem: ${err.message}`);
        }
    });

    const liquidateMutation = useMutation({
        mutationFn: async () => {
            if (!id) return;
            const selectedBanco = bancos.find(b => b.id === bancoId);
            return liquidarOrdemPagamento({
                id,
                bancoId: bancoId || undefined,
                bancoNome: selectedBanco?.nome_banco || undefined,
                formaPagamento,
                dataPagamento,
                comprovanteUrl: comprovanteUrl || undefined,
                observacoes: liquidationComments || undefined
            });
        },
        onSuccess: (res: any) => {
            if (res?.success === false) {
                toast.error(`Falha ao liquidar: ${res.error?.message || 'Erro desconhecido'}`);
                return;
            }
            toast.success("Ordem de pagamento liquidada com comprovante!");
            setIsLiquidateOpen(false);
            setIsApproveOpen(false);
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento', id] });
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
        },
        onError: (err: any) => {
            toast.error(`Erro ao liquidar pagamento: ${err.message}`);
        }
    });

    const editMutation = useMutation({
        mutationFn: async ({ reenviar }: { reenviar: boolean }) => {
            if (!id) return;
            return updateOrdemPagamentoDados(
                id,
                {
                    descricao: editDescricao,
                    observacoes: editObservacoes,
                    anexos: editAnexos
                },
                reenviar
            );
        },
        onSuccess: (res: any, variables) => {
            if (res?.success === false) {
                toast.error(`Falha ao salvar: ${res.error?.message || 'Erro desconhecido'}`);
                return;
            }
            toast.success(variables.reenviar ? "Ordem corrigida e reenviada para aprovação!" : "Alterações salvas com sucesso!");
            setIsEditOrderOpen(false);
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento', id] });
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
        },
        onError: (err: any) => {
            toast.error(`Erro ao salvar dados: ${err.message}`);
        }
    });

    const handleComprovanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingComprovante(true);
        try {
            const res = await uploadComprovanteFinanceiro(file);
            if (res.error) throw res.error;
            if (res.url) {
                setComprovanteUrl(res.url);
                toast.success("Comprovante enviado com sucesso!");
            }
        } catch (err: any) {
            toast.error(`Erro no upload: ${err.message || 'Falha ao enviar arquivo'}`);
        } finally {
            setIsUploadingComprovante(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando detalhes...</div>;
    if (error || !title) return <div className="p-8 text-center text-slate-500">Ordem de pagamento não encontrada.</div>;

    const isMaker = user?.id === title.criador_id;
    const canApprove = title.status === 'aguardando_aprovacao';
    const isNeedsCorrection = title.status === 'correcao_solicitada';
    const canSubmit = title.status === 'rascunho' || title.status === 'rejeitado' || isNeedsCorrection;
    const isApproved = title.status === 'aprovado';
    const isPaid = title.status === 'pago';
    const bankDetails = extractBankDetails();

    return (
        <Tooltip.Provider delayDuration={200}>
            <div className="h-full overflow-y-auto p-2 md:p-6 pt-0 md:pt-0 space-y-6 w-full bg-transparent">
                <div className="space-y-6">
                    <Link to="/financeiro/titulos" className="flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-4 w-fit text-sm font-semibold">
                        <ChevronLeft size={16} className="mr-1" /> Voltar para Ordens de Pagamento
                    </Link>

                    {/* Banner de Aviso: Correção Solicitada */}
                    {isNeedsCorrection && (
                        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
                            <div className="flex items-start gap-3.5">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-2xl flex-shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-amber-900 dark:text-amber-200">
                                        Correção Solicitada pelo Financeiro
                                    </h4>
                                    <p className="text-sm text-amber-800 dark:text-amber-300/90 mt-1 font-medium leading-relaxed">
                                        {title.motivo_correcao || title.observaciones_financeiro || 'Por favor, revise os dados, valores ou anexos da fatura e reenvie para aprovação.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 w-full md:w-auto">
                                <Button 
                                    onClick={() => setIsEditOrderOpen(true)}
                                    variant="outline"
                                    className="flex-1 md:flex-initial rounded-xl border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold"
                                >
                                    <Edit3 size={16} className="mr-1.5" /> Editar Ordem
                                </Button>
                                <Button 
                                    onClick={() => actionMutation.mutate({ 
                                        status: 'aguardando_aprovacao', 
                                        comments: 'Ordem revisada e reenviada para aprovação pelo solicitante.' 
                                    })}
                                    disabled={actionMutation.isPending}
                                    className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/10"
                                >
                                    <Send size={16} className="mr-1.5" /> Reenviar para Aprovação
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Layout em Duas Colunas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Coluna da Esquerda (Cabeçalho, Itens, Ocupantes, Anexos) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Card de Cabeçalho */}
                            <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 p-6 md:p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                {title.cod_orden_pago || 'Pendente'}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(title.status)}`}>
                                                {getStatusLabel(title.status)}
                                            </span>
                                            {title.departamento_origem && (
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                                                    {title.departamento_origem}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-3">{title.descricao}</h2>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Total da Ordem</p>
                                        <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
                                            {formatCurrency(title.valor)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 text-sm">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(title.data_vencimento)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Criado Em</span>
                                        <span className="font-semibold text-slate-600 dark:text-slate-400">{formatDate(title.created_at)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Solicitante</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-xs" title={title.criador_email || ''}>
                                            {title.criador_email || 'Não informado'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            Setor: {title.departamento_origem || 'Geral'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Qtd Itens</span>
                                        <span className="font-bold text-slate-850 dark:text-slate-300">{title.itens?.length || title.qtde_itens || 0}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fornecedor</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                            {title.cod_provedor || 'Identificado nos itens'}
                                        </span>
                                    </div>
                                </div>

                                 {/* Card de Dados Bancários para Pagamento com Cópia Rápida em 1 Clique */}
                                 <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                     <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border-2 border-blue-200/90 dark:border-blue-800/60 shadow-xs space-y-4">
                                         <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-100 dark:border-blue-900/40">
                                             <div className="flex items-center gap-2.5">
                                                 <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                                                     <CreditCard size={18} />
                                                 </div>
                                                 <div>
                                                     <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                                                         Dados para Transferência Bancária
                                                     </h3>
                                                     <p className="text-xs text-slate-500">
                                                         Copie com 1 clique para colar diretamente no seu aplicativo ou Internet Banking
                                                     </p>
                                                 </div>
                                             </div>
                                             
                                             <Button
                                                 type="button"
                                                 size="sm"
                                                 variant="outline"
                                                 onClick={() => handleCopyAll(bankDetails)}
                                                 className="rounded-xl border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 text-xs font-bold gap-1.5 shadow-2xs"
                                             >
                                                 {copiedField === 'todos' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                 {copiedField === 'todos' ? 'Todos Copiados!' : 'Copiar Todos os Dados'}
                                             </Button>
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                             {/* Campo IBAN */}
                                             <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
                                                 <div>
                                                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                         IBAN / Conta de Destino
                                                     </span>
                                                     <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 select-all block break-all">
                                                         {bankDetails.iban || 'IBAN não identificado'}
                                                     </span>
                                                 </div>
                                                 {bankDetails.iban ? (
                                                     <Button
                                                         type="button"
                                                         size="sm"
                                                         onClick={() => handleCopy(bankDetails.iban!, 'IBAN')}
                                                         className={`mt-3 w-full rounded-xl text-xs font-bold gap-1.5 transition-all ${
                                                             copiedField === 'IBAN' 
                                                                 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                                                 : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                                         }`}
                                                     >
                                                         {copiedField === 'IBAN' ? <Check size={14} /> : <Copy size={14} />}
                                                         {copiedField === 'IBAN' ? 'IBAN Copiado!' : 'Copiar IBAN'}
                                                     </Button>
                                                 ) : (
                                                     <span className="text-[11px] text-slate-400 italic mt-2">Sem IBAN nas notas</span>
                                                 )}
                                             </div>

                                             {/* Campo Favorecido / Titular */}
                                             <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
                                                 <div>
                                                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                         Favorecido / Titular
                                                     </span>
                                                     <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate block" title={bankDetails.titular}>
                                                         {bankDetails.titular}
                                                     </span>
                                                     {bankDetails.banco && (
                                                         <span className="text-[11px] text-slate-500 block mt-1">
                                                             Banco: <strong className="text-slate-700 dark:text-slate-300">{bankDetails.banco}</strong>
                                                         </span>
                                                     )}
                                                 </div>
                                                 <Button
                                                     type="button"
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => handleCopy(bankDetails.titular, 'Favorecido')}
                                                     className={`mt-3 w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-800 transition-all ${
                                                         copiedField === 'Favorecido' 
                                                             ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                                             : 'hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                                                     }`}
                                                 >
                                                     {copiedField === 'Favorecido' ? <Check size={14} /> : <Copy size={14} />}
                                                     {copiedField === 'Favorecido' ? 'Nome Copiado!' : 'Copiar Nome Favorecido'}
                                                 </Button>
                                             </div>

                                             {/* Campo Valor a Transferir */}
                                             <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
                                                 <div>
                                                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                         Valor a Pagar
                                                     </span>
                                                     <span className="text-lg font-black text-slate-900 dark:text-slate-100 block">
                                                         {formatCurrency(title.valor)}
                                                     </span>
                                                     <span className="text-[10px] text-slate-400 font-mono">
                                                         Numérico: {Number(title.valor).toFixed(2)}
                                                     </span>
                                                 </div>
                                                 <Button
                                                     type="button"
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => handleCopy(Number(title.valor).toFixed(2).replace('.', ','), 'Valor')}
                                                     className={`mt-3 w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-800 transition-all ${
                                                         copiedField === 'Valor' 
                                                             ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                                             : 'hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                                                     }`}
                                                 >
                                                     {copiedField === 'Valor' ? <Check size={14} /> : <Copy size={14} />}
                                                     {copiedField === 'Valor' ? 'Valor Copiado!' : 'Copiar Valor'}
                                                 </Button>
                                             </div>
                                         </div>

                                         {/* Observações Originais se houver */}
                                         {title.observaciones && (
                                             <div className="pt-2 text-xs border-t border-blue-100/70 dark:border-blue-900/30">
                                                 <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                                                     Observações Originais do Solicitante:
                                                 </span>
                                                 <p className="text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 font-mono text-[11px] break-all leading-relaxed">
                                                     {title.observaciones}
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </Card>

                            {/* Card de Dados do Alojamento, Clientes Contratados e Ocupantes Dinâmicos */}
                            {isLodgingOrder && (
                                <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 overflow-hidden">
                                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                                                    Conferência de Alojamento, Clientes & Trabalhadores Alojados
                                                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                                        {isLoadingOcupantes ? 'Carregando...' : `${ocupantes.length} trabalhador(es) alojado(s)`}
                                                    </Badge>
                                                    {clientesAlojamento.length > 0 && (
                                                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                                            🏢 {clientesAlojamento.length} cliente(s) contratado(s)
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Conferência em tempo real dos trabalhadores alojados e clientes vinculados ao imóvel para validação do pagamento
                                                </p>
                                            </div>
                                        </div>
                                        {(title?.cod_alojamiento || alojamentoDetalhes?.codigo) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60">
                                                <Home size={14} className="text-blue-600" />
                                                <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                                                    {title?.cod_alojamiento || alojamentoDetalhes?.codigo}
                                                </span>
                                            </div>
                                        )}
                                    </CardHeader>

                                    {/* Resumo do Imóvel + Filtro de Clientes Contratados */}
                                    <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 space-y-3">
                                        {alojamentoDetalhes && (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Alojamento / Cidade</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate" title={alojamentoDetalhes.nome}>
                                                        {alojamentoDetalhes.nome}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 block truncate">
                                                        📍 {alojamentoDetalhes.municipio || alojamentoDetalhes.provincia || 'Espanha'} {alojamentoDetalhes.endereco ? `• ${alojamentoDetalhes.endereco}` : ''}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Capacidade & Ocupação</span>
                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                                        👥 {ocupantes.length} / {alojamentoDetalhes.capacidade || ocupantes.length} plazas ocupadas
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 block">
                                                        Modalidade: {alojamentoDetalhes.tipo_alojamento || 'Fijo'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Aluguel Mensal Contrato</span>
                                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                                                        {formatCurrency(alojamentoDetalhes.valor_mensal_padrao || title?.valor || 0)}
                                                    </span>
                                                    {alojamentoDetalhes.dia_vencimento && (
                                                        <span className="text-[10px] text-slate-500 block">
                                                            Vencimento dia {alojamentoDetalhes.dia_vencimento}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Provedor / Proprietário</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate" title={alojamentoDetalhes.provedor?.nome_razao_social || title?.cod_provedor}>
                                                        {alojamentoDetalhes.provedor?.nome_razao_social || title?.cod_provedor || 'Não informado'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 block truncate">
                                                        Centro: {title?.centro_custos || 'Geral'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Barra de Filtro por Clientes Contratados neste Alojamento */}
                                        {clientesAlojamento.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                                    <Building2 size={13} /> Filtrar por Cliente Contratado no Alojamento:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedClienteOcupanteFilter('TODOS')}
                                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                                                        selectedClienteOcupanteFilter === 'TODOS'
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    Todos ({ocupantes.length})
                                                </button>
                                                {clientesAlojamento.map(cli => {
                                                    const countCli = ocupantes.filter(o => o.cliente_nome === cli).length;
                                                    const isSelected = selectedClienteOcupanteFilter === cli;
                                                    return (
                                                        <button
                                                            key={cli}
                                                            type="button"
                                                            onClick={() => setSelectedClienteOcupanteFilter(isSelected ? 'TODOS' : cli)}
                                                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                                    : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400'
                                                            }`}
                                                        >
                                                            <span>🏢 {cli}</span>
                                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                                isSelected ? 'bg-indigo-800 text-white' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                                            }`}>
                                                                {countCli} trab.
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <CardContent className="p-0 overflow-auto">
                                        {isLoadingOcupantes ? (
                                            <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                                                <RefreshCw className="animate-spin text-blue-600" size={16} /> Carregando ocupantes do imóvel...
                                            </div>
                                        ) : ocupantesFiltrados.length > 0 ? (
                                            <Table>
                                                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                                                    <TableRow>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider px-6">Colaborador</TableHead>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Código</TableHead>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Cliente Contratado</TableHead>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Obra / Pedido</TableHead>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Acomodação / Cama</TableHead>
                                                        <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Entrada</TableHead>
                                                        <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {ocupantesFiltrados.map((oc: OcupanteInfo, idx: number) => (
                                                        <TableRow key={oc.worker_id || idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30">
                                                            <TableCell className="px-6 font-bold text-slate-800 dark:text-slate-200">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-black">
                                                                        {oc.worker_nome?.charAt(0) || 'W'}
                                                                    </div>
                                                                    <div>
                                                                        <span className="block">{oc.worker_nome}</span>
                                                                        {oc.empresa_contratante && (
                                                                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                                                {oc.empresa_contratante}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                                {oc.codigo_colab || 'S/C'}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                                                                    🏢 {oc.cliente_nome || 'N/A'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                                <span className="font-semibold block">{oc.obra_nome || 'Principal'}</span>
                                                                {oc.pedido_codigo && <span className="font-mono text-[10px] text-slate-400">{oc.pedido_codigo}</span>}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Bed size={14} className="text-slate-400" />
                                                                    <span>{oc.cama_identificador || 'Acomodação Padrão'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                                                {formatDate(oc.data_inicio)}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                                                                    {oc.status || 'Ativo'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="py-8 text-center text-slate-400 text-sm">
                                                Nenhum colaborador alocado neste imóvel no momento.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Card de Supervisão de Consumo & Rateio de Excedente de Suministros (Ponte Logística -> Financeiro -> Folha) */}
                            {faturasSuministros.length > 0 && faturasSuministros.map((fat) => {
                                const editState = activeSuministroEdit[fat.id] || {
                                    limiteAceitavel: Number(fat.limite_aceitavel_periodo || 0),
                                    valorExcedente: Number(fat.valor_excedente || 0),
                                    competenciaDesconto: fat.competencia_desconto || new Date().toISOString().slice(0, 7),
                                    rateio: fat.rateio_detalhes || []
                                };
                                const somaDescontos = editState.rateio.reduce((acc, r) => acc + (r.isento ? 0 : (Number(r.valor_desconto) || 0)), 0);
                                const isLancado = fat.rateio_status === 'descontos_lancados';

                                return (
                                    <Card key={fat.id} className="rounded-3xl border-2 border-amber-200 dark:border-amber-800/70 shadow-sm bg-white dark:bg-slate-900/50 overflow-hidden">
                                        <CardHeader className="bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 pb-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
                                                    <Zap size={20} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                                                        Supervisão de Consumo & Rateio em Folha ({fat.servico})
                                                        <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                            isLancado
                                                                ? 'bg-emerald-600 text-white'
                                                                : editState.valorExcedente > 0
                                                                ? 'bg-amber-600 text-white'
                                                                : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                            {isLancado ? 'Descontos Lançados na Folha (SUMINISTROS)' : editState.valorExcedente > 0 ? 'Excedente p/ Supervisionar e Lançar' : 'Dentro do Limite Aceitável'}
                                                        </Badge>
                                                    </CardTitle>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Fatura <strong>{fat.codigo_fatura}</strong> • Período: {fat.data_inicio ? `${formatDate(fat.data_inicio)} a ${formatDate(fat.data_fim || '')} (${fat.num_dias} dias)` : (fat.mes_periodo || 'N/A')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/logistica/suministros"
                                                className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                                            >
                                                Abrir Gestão de Suministros <ArrowUpRight size={14} />
                                            </Link>
                                        </CardHeader>

                                        <CardContent className="p-6 space-y-5">
                                            {/* KPIs e Ajuste de Franquia / Competência pelo Financeiro */}
                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor da Fatura</span>
                                                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                                                        {formatCurrency(fat.valor_fatura)}
                                                    </span>
                                                </div>

                                                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60">
                                                    <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                                                        Limite Aceitável (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editState.limiteAceitavel}
                                                        onChange={(e) => handleRecalcRateioFinanceiro(fat, Number(e.target.value) || 0)}
                                                        className="w-full px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-black text-blue-900 dark:text-blue-200"
                                                    />
                                                </div>

                                                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60">
                                                    <label className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                                                        Excedente a Ratear (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editState.valorExcedente}
                                                        onChange={(e) => {
                                                            const novoExc = Math.max(0, Number(e.target.value) || 0);
                                                            const novoRateio = suministrosLogisticsService.recalcularDistribuicaoProRata(editState.rateio, novoExc);
                                                            setActiveSuministroEdit(prev => ({
                                                                ...prev,
                                                                [fat.id]: { ...editState, valorExcedente: novoExc, rateio: novoRateio }
                                                            }));
                                                        }}
                                                        className="w-full px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm font-black text-amber-900 dark:text-amber-200"
                                                    />
                                                </div>

                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                        Mês Folha (Desconto)
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={editState.competenciaDesconto}
                                                        onChange={(e) => setActiveSuministroEdit(prev => ({
                                                            ...prev,
                                                            [fat.id]: { ...editState, competenciaDesconto: e.target.value }
                                                        }))}
                                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
                                                    />
                                                </div>
                                            </div>

                                            {/* Tabela de Moradores e Desconto Individual Editável pelo Financeiro */}
                                            {editState.rateio.length > 0 ? (
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                                            <TableRow>
                                                                <TableHead className="text-xs font-bold uppercase px-4">Trabalhador</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase text-center">Dias no Período</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase text-center">% Rateio</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase text-center">Isento</TableHead>
                                                                <TableHead className="text-xs font-bold uppercase text-right px-4">Desconto Folha (€)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {editState.rateio.map((m, idx) => (
                                                                <TableRow key={m.worker_id || idx} className={m.isento ? 'opacity-50 bg-slate-50/40' : ''}>
                                                                    <TableCell className="px-4 font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                                        <div>{m.worker_nome}</div>
                                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                                            {m.codigo_colab || 'S/C'} {m.cliente_nome ? `• ${m.cliente_nome}` : ''}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={m.dias_alojado}
                                                                            onChange={(e) => handleUpdateMoradorRateioFinanceiro(fat.id, idx, 'dias_alojado', Number(e.target.value) || 0)}
                                                                            className="w-16 text-center px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                                        {Number(m.percentual || 0).toFixed(1)}%
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={Boolean(m.isento)}
                                                                            onChange={(e) => handleUpdateMoradorRateioFinanceiro(fat.id, idx, 'isento', e.target.checked)}
                                                                            className="rounded border-slate-300"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right px-4">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            disabled={Boolean(m.isento)}
                                                                            value={m.isento ? 0 : m.valor_desconto}
                                                                            onChange={(e) => handleUpdateMoradorRateioFinanceiro(fat.id, idx, 'valor_desconto', Number(e.target.value) || 0)}
                                                                            className="w-24 text-right px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-slate-100"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 text-center">
                                                    Nenhum morador vinculado ao rateio desta fatura.
                                                </div>
                                            )}

                                            {/* Rodapé de Ação do Financeiro: Lançar / Atualizar Descontos na Folha */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    Total dos descontos configurados: <strong className="text-slate-900 dark:text-white">{formatCurrency(somaDescontos)}</strong>
                                                    {isLancado && (
                                                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                                            ✓ Já sincronizado em Descontos da Folha (Categoria SUMINISTROS)
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => handleLancarDescontosFolhaFinanceiro(fat)}
                                                    disabled={isLaunchingDiscounts === fat.id || somaDescontos <= 0}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-2 shadow-sm"
                                                >
                                                    <Calculator size={15} />
                                                    {isLaunchingDiscounts === fat.id
                                                        ? 'Lançando na Folha...'
                                                        : isLancado
                                                        ? 'Atualizar Descontos na Folha (SUMINISTROS)'
                                                        : 'Confirmar e Lançar Descontos na Folha'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {/* Card de Itens */}
                            <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 overflow-hidden">
                                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                                        Parcelas e Itens da Ordem
                                    </CardTitle>
                                    {(title.status === 'rascunho' || isNeedsCorrection) && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsEditOrderOpen(true)}
                                            className="text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                        >
                                            <Edit3 size={14} className="mr-1" /> Editar Dados
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0 overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                                            <TableRow>
                                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider px-6">Item Código</TableHead>
                                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Categoria</TableHead>
                                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Centro de Custo / Obra</TableHead>
                                                <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Vencimento</TableHead>
                                                <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Valor</TableHead>
                                                <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status Pagamento</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {title.itens && title.itens.length > 0 ? title.itens.map((item) => (
                                                <TableRow key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                                    <TableCell className="px-6 font-semibold text-slate-700 dark:text-slate-400">{item.cod_orden_pago_item}</TableCell>
                                                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">{item.categoria_orden}</TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400">{item.centro_custo || 'Administrativo'}</TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400">{formatDate(item.vencimento_orden)}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-950 dark:text-slate-100">{formatCurrency(item.valor_orden)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={item.cod_pago ? 'default' : 'secondary'} className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                                                            {item.cod_pago ? `Vinculado (${item.cod_pago})` : 'Aguardando'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-6 text-slate-400">Nenhum item associado.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Card de Anexos da Fatura */}
                            {title.anexos && (
                                <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-4">Documentação da Fatura / Origem</h3>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate max-w-md">
                                                    Documento Anexo da Fatura
                                                </span>
                                                <span className="text-xs text-slate-400">Comprovante de cobrança enviado pelo fornecedor</span>
                                            </div>
                                        </div>
                                        <a 
                                            href={title.anexos} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/10"
                                        >
                                            <ArrowUpRight size={14} /> Abrir Fatura
                                        </a>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Coluna da Direita (Ações, Detalhes de Pagamento e Histórico) */}
                        <div className="space-y-6">
                            
                            {/* Card de Liquidação Bancária (Se Pago) */}
                            {isPaid && (
                                <Card className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                            <CheckCircle2 size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                                                Liquidação Bancária Concluída
                                            </h3>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                                Ordem paga e baixada no financeiro
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-4 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Data do Pagamento:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{formatDate(title.fecha_pago || title.updated_at)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Executado Por:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{title.pago_por || 'Financeiro'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Forma de Pagamento:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{title.forma_pagamento || 'Transferência Bancária'}</span>
                                        </div>
                                        {title.banco_id && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold">Banco de Saída:</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {bancos.find(b => b.id === title.banco_id)?.nome_banco || 'Conta Corporativa'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {(title.comprovante_geral || title.anexos) && (
                                        <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/60">
                                            <a
                                                href={title.comprovante_geral || title.anexos}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                                            >
                                                <Download size={14} /> Visualizar Comprovante Bancário
                                            </a>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Card de Ações Rápidas */}
                            <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 p-6">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-4">
                                    Fluxo de Aprovação & Ações
                                </h3>
                                
                                <div className="space-y-3">
                                    {/* Enviar para aprovação inicial */}
                                    {title.status === 'rascunho' && (
                                        <Button 
                                            onClick={() => actionMutation.mutate({ status: 'aguardando_aprovacao', comments: 'Ordem enviada para aprovação.' })}
                                            disabled={actionMutation.isPending}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold"
                                        >
                                            <Send size={16} /> Enviar para Aprovação
                                        </Button>
                                    )}

                                    {/* Ações do Aprovador (Maker-Checker) */}
                                    {canApprove && (
                                        <div className="space-y-3">
                                            {/* Opção 1: Pagar Agora (Aprovação + Liquidação imediata) */}
                                            <Button 
                                                onClick={() => setIsLiquidateOpen(true)}
                                                disabled={liquidateMutation.isPending}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/15 transition-all cursor-pointer"
                                            >
                                                <Wallet size={16} /> Pagar e Liquidar Agora
                                            </Button>

                                            {/* Opção 2: Apenas Aprovar (Sem pagar agora) */}
                                            <Button 
                                                onClick={() => setIsApproveOpen(true)}
                                                disabled={actionMutation.isPending}
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                            >
                                                <CheckCircle size={16} /> Apenas Aprovar (Pagar Depois)
                                            </Button>

                                            {/* Botão Solicitar Correção / Ajuste */}
                                            <Button 
                                                onClick={() => setIsCorrectionOpen(true)}
                                                disabled={actionMutation.isPending}
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl py-3 font-bold"
                                            >
                                                <AlertTriangle size={16} /> Solicitar Ajuste / Correção
                                            </Button>

                                            {/* Botão Rejeitar em Definitivo */}
                                            <Button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionMutation.isPending}
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 border-red-200 hover:bg-red-50 text-red-600 rounded-xl py-3 font-bold"
                                            >
                                                <XCircle size={16} /> Recusar / Rejeitar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Ordem Aprovada - Permitir Pagamento / Liquidação Imediata */}
                                    {isApproved && (
                                        <div className="space-y-3">
                                            <Button 
                                                onClick={() => setIsLiquidateOpen(true)}
                                                disabled={liquidateMutation.isPending}
                                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold shadow-md shadow-emerald-600/10"
                                            >
                                                <Wallet size={16} /> Pagar e Liquidar Agora
                                            </Button>
                                            <p className="text-[11px] text-slate-400 text-center">
                                                Esta ordem já gerou um título correspondente em <strong>Contas a Pagar</strong>. Você pode pagar agora ou liquidar na data de vencimento.
                                            </p>
                                        </div>
                                    )}

                                    {/* Se Correção Solicitada */}
                                    {isNeedsCorrection && (
                                        <div className="space-y-2.5">
                                            <Button 
                                                onClick={() => setIsEditOrderOpen(true)}
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-xl py-2.5 font-bold"
                                            >
                                                <Edit3 size={16} /> Corrigir Dados da Ordem
                                            </Button>
                                            <Button 
                                                onClick={() => actionMutation.mutate({ 
                                                    status: 'aguardando_aprovacao', 
                                                    comments: 'Ordem revisada e reenviada para aprovação.' 
                                                })}
                                                disabled={actionMutation.isPending}
                                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-bold"
                                            >
                                                <Send size={16} /> Reenviar para Aprovação
                                            </Button>
                                        </div>
                                    )}

                                    {/* Se Pago */}
                                    {isPaid && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                                            <CheckCircle2 size={16} />
                                            <span>Ordem finalizada e liquidada com sucesso.</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Timeline de Movimentações */}
                            <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50 p-6 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-6">
                                    Histórico de Movimentações
                                </h3>
                                
                                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                                    {title.movimentos && title.movimentos.length > 0 ? title.movimentos.map((mov: any) => (
                                        <div key={mov.id} className="flex gap-4 relative">
                                            <div className="w-[24px] h-[24px] rounded-full bg-blue-50 dark:bg-slate-900 border-2 border-blue-600 flex items-center justify-center flex-shrink-0 z-10">
                                                <div className="w-[6px] h-[6px] rounded-full bg-blue-600"></div>
                                            </div>
                                            <div className="space-y-1 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1">
                                                <div className="flex justify-between items-center flex-wrap gap-1">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{mov.tipo_mov}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{formatDate(mov.criado_em)}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">{mov.observaciones || 'Sem observações.'}</p>
                                                {mov.anexo_url && (
                                                    <a 
                                                        href={mov.anexo_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-1"
                                                    >
                                                        <FileText size={12} /> Ver Comprovante
                                                    </a>
                                                )}
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Por: {mov.criado_por}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6 text-xs text-slate-400">Nenhum movimento registrado.</div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* MODAL 1: Solicitar Correção / Ajuste */}
                <Dialog open={isCorrectionOpen} onOpenChange={setIsCorrectionOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={22} />
                                Solicitar Ajuste / Correção
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <p className="text-xs text-slate-500">
                                Descreva o que precisa ser ajustado ou anexado pelo solicitante. A ordem receberá o status <strong>Correção Solicitada</strong> e o solicitante poderá reeditá-la.
                            </p>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="Ex: O valor do consumo de gás não confere com o recibo. Favor anexar a última fatura detalhada e retificar o valor."
                                rows={4}
                                value={correctionReason}
                                onChange={e => setCorrectionReason(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter className="flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsCorrectionOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    if (!correctionReason.trim()) {
                                        toast.warning("Por favor, descreva o motivo do ajuste.");
                                        return;
                                    }
                                    actionMutation.mutate({ 
                                        status: 'correcao_solicitada', 
                                        comments: correctionReason 
                                    });
                                }}
                                disabled={actionMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/10"
                            >
                                Enviar para Correção
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL 2: Aprovação Híbrida */}
                <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <CheckCircle className="text-emerald-500" size={22} />
                                Aprovar Ordem de Pagamento
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            {/* Conferência de Alojamento e Trabalhadores Alojados na Hora de Aprovar */}
                            {isLodgingOrder && (
                                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-2 text-xs">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                        <span className="font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                            <Users size={14} className="text-emerald-600" />
                                            Trabalhadores Alojados no Imóvel ({ocupantes.length})
                                        </span>
                                        {(title?.cod_alojamiento || alojamentoDetalhes?.codigo) && (
                                            <span className="px-2 py-0.5 bg-blue-600 text-white font-mono text-[10px] font-bold rounded">
                                                {title?.cod_alojamiento || alojamentoDetalhes?.codigo}
                                            </span>
                                        )}
                                    </div>
                                    {clientesAlojamento.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">🏢 Cliente(s):</span>
                                            {clientesAlojamento.map(cli => (
                                                <span key={cli} className="px-2 py-0.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold">
                                                    {cli} ({ocupantes.filter(o => o.cliente_nome === cli).length})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {ocupantes.length > 0 ? (
                                        <div className="max-h-32 overflow-y-auto divide-y divide-emerald-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                                            {ocupantes.map((oc, idx) => (
                                                <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                                                    <div className="truncate">
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{oc.worker_nome}</span>
                                                        {oc.codigo_colab && <span className="ml-1 font-mono text-[10px] text-slate-400">[{oc.codigo_colab}]</span>}
                                                        <span className="ml-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">• 🏢 {oc.cliente_nome || 'S/Cliente'}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 flex-shrink-0">🛏️ {oc.cama_identificador || 'Quarto'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300">Nenhum trabalhador com check-in ativo neste alojamento no momento.</p>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-slate-500">
                                Como deseja processar esta aprovação?
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {/* Opção 1: Aprovar para Vencimento */}
                                <div 
                                    onClick={() => {
                                        actionMutation.mutate({ 
                                            status: 'aprovado', 
                                            comments: actionComments || 'Ordem aprovada para pagamento na data de vencimento.' 
                                        });
                                    }}
                                    className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all flex items-start gap-3.5 group"
                                >
                                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 group-hover:scale-105 transition-transform">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Aprovar para Vencimento ({formatDate(title.data_vencimento)})
                                        </h5>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Gera o título em <strong>Contas a Pagar</strong> como pendente. A tesouraria pagará na data de vencimento.
                                        </p>
                                    </div>
                                </div>

                                {/* Opção 2: Pagar e Liquidar Agora */}
                                <div 
                                    onClick={() => {
                                        setIsApproveOpen(false);
                                        setIsLiquidateOpen(true);
                                    }}
                                    className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex items-start gap-3.5 group"
                                >
                                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 group-hover:scale-105 transition-transform">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Aprovar e Pagar Agora (Liquidação Imediata)
                                        </h5>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Efetua o pagamento hoje, anexa o justificante bancário e já liquida a ordem e a conta a pagar.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Observações da Aprovação (Opcional)
                                </label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="Comentário sobre a aprovação..."
                                    rows={2}
                                    value={actionComments}
                                    onChange={e => setActionComments(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-end border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsApproveOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL 3: Pagar e Liquidar (Comprovante e Banco) */}
                <Dialog open={isLiquidateOpen} onOpenChange={setIsLiquidateOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Landmark className="text-emerald-600" size={22} />
                                Liquidar Pagamento Bancário
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-3">
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                                <div>
                                    <span className="text-slate-400 block font-semibold">Valor da Ordem</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(title.valor)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-semibold">Código</span>
                                    <span className="font-mono font-bold text-blue-600">{title.cod_orden_pago || 'OP'}</span>
                                </div>
                            </div>

                            {/* Conferência de Alojamento, Clientes Contratados e Trabalhadores Alojados na Hora de Pagar */}
                            {isLodgingOrder && (
                                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                                <Home size={13} className="text-emerald-600" />
                                                Conferência de Alojamento & Trabalhadores na Hora de Pagar
                                            </span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                                                {alojamentoDetalhes?.nome || title.descricao}
                                                {alojamentoDetalhes?.municipio ? ` (${alojamentoDetalhes.municipio})` : ''}
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                                            👥 {ocupantes.length}{alojamentoDetalhes?.capacidade ? `/${alojamentoDetalhes.capacidade}` : ''} alojado(s)
                                        </span>
                                    </div>

                                    {clientesAlojamento.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">🏢 Clientes neste Alojamento:</span>
                                            {clientesAlojamento.map(cli => (
                                                <span key={cli} className="px-2 py-0.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[10px] font-bold">
                                                    🏢 {cli} ({ocupantes.filter(o => o.cliente_nome === cli).length} trab.)
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {ocupantes.length > 0 ? (
                                        <div className="max-h-36 overflow-y-auto divide-y divide-emerald-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                                            {ocupantes.map((oc, idx) => (
                                                <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {oc.codigo_colab && (
                                                                <span className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold rounded text-slate-600 dark:text-slate-300">
                                                                    {oc.codigo_colab}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-slate-800 dark:text-slate-100">{oc.worker_nome}</span>
                                                        </div>
                                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                                                            🏢 {oc.cliente_nome || 'Cliente N/A'} {oc.obra_nome ? `• 🏗️ ${oc.obra_nome}` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold block">
                                                            🛏️ {oc.cama_identificador || 'Quarto'}
                                                        </span>
                                                        {oc.data_inicio && (
                                                            <span className="text-[9px] text-slate-400 block">
                                                                Desde: {oc.data_inicio}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
                                            ⚠️ Nenhum trabalhador com check-in ativo neste alojamento no momento.
                                        </div>
                                    )}
                                </div>
                            )}

                            {bankDetails.iban && (
                                <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-xs flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="min-w-0">
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                                            Conta de Destino / Favorecido
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
                                            {bankDetails.titular} {bankDetails.banco ? `• ${bankDetails.banco}` : ''}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 block select-all">
                                            {bankDetails.iban}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopy(bankDetails.iban!, 'IBAN')}
                                        className="flex-shrink-0 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 rounded-xl text-xs gap-1.5 font-bold"
                                    >
                                        <Copy size={13} /> Copiar IBAN
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Banco / Conta de Saída <span className="text-red-500">*</span>
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                        value={bancoId}
                                        onChange={e => setBancoId(e.target.value)}
                                    >
                                        <option value="">Selecione o Banco</option>
                                        {bancos.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.nome_banco} {b.numero_conta ? `(${b.numero_conta})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Forma de Pagamento
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                        value={formaPagamento}
                                        onChange={e => setFormaPagamento(e.target.value)}
                                    >
                                        <option value="Transferência Bancária">Transferência Bancária</option>
                                        <option value="Cartão Corporativo">Cartão Corporativo</option>
                                        <option value="Débito Direto / Domiciliação">Débito Direto / Domiciliação</option>
                                        <option value="Boleto / Recibo">Boleto / Recibo</option>
                                        <option value="Caixa / Dinheiro">Caixa / Dinheiro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Data da Transferência / Liquidação
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    value={dataPagamento}
                                    onChange={e => setDataPagamento(e.target.value)}
                                />
                            </div>

                            {/* Upload do Comprovante Bancário */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Comprovante Bancário (Justificante)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="file" 
                                        id="comprovante-upload-input"
                                        className="hidden"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={handleComprovanteUpload}
                                    />
                                    <label 
                                        htmlFor="comprovante-upload-input"
                                        className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                    >
                                        {isUploadingComprovante ? (
                                            <>
                                                <RefreshCw className="animate-spin text-emerald-600" size={16} />
                                                Enviando arquivo...
                                            </>
                                        ) : comprovanteUrl ? (
                                            <>
                                                <CheckCircle2 className="text-emerald-600" size={16} />
                                                Comprovante Anexado (Clique para alterar)
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} className="text-slate-400" />
                                                Clique para anexar o PDF ou imagem do banco
                                            </>
                                        )}
                                    </label>
                                    {comprovanteUrl && (
                                        <a 
                                            href={comprovanteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                                            title="Ver anexo"
                                        >
                                            <Download size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Observações da Liquidação
                                </label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="Ex: Transferência autorizada e confirmada no aplicativo do banco."
                                    rows={2}
                                    value={liquidationComments}
                                    onChange={e => setLiquidationComments(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsLiquidateOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => liquidateMutation.mutate()}
                                disabled={liquidateMutation.isPending || isUploadingComprovante}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10"
                            >
                                {liquidateMutation.isPending ? 'Liquidando...' : 'Confirmar Liquidação e Baixa'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL 4: Editar Dados da Ordem (Para Solicitante / Financeiro) */}
                <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Edit3 className="text-blue-600" size={22} />
                                Editar Dados da Ordem de Pagamento
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Descrição Principal
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    value={editDescricao}
                                    onChange={e => setEditDescricao(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Link / URL da Fatura Anexa
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    placeholder="https://..."
                                    value={editAnexos}
                                    onChange={e => setEditAnexos(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Observações da Ordem
                                </label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                                    rows={3}
                                    value={editObservacoes}
                                    onChange={e => setEditObservacoes(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsEditOrderOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="secondary"
                                    onClick={() => editMutation.mutate({ reenviar: false })}
                                    disabled={editMutation.isPending}
                                    className="rounded-xl font-bold"
                                >
                                    Salvar Alterações
                                </Button>
                                <Button 
                                    onClick={() => editMutation.mutate({ reenviar: true })}
                                    disabled={editMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/10"
                                >
                                    Salvar e Reenviar
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL 5: Rejeitar Ordem em Definitivo */}
                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <XCircle className="text-red-500" size={22} />
                                Recusar Ordem de Pagamento
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <p className="text-xs text-slate-500">
                                Ao rejeitar, a ordem será finalizada como <strong>Rejeitada</strong> e não prosseguirá para pagamento. Por favor, descreva a justificativa.
                            </p>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="Ex: Cobrança duplicada já paga pelo contrato anterior."
                                rows={3}
                                value={actionComments}
                                onChange={e => setActionComments(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter className="flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsRejectOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    if (!actionComments.trim()) {
                                        toast.warning("Descreva o motivo da rejeição.");
                                        return;
                                    }
                                    actionMutation.mutate({ status: 'rejeitado', comments: actionComments });
                                }}
                                disabled={actionMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                            >
                                Confirmar Rejeição
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </Tooltip.Provider>
    );
};
