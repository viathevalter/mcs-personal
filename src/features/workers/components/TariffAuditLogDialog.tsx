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
import { Loader2, History, ShieldCheck, UserCheck, Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { listWorkerTariffAuditLogs, type WorkerTariffAuditLog } from '../api/tariffGovernanceApi';

interface TariffAuditLogDialogProps {
    trigger?: React.ReactNode;
}

export function TariffAuditLogDialog({ trigger }: TariffAuditLogDialogProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: logs, isLoading } = useQuery({
        queryKey: ['tariff-audit-logs'],
        queryFn: listWorkerTariffAuditLogs,
        enabled: open,
        refetchOnWindowFocus: false
    });

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                        <History className="w-3.5 h-3.5 text-indigo-600" />
                        Histórico de Auditoria
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <History className="w-5 h-5 text-indigo-600" />
                        Histórico e Auditoria de Alterações de Tarifas
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Rastreabilidade completa de todas as tarifas autorizadas e alteradas no sistema MCS.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por colaborador, cliente, código do termo ou responsável..."
                            className="pl-8 h-9 text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md bg-white dark:bg-slate-900 mt-2">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="text-xs font-bold">Data & Hora</TableHead>
                                <TableHead className="text-xs font-bold">Termo</TableHead>
                                <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                <TableHead className="text-xs font-bold">Cliente</TableHead>
                                <TableHead className="text-xs font-bold text-right">Anterior</TableHead>
                                <TableHead className="text-xs font-bold text-right text-indigo-700 dark:text-indigo-400">Nova Tarifa</TableHead>
                                <TableHead className="text-xs font-bold">Solicitado Por</TableHead>
                                <TableHead className="text-xs font-bold">Autorizado Por</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-32">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                            <span className="text-xs text-muted-foreground">Carregando histórico de auditoria...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : !filteredLogs || filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground italic text-xs">
                                        Nenhum registro de auditoria encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => {
                                    const diff = Number(log.tarifa_nova) - Number(log.tarifa_anterior);

                                    return (
                                        <TableRow key={log.id} className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                                            <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] bg-indigo-50/50 border-indigo-200 text-indigo-700">
                                                    {log.codigo_termo || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-900 dark:text-white">
                                                <div>{log.worker_nome}</div>
                                                {log.cod_colab && <span className="text-[10px] text-muted-foreground font-mono">Cód: {log.cod_colab}</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{log.cliente_nombre || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-500">
                                                € {Number(log.tarifa_anterior).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                                € {Number(log.tarifa_nova).toFixed(2)}
                                                {diff !== 0 && (
                                                    <span className={`block text-[10px] font-normal ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        ({diff > 0 ? '+' : ''}€ {diff.toFixed(2)})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                                                {log.alterado_por_nome}
                                            </TableCell>
                                            <TableCell className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                                <div className="flex items-center gap-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                    {log.autorizado_por_nome}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
