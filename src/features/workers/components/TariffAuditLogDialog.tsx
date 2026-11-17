import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Loader2,
    History,
    ShieldCheck,
    Search,
    Copy,
    Check,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Calendar,
    FileText,
    ArrowLeft,
    Pencil,
    Trash2,
    Save
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listWorkerTariffAuditLogs,
    listTariffAuthorizationRequests,
    updatePendingTariffAuthorizationRequest,
    deletePendingTariffAuthorizationRequest,
    formatMesVigenciaLabel,
    type TariffAuthorizationRequest,
    type TariffItemRequest
} from '../api/tariffGovernanceApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { toast } from 'sonner';

interface TariffAuditLogDialogProps {
    trigger?: React.ReactNode;
}

export function TariffAuditLogDialog({ trigger }: TariffAuditLogDialogProps) {
    const { user } = useAuth();
    const { role } = useRole();
    const queryClient = useQueryClient();

    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<(TariffAuthorizationRequest & { url: string }) | null>(null);

    // Edit state for pending requests
    const [isEditing, setIsEditing] = useState(false);
    const [editMesVigencia, setEditMesVigencia] = useState('');
    const [editMotivo, setEditMotivo] = useState('');
    const [editTariffs, setEditTariffs] = useState<Record<number, string>>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: requests, isLoading: loadingReqs, refetch: refetchReqs } = useQuery({
        queryKey: ['tariff-authorization-requests'],
        queryFn: listTariffAuthorizationRequests,
        enabled: open,
        refetchOnWindowFocus: true
    });

    const { data: logs, isLoading: loadingLogs } = useQuery({
        queryKey: ['tariff-audit-logs'],
        queryFn: listWorkerTariffAuditLogs,
        enabled: open,
        refetchOnWindowFocus: true
    });

    const canManageRequest = (req: TariffAuthorizationRequest) => {
        if (req.status !== 'PENDENTE') return false;
        const isAdmin = role === 'super_admin' || role === 'admin_rh' || role === 'admin';
        if (isAdmin) return true;
        if (req.solicitante_id && user?.id && req.solicitante_id === user.id) return true;
        if (req.solicitante_email && user?.email && req.solicitante_email.toLowerCase() === user.email.toLowerCase()) return true;
        return false;
    };

    const startEditing = (req: TariffAuthorizationRequest & { url: string }) => {
        setSelectedRequest(req);
        setEditMesVigencia(req.mes_vigencia);
        setEditMotivo(req.motivo_alteracao || '');
        const tariffMap: Record<number, string> = {};
        req.itens_solicitacao.forEach((item, idx) => {
            tariffMap[idx] = Number(item.tarifa_nova || 0).toFixed(2);
        });
        setEditTariffs(tariffMap);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedRequest) return;
        if (!editMesVigencia || !/^\d{4}-\d{2}$/.test(editMesVigencia)) {
            toast.error('Informe um mês de vigência válido.');
            return;
        }
        if (!editMotivo.trim()) {
            toast.error('Informe a justificativa do termo.');
            return;
        }

        const updatedItems: TariffItemRequest[] = selectedRequest.itens_solicitacao.map((item, idx) => {
            const raw = editTariffs[idx] ?? String(item.tarifa_nova);
            const parsed = parseFloat(raw.replace(',', '.'));
            return {
                ...item,
                tarifa_nova: isNaN(parsed) ? item.tarifa_nova : parsed
            };
        });

        setIsSavingEdit(true);
        try {
            await updatePendingTariffAuthorizationRequest({
                requestId: selectedRequest.id,
                mesVigencia: editMesVigencia,
                motivoAlteracao: editMotivo.trim(),
                itens: updatedItems
            });

            setSelectedRequest({
                ...selectedRequest,
                mes_vigencia: editMesVigencia,
                motivo_alteracao: editMotivo.trim(),
                itens_solicitacao: updatedItems
            });
            setIsEditing(false);
            await refetchReqs();
            queryClient.invalidateQueries({ queryKey: ['worker-tariff-status-badges'] });
            toast.success('Termo atualizado! O autorizador já verá os dados corrigidos no link.');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao atualizar termo.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteRequest = async (req: TariffAuthorizationRequest, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const confirmed = window.confirm(
            `Deseja realmente excluir o termo ${req.codigo_termo}? A tarefa vinculada na Super Gaveta também será cancelada.`
        );
        if (!confirmed) return;

        setDeletingId(req.id);
        try {
            await deletePendingTariffAuthorizationRequest(req.id);
            if (selectedRequest?.id === req.id) {
                setSelectedRequest(null);
                setIsEditing(false);
            }
            await refetchReqs();
            queryClient.invalidateQueries({ queryKey: ['worker-tariff-status-badges'] });
            toast.success(`Termo ${req.codigo_termo} excluído com sucesso.`);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao excluir termo.');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredRequests = React.useMemo(() => {
        if (!requests) return [];
        if (!searchTerm.trim()) return requests;

        const term = searchTerm.toLowerCase();
        return requests.filter(r =>
            (r.codigo_termo && r.codigo_termo.toLowerCase().includes(term)) ||
            (r.solicitante_nome && r.solicitante_nome.toLowerCase().includes(term)) ||
            (r.gerente_nome && r.gerente_nome.toLowerCase().includes(term)) ||
            (r.mes_vigencia && r.mes_vigencia.toLowerCase().includes(term)) ||
            (r.status && r.status.toLowerCase().includes(term)) ||
            (r.motivo_rejeicao && r.motivo_rejeicao.toLowerCase().includes(term)) ||
            r.itens_solicitacao.some(
                i =>
                    i.worker_nome.toLowerCase().includes(term) ||
                    (i.cliente_nombre && i.cliente_nombre.toLowerCase().includes(term))
            )
        );
    }, [requests, searchTerm]);

    const filteredLogs = React.useMemo(() => {
        if (!logs) return [];
        if (!searchTerm.trim()) return logs;

        const term = searchTerm.toLowerCase();
        return logs.filter(l =>
            (l.worker_nome && l.worker_nome.toLowerCase().includes(term)) ||
            (l.cod_colab && l.cod_colab.toLowerCase().includes(term)) ||
            (l.cliente_nombre && l.cliente_nombre.toLowerCase().includes(term)) ||
            (l.alterado_por_nome && l.alterado_por_nome.toLowerCase().includes(term)) ||
            (l.autorizado_por_nome && l.autorizado_por_nome.toLowerCase().includes(term)) ||
            (l.codigo_termo && l.codigo_termo.toLowerCase().includes(term))
        );
    }, [logs, searchTerm]);

    const handleCopyLink = (token: string, url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        toast.success('Link do termo copiado!');
        setTimeout(() => setCopiedToken(null), 2500);
    };

    const pendingCount = requests?.filter(r => r.status === 'PENDENTE').length || 0;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setSelectedRequest(null);
                    setIsEditing(false);
                }
                setOpen(next);
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs font-semibold gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 relative"
                    >
                        <History className="w-3.5 h-3.5 text-indigo-600" />
                        Histórico & Termos
                        {pendingCount > 0 && (
                            <Badge className="ml-1 h-5 px-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold">
                                {pendingCount} pendente(s)
                            </Badge>
                        )}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[1120px] max-h-[88vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 pr-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                            Governança & Termos de Autorização de Tarifas
                        </div>
                        {pendingCount > 0 && !selectedRequest && (
                            <Badge className="bg-amber-500 text-white font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {pendingCount} Termo(s) Aguardando Assinatura
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Acompanhe os termos enviados, vigências programadas, edite/exclua termos pendentes e consulte assinaturas ou motivos de recusa.
                    </DialogDescription>
                </DialogHeader>

                {selectedRequest ? (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => {
                                    setSelectedRequest(null);
                                    setIsEditing(false);
                                }}
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Voltar para Lista
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-600">{selectedRequest.codigo_termo}</span>
                                {selectedRequest.status === 'PENDENTE' && (
                                    <Badge className="bg-amber-500 text-white text-[10px]">PENDENTE</Badge>
                                )}
                                {selectedRequest.status === 'APROVADO' && (
                                    <Badge className="bg-emerald-600 text-white text-[10px]">APROVADO</Badge>
                                )}
                                {selectedRequest.status === 'REJEITADO' && (
                                    <Badge className="bg-rose-600 text-white text-[10px]">NÃO AUTORIZADO</Badge>
                                )}

                                {canManageRequest(selectedRequest) && !isEditing && (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => startEditing(selectedRequest)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Editar Termo
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                                            disabled={deletingId === selectedRequest.id}
                                            onClick={() => handleDeleteRequest(selectedRequest)}
                                        >
                                            {deletingId === selectedRequest.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                            Excluir
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                                <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Solicitante</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedRequest.solicitante_nome}</span>
                                {selectedRequest.solicitante_email && (
                                    <span className="block text-[11px] text-muted-foreground">{selectedRequest.solicitante_email}</span>
                                )}
                            </div>
                            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                                <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Autorizador Designado</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedRequest.gerente_nome}</span>
                                {selectedRequest.gerente_email && (
                                    <span className="block text-[11px] text-muted-foreground">{selectedRequest.gerente_email}</span>
                                )}
                            </div>
                            <div className="p-3 rounded-lg border bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200">
                                <span className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300 font-semibold block">
                                    Início da Vigência
                                </span>
                                {isEditing ? (
                                    <Input
                                        type="month"
                                        value={editMesVigencia}
                                        onChange={(e) => setEditMesVigencia(e.target.value)}
                                        className="h-8 text-xs font-semibold mt-1 bg-white"
                                    />
                                ) : (
                                    <>
                                        <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatMesVigenciaLabel(selectedRequest.mes_vigencia)}
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground">
                                            Emitido em {new Date(selectedRequest.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedRequest.status === 'REJEITADO' && (
                            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-rose-800 dark:text-rose-300 uppercase flex items-center gap-1.5">
                                        <XCircle className="w-4 h-4" />
                                        Motivo da Não Autorização
                                    </span>
                                    <span className="text-[11px] text-rose-700">
                                        {selectedRequest.rejeitado_por_nome || selectedRequest.gerente_nome} •{' '}
                                        {selectedRequest.rejeitado_em
                                            ? new Date(selectedRequest.rejeitado_em).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
                                            : ''}
                                    </span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {selectedRequest.motivo_rejeicao || 'Sem justificativa registrada.'}
                                </p>
                            </div>
                        )}

                        {isEditing ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Justificativa da Solicitação</Label>
                                <Textarea
                                    rows={3}
                                    value={editMotivo}
                                    onChange={(e) => setEditMotivo(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        ) : (
                            selectedRequest.motivo_alteracao && (
                                <div className="p-3.5 rounded-lg border bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-1">
                                    <span className="font-bold text-indigo-900 dark:text-indigo-200 uppercase text-[10px] flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        Justificativa da Solicitação
                                    </span>
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedRequest.motivo_alteracao}
                                    </p>
                                </div>
                            )
                        )}

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                        <TableHead className="text-xs font-bold">Cliente</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Tarifa Anterior</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Nova Tarifa (€)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedRequest.itens_solicitacao.map((item, i) => (
                                        <TableRow key={i} className="text-xs">
                                            <TableCell className="font-semibold">
                                                {item.worker_nome}
                                                {item.cod_colab && <span className="ml-2 text-[10px] font-mono text-muted-foreground">({item.cod_colab})</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{item.cliente_nombre || '-'}</TableCell>
                                            <TableCell className="text-right font-mono">€ {Number(item.tarifa_anterior).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-indigo-600">
                                                {isEditing ? (
                                                    <Input
                                                        type="text"
                                                        value={editTariffs[i] ?? Number(item.tarifa_nova).toFixed(2)}
                                                        onChange={(e) => setEditTariffs(prev => ({ ...prev, [i]: e.target.value }))}
                                                        className="h-7 w-24 text-right font-mono text-xs ml-auto"
                                                    />
                                                ) : (
                                                    `€ ${Number(item.tarifa_nova).toFixed(2)}`
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {isEditing && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs"
                                    disabled={isSavingEdit}
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancelar Edição
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5"
                                    disabled={isSavingEdit}
                                    onClick={handleSaveEdit}
                                >
                                    {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Salvar Alterações (Sem novo e-mail)
                                </Button>
                            </div>
                        )}

                        {selectedRequest.status === 'APROVADO' && selectedRequest.assinatura_base64 && (
                            <div className="p-4 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px]">
                                        Assinatura Eletrônica Registrada ({selectedRequest.tipo_assinatura || 'desenho'})
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        Assinado em{' '}
                                        {selectedRequest.assinado_em
                                            ? new Date(selectedRequest.assinado_em).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
                                            : ''}
                                    </span>
                                </div>
                                <div className="bg-white p-2 rounded border inline-block">
                                    <img
                                        src={selectedRequest.assinatura_base64}
                                        alt="Assinatura do autorizador"
                                        className="max-h-24 object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue="terms" className="flex-1 min-h-0 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-2 shrink-0 border-b">
                            <TabsList className="h-9">
                                <TabsTrigger value="terms" className="text-xs font-semibold gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                    Termos de Autorização ({requests?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="logs" className="text-xs font-semibold gap-1.5">
                                    <History className="w-3.5 h-3.5 text-slate-500" />
                                    Log de Auditoria ({logs?.length || 0})
                                </TabsTrigger>
                            </TabsList>

                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar termo, vigência, gerente, trabalhador..."
                                    className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* TAB 1: TERMOS DE AUTORIZAÇÃO */}
                        <TabsContent value="terms" className="flex-1 min-h-0 overflow-y-auto mt-2">
                            {loadingReqs ? (
                                <div className="flex items-center justify-center h-48 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                    <span className="text-xs text-muted-foreground">Carregando termos...</span>
                                </div>
                            ) : filteredRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground italic text-xs">
                                    <span>Nenhum termo de autorização encontrado.</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold w-[130px]">Código</TableHead>
                                            <TableHead className="text-xs font-bold">Emissão</TableHead>
                                            <TableHead className="text-xs font-bold">Vigência</TableHead>
                                            <TableHead className="text-xs font-bold">Solicitante</TableHead>
                                            <TableHead className="text-xs font-bold">Autorizador</TableHead>
                                            <TableHead className="text-xs font-bold">Trabalhador(es)</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Status</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRequests.map(req => {
                                            const isPending = req.status === 'PENDENTE';
                                            const isApproved = req.status === 'APROVADO';
                                            const isRejected = req.status === 'REJEITADO';
                                            const firstWorker = req.itens_solicitacao[0];
                                            const manageable = canManageRequest(req);

                                            return (
                                                <TableRow
                                                    key={req.id}
                                                    className="text-xs hover:bg-slate-50/70 cursor-pointer"
                                                    onClick={() => setSelectedRequest(req)}
                                                >
                                                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        {req.codigo_termo}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                        {new Date(req.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-semibold text-[10px] border-indigo-200 bg-indigo-50/70 text-indigo-700 whitespace-nowrap">
                                                            {formatMesVigenciaLabel(req.mes_vigencia)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                        {req.solicitante_nome}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                        {req.gerente_nome}
                                                    </TableCell>
                                                    <TableCell>
                                                        {firstWorker ? (
                                                            <div className="max-w-[190px]">
                                                                <div className="font-medium truncate">{firstWorker.worker_nome}</div>
                                                                <div className="text-[10px] font-mono text-muted-foreground">
                                                                    € {Number(firstWorker.tarifa_anterior).toFixed(2)} &rarr;{' '}
                                                                    <span className="font-bold text-indigo-600">€ {Number(firstWorker.tarifa_nova).toFixed(2)}</span>
                                                                    {req.itens_solicitacao.length > 1 && ` (+${req.itens_solicitacao.length - 1})`}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isPending ? (
                                                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[10px] gap-1">
                                                                <Clock className="w-3 h-3" /> PENDENTE
                                                            </Badge>
                                                        ) : isApproved ? (
                                                            <Badge className="bg-emerald-600 text-white font-semibold text-[10px] gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> APROVADO
                                                            </Badge>
                                                        ) : isRejected ? (
                                                            <Badge className="bg-rose-600 text-white font-semibold text-[10px] gap-1">
                                                                <XCircle className="w-3 h-3" /> NÃO AUTORIZADO
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {req.status}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-[11px] gap-1"
                                                                title="Visualizar detalhes"
                                                                onClick={() => {
                                                                    setIsEditing(false);
                                                                    setSelectedRequest(req);
                                                                }}
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                                            </Button>

                                                            {manageable && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 px-2 text-[11px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                                        title="Editar Vigência / Tarifa / Justificativa"
                                                                        onClick={() => startEditing(req)}
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 px-2 text-[11px] border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                        title="Excluir Termo Pendente"
                                                                        disabled={deletingId === req.id}
                                                                        onClick={(e) => handleDeleteRequest(req, e)}
                                                                    >
                                                                        {deletingId === req.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-[11px] border-slate-200 hover:bg-slate-100"
                                                                title="Copiar Link de Assinatura"
                                                                onClick={(e) => handleCopyLink(req.token_assinatura, req.url, e)}
                                                            >
                                                                {copiedToken === req.token_assinatura ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-[11px] text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                                                                title="Abrir Termo"
                                                                onClick={() => window.open(req.url, '_blank')}
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>

                        {/* TAB 2: LOG DE AUDITORIA */}
                        <TabsContent value="logs" className="flex-1 min-h-0 overflow-y-auto mt-2">
                            {loadingLogs ? (
                                <div className="flex items-center justify-center h-48 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                    <span className="text-xs text-muted-foreground">Carregando histórico...</span>
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground italic text-xs">
                                    <span>Nenhum registro de alteração de tarifa encontrado.</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold w-[130px]">Data / Vigência</TableHead>
                                            <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Anterior</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Nova</TableHead>
                                            <TableHead className="text-xs font-bold">Solicitado Por</TableHead>
                                            <TableHead className="text-xs font-bold">Autorizado Por</TableHead>
                                            <TableHead className="text-xs font-bold">Termo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.map(log => (
                                            <TableRow key={log.id} className="text-xs hover:bg-slate-50/50">
                                                <TableCell className="text-[11px]">
                                                    <div className="text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                    {log.mes_vigencia && (
                                                        <div className="font-semibold text-indigo-600">Vig.: {log.mes_vigencia}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                    <div>{log.worker_nome}</div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {log.cod_colab} • {log.cliente_nombre}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-slate-500">
                                                    € {Number(log.tarifa_anterior).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    € {Number(log.tarifa_nova).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                    {log.alterado_por_nome}
                                                </TableCell>
                                                <TableCell className="font-semibold text-indigo-700 dark:text-indigo-400">
                                                    {log.autorizado_por_nome}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50/50">
                                                        {log.codigo_termo}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
