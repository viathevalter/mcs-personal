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
import { Loader2, History, ShieldCheck, Search, Copy, Check, MessageSquare, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { 
    listWorkerTariffAuditLogs, 
    listTariffAuthorizationRequests, 
    type WorkerTariffAuditLog, 
    type TariffAuthorizationRequest 
} from '../api/tariffGovernanceApi';
import { toast } from 'sonner';

interface TariffAuditLogDialogProps {
    trigger?: React.ReactNode;
}

export function TariffAuditLogDialog({ trigger }: TariffAuditLogDialogProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

    const filteredRequests = React.useMemo(() => {
        if (!requests) return [];
        if (!searchTerm.trim()) return requests;

        const term = searchTerm.toLowerCase();
        return requests.filter(r => 
            (r.codigo_termo && r.codigo_termo.toLowerCase().includes(term)) ||
            (r.solicitante_nome && r.solicitante_nome.toLowerCase().includes(term)) ||
            (r.gerente_nome && r.gerente_nome.toLowerCase().includes(term)) ||
            (r.status && r.status.toLowerCase().includes(term)) ||
            r.itens_solicitacao.some(i => i.worker_nome.toLowerCase().includes(term) || (i.cliente_nombre && i.cliente_nombre.toLowerCase().includes(term)))
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
        toast.success("Link do termo copiado!");
        setTimeout(() => setCopiedToken(null), 2500);
    };

    const handleSendWhatsApp = (req: TariffAuthorizationRequest & { url: string }, e: React.MouseEvent) => {
        e.stopPropagation();
        const msg = encodeURIComponent(
            `*MCS GLOBAL - Solicitação de Autorização de Tarifa*\n\n` +
            `Olá *${req.gerente_nome}*,\n` +
            `Segue o link para assinar eletronicamente o Termo *${req.codigo_termo}* (${req.itens_solicitacao.length} colaborador(es)):\n\n` +
            `${req.url}`
        );

        let whatsappUrl = `https://wa.me/?text=${msg}`;
        if (req.gerente_phone) {
            const cleanPhone = req.gerente_phone.replace(/\D/g, '');
            if (cleanPhone.length > 8) {
                whatsappUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
            }
        }
        window.open(whatsappUrl, '_blank');
    };

    const pendingCount = requests?.filter(r => r.status === 'PENDENTE').length || 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 relative">
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

            <DialogContent className="sm:max-w-[920px] max-h-[88vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 pr-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                            Governança & Termos de Autorização de Tarifas
                        </div>
                        {pendingCount > 0 && (
                            <Badge className="bg-amber-500 text-white font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {pendingCount} Termo(s) Aguardando Assinatura
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Acompanhe o status em tempo real dos termos enviados aos gerentes e o log de alterações de tarifas.
                    </DialogDescription>
                </DialogHeader>

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

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar termo, gerente, trabalhador..."
                                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* TAB 1: TERMOS DE AUTORIZAÇÃO E STATUS */}
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
                                        <TableHead className="text-xs font-bold w-[130px]">Código Termo</TableHead>
                                        <TableHead className="text-xs font-bold">Data Emissão</TableHead>
                                        <TableHead className="text-xs font-bold">Solicitante</TableHead>
                                        <TableHead className="text-xs font-bold">Gerente Autorizador</TableHead>
                                        <TableHead className="text-xs font-bold text-center">Itens</TableHead>
                                        <TableHead className="text-xs font-bold text-center">Status</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.map(req => {
                                        const isPending = req.status === 'PENDENTE';
                                        const isApproved = req.status === 'APROVADO';

                                        return (
                                            <TableRow key={req.id} className="text-xs hover:bg-slate-50/50">
                                                <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                    {req.codigo_termo}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-[11px]">
                                                    {new Date(req.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                    {req.solicitante_nome}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                    {req.gerente_nome}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {req.itens_solicitacao.length} trab.
                                                    </Badge>
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
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {req.status}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
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

                                                        {isPending && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                                title="Reenviar via WhatsApp"
                                                                onClick={(e) => handleSendWhatsApp(req, e)}
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                                            </Button>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 gap-1 font-medium"
                                                            onClick={() => window.open(req.url, '_blank')}
                                                        >
                                                            <ExternalLink className="w-3 h-3 text-indigo-600" />
                                                            Ver Termo
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

                    {/* TAB 2: AUDIT LOGS HISTORICO */}
                    <TabsContent value="logs" className="flex-1 min-h-0 overflow-y-auto mt-2">
                        {loadingLogs ? (
                            <div className="flex items-center justify-center h-48 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                <span className="text-xs text-muted-foreground">Carregando logs de auditoria...</span>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground italic text-xs">
                                <span>Nenhum log de alteração encontrado.</span>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Data / Hora</TableHead>
                                        <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                        <TableHead className="text-xs font-bold">Cliente</TableHead>
                                        <TableHead className="text-xs font-bold text-right">Tarifa Anterior</TableHead>
                                        <TableHead className="text-xs font-bold text-right text-emerald-600">Nova Tarifa</TableHead>
                                        <TableHead className="text-xs font-bold">Solicitante</TableHead>
                                        <TableHead className="text-xs font-bold">Gerente Autorizador</TableHead>
                                        <TableHead className="text-xs font-bold">Termo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map(log => (
                                        <TableRow key={log.id} className="text-xs hover:bg-slate-50/50">
                                            <TableCell className="text-muted-foreground text-[11px]">
                                                {new Date(log.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                {log.worker_nome}
                                                {log.cod_colab && <span className="text-[10px] text-muted-foreground block font-mono">Cód: {log.cod_colab}</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{log.cliente_nombre || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-500">€ {Number(log.tarifa_anterior).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-emerald-600">€ {Number(log.tarifa_nova).toFixed(2)}</TableCell>
                                            <TableCell className="text-slate-800 dark:text-slate-200">{log.alterado_por_nome}</TableCell>
                                            <TableCell className="text-slate-800 dark:text-slate-200 font-semibold">{log.autorizado_por_nome}</TableCell>
                                            <TableCell className="font-mono text-[11px] text-indigo-600 font-medium">{log.codigo_termo || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
