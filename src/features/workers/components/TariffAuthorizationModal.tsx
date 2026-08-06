import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Share2, Copy, Check, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Worker } from '@/shared/types/corePersonal';
import { createTariffAuthorizationRequest, type TariffItemRequest } from '../api/tariffGovernanceApi';
import { useAuth } from '@/app/providers/AuthProvider';

interface TariffAuthorizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workers: (Worker & { worker_beneficios_settings?: any })[];
    onSuccess?: () => void;
}

export function TariffAuthorizationModal({ open, onOpenChange, workers, onSuccess }: TariffAuthorizationModalProps) {
    const { user } = useAuth();
    
    const [solicitanteNome, setSolicitanteNome] = useState('');
    const [gerenteNome, setGerenteNome] = useState('');
    const [gerentePhone, setGerentePhone] = useState('');
    const [motivoAlteracao, setMotivoAlteracao] = useState('');
    
    // Map of worker_id -> proposed new tariff
    const [proposedTariffs, setProposedTariffs] = useState<Record<string, string>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<{ token: string; url: string; codigoTermo: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user?.email) {
            setSolicitanteNome(user.email.split('@')[0].toUpperCase());
        }
    }, [user]);

    useEffect(() => {
        if (workers && workers.length > 0) {
            const initialMap: Record<string, string> = {};
            workers.forEach(w => {
                const current = w.worker_beneficios_settings?.tarifa_hora ?? 0;
                initialMap[w.id] = Number(current).toFixed(2);
            });
            setProposedTariffs(initialMap);
        }
    }, [workers]);

    const handleTariffChange = (workerId: string, value: string) => {
        setProposedTariffs(prev => ({
            ...prev,
            [workerId]: value
        }));
    };

    const handleGenerateRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!solicitanteNome.trim()) {
            toast.error("Informe o nome do solicitante.");
            return;
        }

        if (!gerenteNome.trim()) {
            toast.error("Informe o nome do gerente autorizador.");
            return;
        }

        const items: TariffItemRequest[] = workers.map(w => {
            const currentTariff = Number(w.worker_beneficios_settings?.tarifa_hora || 0);
            const rawProposed = proposedTariffs[w.id] || '0';
            const newTariff = parseFloat(rawProposed.replace(',', '.')) || 0;

            return {
                worker_id: w.id,
                worker_nome: w.nome,
                cod_colab: w.cod_colab,
                cliente_nombre: w.cliente_nombre,
                tarifa_anterior: currentTariff,
                tarifa_nova: newTariff
            };
        });

        setIsSubmitting(true);
        try {
            const result = await createTariffAuthorizationRequest({
                solicitanteNome,
                gerenteNome,
                gerentePhone,
                motivoAlteracao,
                itens: items
            });

            setGeneratedResult({
                token: result.token,
                url: result.url,
                codigoTermo: result.request.codigo_termo
            });

            toast.success("Termo de Autorização criado com sucesso!");
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error("Error creating tariff authorization request:", err);
            toast.error("Erro ao gerar termo de autorização.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyLink = () => {
        if (!generatedResult) return;
        navigator.clipboard.writeText(generatedResult.url);
        setCopied(true);
        toast.success("Link de autorização copiado!");
        setTimeout(() => setCopied(false), 2500);
    };

    const handleSendWhatsApp = () => {
        if (!generatedResult) return;
        const msg = encodeURIComponent(
            `*MCS GLOBAL - Solicitação de Autorização de Tarifa*\n\n` +
            `Olá *${gerenteNome}*,\n` +
            `Foi solicitada uma alteração de tarifas para colaboradores (Termo *${generatedResult.codigoTermo}*).\n\n` +
            `Por favor, acesse o link abaixo para revisar e assinar a autorização:\n` +
            `${generatedResult.url}`
        );

        let whatsappUrl = `https://wa.me/?text=${msg}`;
        if (gerentePhone) {
            const cleanPhone = gerentePhone.replace(/\D/g, '');
            if (cleanPhone.length > 8) {
                whatsappUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
            }
        }

        window.open(whatsappUrl, '_blank');
    };

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            setGeneratedResult(null);
        }
        onOpenChange(newOpen);
    };

    if (!workers || workers.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        Solicitar Termo de Autorização de Tarifa
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Gere um termo com link de assinatura eletrônica para o gerente aprovar o reajuste das tarifas.
                    </DialogDescription>
                </DialogHeader>

                {generatedResult ? (
                    <div className="py-4 space-y-5">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-lg space-y-2 text-center">
                            <Badge className="bg-emerald-600 text-white font-mono text-xs">
                                Termo Gerado: {generatedResult.codigoTermo}
                            </Badge>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                Solicitação Criada com Sucesso!
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Envie o link abaixo para o gerente autorizador assinar eletronicamente. As tarifas serão aplicadas automaticamente após a assinatura.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Link Único de Assinatura Eletrônica:
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={generatedResult.url}
                                    className="text-xs font-mono bg-slate-50 dark:bg-slate-900"
                                />
                                <Button size="sm" onClick={handleCopyLink} variant="outline" className="shrink-0 gap-1.5 text-xs">
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button 
                                onClick={handleSendWhatsApp} 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold h-10"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Enviar via WhatsApp para Gerente
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => handleClose(false)} 
                                className="h-10 text-xs"
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleGenerateRequest} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Solicitante (Seu Nome)</Label>
                                <Input
                                    required
                                    value={solicitanteNome}
                                    onChange={(e) => setSolicitanteNome(e.target.value)}
                                    placeholder="Ex: Carlos Santos (RH)"
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Gerente Autorizador</Label>
                                <Input
                                    required
                                    value={gerenteNome}
                                    onChange={(e) => setGerenteNome(e.target.value)}
                                    placeholder="Ex: Rodrigo Silva (Diretor Operações)"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">WhatsApp do Gerente (Opcional)</Label>
                                <Input
                                    value={gerentePhone}
                                    onChange={(e) => setGerentePhone(e.target.value)}
                                    placeholder="+351 912 345 678"
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Justificativa / Motivo do Reajuste</Label>
                                <Input
                                    value={motivoAlteracao}
                                    onChange={(e) => setMotivoAlteracao(e.target.value)}
                                    placeholder="Ex: Reajuste anual acordado em contrato"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Workers Table with Proposed Tariffs */}
                        <div className="space-y-1.5 pt-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Definir Novas Tarifas Propostas ({workers.length} Colaborador(es)):
                            </Label>
                            <div className="border rounded-md max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold py-2">Trabalhador</TableHead>
                                            <TableHead className="text-xs font-bold py-2">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold py-2 text-right">Tarifa Atual</TableHead>
                                            <TableHead className="text-xs font-bold py-2 text-right w-[140px] text-indigo-700 dark:text-indigo-400">Nova Tarifa (€)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workers.map(w => {
                                            const currentTariff = Number(w.worker_beneficios_settings?.tarifa_hora || 0);

                                            return (
                                                <TableRow key={w.id} className="text-xs">
                                                    <TableCell className="py-2 font-medium">
                                                        <div>{w.nome}</div>
                                                        {w.cod_colab && <span className="text-[10px] text-muted-foreground font-mono">Cód: {w.cod_colab}</span>}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-muted-foreground">{w.cliente_nombre || '-'}</TableCell>
                                                    <TableCell className="py-2 text-right font-mono">€ {currentTariff.toFixed(2)}</TableCell>
                                                    <TableCell className="py-2 text-right">
                                                        <div className="relative inline-block w-28">
                                                            <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-mono">€</span>
                                                            <Input
                                                                type="text"
                                                                className="pl-6 h-8 text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 text-right"
                                                                value={proposedTariffs[w.id] || '0.00'}
                                                                onChange={(e) => handleTariffChange(w.id, e.target.value)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="h-9 text-xs">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Gerando Termo...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Gerar Termo & Link de Assinatura
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
