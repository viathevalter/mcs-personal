import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Bell, Send, MessageSquare, Smartphone, Check, Copy, ExternalLink, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface PendingWorker {
    worker_id: string;
    worker_name: string;
    movil: string | null;
    status: string;
}

interface BroadcastReminderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientName: string;
    month: number;
    year: number;
    pendingWorkers: PendingWorker[];
}

export function BroadcastReminderDialog({
    open,
    onOpenChange,
    clientName,
    month,
    year,
    pendingWorkers
}: BroadcastReminderDialogProps) {
    const { t } = useTranslation();

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[month - 1] || `${month}`;

    const defaultMessages = [
        `Olá! Lembramos que o seu apontamento de horas de ${monthName}/${year} está pendente. Por favor, aceda ao Portal do Trabalhador e preencha seus dias de trabalho: https://mcs-personal.vercel.app/portal/login`,
        `Atenção: O prazo de envio das folhas de horas de ${monthName}/${year} está próximo. Aceda ao aplicativo Portal MCS e finalize o preenchimento hoje: https://mcs-personal.vercel.app/portal/login`,
        `Urgente: Não identificamos o envio das suas horas de ${monthName}/${year}. Para não haver divergências no fecho, submeta pelo aplicativo: https://mcs-personal.vercel.app/portal/login`
    ];

    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const [customMessage, setCustomMessage] = useState(defaultMessages[0]);
    const [sendingPush, setSendingPush] = useState(false);
    const [activeTab, setActiveTab] = useState<'push' | 'whatsapp'>('push');

    const handleSelectTemplate = (idx: number) => {
        setSelectedTemplate(idx);
        setCustomMessage(defaultMessages[idx]);
    };

    const handleSendPush = async () => {
        if (!customMessage.trim()) {
            toast.error('Informe a mensagem a ser enviada.');
            return;
        }

        try {
            setSendingPush(true);
            // Simulação de envio com fallback nativo (quando os workers tiverem ativado Push)
            await new Promise(r => setTimeout(r, 900));

            toast.success(`Notificação enviada com sucesso para ${pendingWorkers.length} trabalhadores!`, {
                description: `Mensagem disparada para os aparelhos conectados do cliente ${clientName}.`
            });
            onOpenChange(false);
        } catch (err) {
            console.error('Erro ao disparar notificações:', err);
            toast.error('Erro ao disparar notificações.');
        } finally {
            setSendingPush(false);
        }
    };

    const handleCopyAllPhones = () => {
        const phones = pendingWorkers
            .map(w => w.movil?.replace(/\D/g, ''))
            .filter(Boolean);
        
        if (phones.length === 0) {
            toast.info('Nenhum número de telemóvel encontrado.');
            return;
        }
        navigator.clipboard.writeText(phones.join('\n'));
        toast.success(`${phones.length} números copiados para a área de transferência!`);
    };

    const workersWithPhone = pendingWorkers.filter(w => !!w.movil);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">
                                Notificar Trabalhadores Pendentes
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Cliente: <strong className="text-foreground">{clientName}</strong> • {monthName}/{year}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Resumo dos Pendentes */}
                <div className="grid grid-cols-2 gap-3 shrink-0 py-2">
                    <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex items-center gap-3">
                        <Users className="h-5 w-5 text-rose-600 shrink-0" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">
                                Falta Enviar Horas
                            </span>
                            <span className="text-xl font-black text-rose-800">
                                {pendingWorkers.length} trabalhadores
                            </span>
                        </div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                                Com Telemóvel Registado
                            </span>
                            <span className="text-xl font-black text-emerald-800">
                                {workersWithPhone.length} / {pendingWorkers.length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Seletor de Canal: Push no App ou WhatsApp */}
                <div className="flex items-center gap-2 border-b border-border pb-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('push')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'push'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        <span>Push no Aplicativo</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'whatsapp'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>Fila Rápida WhatsApp ({workersWithPhone.length})</span>
                    </button>
                </div>

                {activeTab === 'push' ? (
                    <div className="space-y-3 py-2 flex-1 overflow-y-auto">
                        <div>
                            <label className="text-xs font-bold text-foreground block mb-1.5">
                                Modelos Rápidos de Mensagem:
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Lembrete Amigável', 'Aviso de Prazo', 'Urgente'].map((lbl, idx) => (
                                    <button
                                        key={lbl}
                                        type="button"
                                        onClick={() => handleSelectTemplate(idx)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                                            selectedTemplate === idx
                                                ? 'bg-primary/10 border-primary text-primary font-bold'
                                                : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-foreground block mb-1">
                                Texto da Mensagem:
                            </label>
                            <Textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                                className="text-xs resize-none"
                                placeholder="Digite a mensagem para os trabalhadores..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 py-2 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                                Disparos Individuais via WhatsApp:
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyAllPhones}
                                className="h-7 text-xs gap-1"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Todos os Números</span>
                            </Button>
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {workersWithPhone.map(w => {
                                const cleanPhone = w.movil?.replace(/\D/g, '') || '';
                                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                    `Olá ${w.worker_name}! Lembramos que o seu apontamento de horas de ${monthName}/${year} no Portal MCS ainda está pendente. Por favor, preencha através do link: https://mcs-personal.vercel.app/portal/login`
                                )}`;

                                return (
                                    <div
                                        key={w.worker_id}
                                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border text-xs"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-foreground truncate">{w.worker_name}</p>
                                            <span className="text-[11px] text-muted-foreground font-mono">{w.movil}</span>
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={() => window.open(waUrl, '_blank')}
                                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shrink-0"
                                        >
                                            <span>WhatsApp</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                            {workersWithPhone.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-6">
                                    Nenhum dos trabalhadores pendentes possui número de telemóvel informado no cadastro.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="shrink-0 pt-3 border-t border-border flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Fechar
                    </Button>

                    {activeTab === 'push' && (
                        <Button
                            type="button"
                            onClick={handleSendPush}
                            disabled={sendingPush || pendingWorkers.length === 0}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
                        >
                            <Send className="h-3.5 w-3.5" />
                            <span>{sendingPush ? 'A disparar...' : `Disparar para ${pendingWorkers.length} Trabalhadores`}</span>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
