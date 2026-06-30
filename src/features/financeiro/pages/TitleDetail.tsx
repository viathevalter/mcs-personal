import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { ChevronLeft, Calendar, DollarSign, FileText, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, ArrowRight, Link2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fetchOrdemPagamentoDetails, updateOrdemPagamentoStatus } from '../data/loader';
import { toast } from 'sonner';
import * as Tooltip from '@radix-ui/react-tooltip';

const getStatusClass = (status: string) => {
    switch (status) {
        case 'pago': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
        case 'rejeitado': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
        case 'aguardando_aprovacao': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
        case 'aprovado': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
        case 'rascunho': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const getStatusLabel = (status: string) => {
    switch(status) {
        case 'rascunho': return 'Rascunho';
        case 'aguardando_aprovacao': return 'Aguardando Aprovação';
        case 'aprovado': return 'Aprovado';
        case 'pago': return 'Pago';
        case 'rejeitado': return 'Rejeitado';
        default: return status;
    }
};

export const TitleDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Modal states
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [actionComments, setActionComments] = useState('');

    const { data: title, isLoading, error } = useQuery({
        queryKey: ['ordens_pagamento', id],
        queryFn: async () => {
            if (!id) return null;
            return fetchOrdemPagamentoDetails(id);
        },
        enabled: !!id
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
            setIsApproveOpen(false);
            setActionComments('');
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento', id] });
            queryClient.invalidateQueries({ queryKey: ['ordens_pagamento'] });
            queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
        },
        onError: (err: any) => {
            toast.error(`Erro ao atualizar ordem: ${err.message}`);
        }
    });

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando detalhes...</div>;
    if (error || !title) return <div className="p-8 text-center text-slate-500">Ordem de pagamento não encontrada.</div>;

    const isMaker = user?.id === title.criador_id;
    const canApprove = title.status === 'aguardando_aprovacao';
    const canSubmit = title.status === 'rascunho' || title.status === 'rejeitado';
    const isApproved = title.status === 'aprovado';

    return (
        <Tooltip.Provider delayDuration={200}>
            <div className="h-full overflow-y-auto p-6 bg-slate-50/30">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Link to="/financeiro/titulos" className="flex items-center text-slate-500 hover:text-slate-700 transition-colors mb-4 w-fit text-sm font-semibold">
                        <ChevronLeft size={16} className="mr-1" /> Voltar para Ordens de Pagamento
                    </Link>

                    {/* Layout em Duas Colunas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Coluna da Esquerda (Cabeçalho, Itens, Anexos) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Card de Cabeçalho */}
                            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white dark:bg-slate-950 p-6 md:p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                {title.cod_orden_pago || 'Pendente'}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(title.status)}`}>
                                                {getStatusLabel(title.status)}
                                            </span>
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

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-sm">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vencimento</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(title.data_vencimento)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Criado Em</span>
                                        <span className="font-semibold text-slate-600 dark:text-slate-400">{formatDate(title.created_at)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Qtd Itens</span>
                                        <span className="font-bold text-slate-850 dark:text-slate-300">{title.itens?.length || title.qtde_itens || 0}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Card de Itens */}
                            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
                                <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-4 px-6">
                                    <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Parcelas e Itens da Ordem</CardTitle>
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
                                                <TableHead className="text-center text-slate-500 font-bold text-xs uppercase tracking-wider">Status Pago</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {title.itens && title.itens.length > 0 ? title.itens.map((item) => (
                                                <TableRow key={item.id} className="border-b border-slate-100 dark:border-slate-850">
                                                    <TableCell className="px-6 font-semibold text-slate-700 dark:text-slate-400">{item.cod_orden_pago_item}</TableCell>
                                                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">{item.categoria_orden}</TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400">{item.centro_custo || 'Administrativo'}</TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400">{formatDate(item.vencimento_orden)}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-950 dark:text-slate-100">{formatCurrency(item.valor_orden)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={item.cod_pago ? 'default' : 'secondary'} className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                                                            {item.cod_pago ? `Gerado (${item.cod_pago})` : 'Aguardando'}
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

                            {/* Card de Anexos */}
                            {title.anexos && (
                                <Card className="rounded-3xl border-slate-100 shadow-sm bg-white dark:bg-slate-950 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-4">Anexos e Documentação</h3>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-fit">
                                        <Link2 className="text-blue-600" size={18} />
                                        <a href={title.anexos} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline truncate max-w-md">
                                            Visualizar Documento Fatura
                                        </a>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Coluna da Direita (Histórico/Movimentos e Ações) */}
                        <div className="space-y-6">
                            
                            {/* Ações Rápidas */}
                            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white dark:bg-slate-950 p-6">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-4">Ações Disponíveis</h3>
                                
                                <div className="space-y-3">
                                    {canSubmit && (
                                        <Button 
                                            onClick={() => actionMutation.mutate({ status: 'aguardando_aprovacao', comments: 'Ordem enviada para aprovação.' })}
                                            disabled={actionMutation.isPending}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold"
                                        >
                                            <Send size={16} /> Enviar para Aprovação
                                        </Button>
                                    )}

                                    {canApprove && (
                                        <div className="space-y-3">
                                            <Tooltip.Root>
                                                <Tooltip.Trigger asChild>
                                                    <span className="block w-full">
                                                        <Button 
                                                            onClick={() => setIsApproveOpen(true)}
                                                            disabled={isMaker || actionMutation.isPending}
                                                            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all ${
                                                                isMaker 
                                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:text-slate-700' 
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10'
                                                            }`}
                                                        >
                                                            <CheckCircle size={16} /> Aprovar Pagamento
                                                        </Button>
                                                    </span>
                                                </Tooltip.Trigger>
                                                {isMaker && (
                                                    <Tooltip.Portal>
                                                        <Tooltip.Content className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-xs z-50" side="bottom" sideOffset={5}>
                                                            Segregação de Funções (Maker-Checker): Você não pode aprovar uma ordem de pagamento que você mesmo criou.
                                                            <Tooltip.Arrow className="fill-slate-900" />
                                                        </Tooltip.Content>
                                                    </Tooltip.Portal>
                                                )}
                                            </Tooltip.Root>

                                            <Button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionMutation.isPending}
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 border-red-200 hover:bg-red-50 text-red-600 rounded-xl py-3 font-bold"
                                            >
                                                <XCircle size={16} /> Enviar para Revisão
                                            </Button>
                                        </div>
                                    )}

                                    {isApproved && (
                                        <Button 
                                            onClick={() => actionMutation.mutate({ status: 'pago', comments: 'Comprovante verificado e executado.' })}
                                            disabled={actionMutation.isPending}
                                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-bold"
                                        >
                                            <CheckCircle size={16} /> Marcar como Pago (Executado)
                                        </Button>
                                    )}

                                    {!canSubmit && !canApprove && !isApproved && (
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-500 border border-slate-100 dark:border-slate-800">
                                            <AlertCircle size={16} />
                                            <span>Nenhuma ação pendente disponível no momento.</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Timeline de Movimentações */}
                            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white dark:bg-slate-950 p-6 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-6">Histórico de Movimentações</h3>
                                
                                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-900">
                                    {title.movimentos && title.movimentos.length > 0 ? title.movimentos.map((mov: any) => (
                                        <div key={mov.id} className="flex gap-4 relative">
                                            <div className="w-[24px] h-[24px] rounded-full bg-blue-50 dark:bg-slate-900 border-2 border-blue-600 flex items-center justify-center flex-shrink-0 z-10">
                                                <div className="w-[6px] h-[6px] rounded-full bg-blue-600"></div>
                                            </div>
                                            <div className="space-y-1 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900 flex-1">
                                                <div className="flex justify-between items-center flex-wrap gap-1">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{mov.tipo_mov}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{formatDate(mov.criado_em)}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500">{mov.observaciones || 'Sem observações.'}</p>
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

                {/* Reject Dialog Modal */}
                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Enviar para Revisão</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-xs text-slate-500">Por favor, descreva o motivo do retorno para revisão. Este comentário será registrado no histórico da ordem.</p>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="Ex: Valor incorreto do aluguel do alojamento 3. Corrigir e reenviar."
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
                                    if (!actionComments) {
                                        toast.warning("Descreva o motivo da rejeição.");
                                        return;
                                    }
                                    actionMutation.mutate({ status: 'rejeitado', comments: actionComments });
                                }}
                                className="bg-red-600 hover:bg-red-755 text-white rounded-xl font-bold"
                            >
                                Rejeitar e Devolver
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approve Dialog Modal */}
                <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                    <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Aprovar Ordem de Pagamento</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-xs text-slate-500">Tem certeza que deseja aprovar esta ordem de pagamento? Ao aprovar, as parcelas correspondentes serão geradas automaticamente no Contas a Pagar (Pagos).</p>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600/20 text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="Observações de aprovação (opcional)..."
                                rows={2}
                                value={actionComments}
                                onChange={e => setActionComments(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                            <Button variant="outline" onClick={() => setIsApproveOpen(false)} className="rounded-xl border-slate-200">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    actionMutation.mutate({ status: 'aprovado', comments: actionComments || 'Aprovado pelo financeiro diretoria.' });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                            >
                                Confirmar Aprovação
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Tooltip.Provider>
    );
};
