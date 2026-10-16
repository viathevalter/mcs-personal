import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Calendar, Save, Loader2, AlertCircle, CheckCircle2, Mail, RotateCcw, Building2, Home } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { formatDateClean } from '@/shared/utils/dateUtils';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useSolicitudTargets } from '../hooks/useSolicitudTargets';
import type { SolicitudDetail } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    solicitud: SolicitudDetail;
    onSuccess?: (result?: { oldDueDate?: string | null; newDueDate?: string | null; openEmailModal?: boolean }) => void;
}

function toInputDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

export function EditSolicitudModal({ isOpen, onClose, solicitud, onSuccess }: Props) {
    const { data: targets = [] } = useSolicitudTargets(solicitud?.id);
    const firstTarget = targets[0];

    const { data: clients = [] } = useClients();

    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [dueDate, setDueDate] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    // Relocation specific fields
    const [targetClientId, setTargetClientId] = useState<string>('all');
    const [targetClientSiteId, setTargetClientSiteId] = useState<string>('all');
    const { data: targetClientSites = [] } = useClientSites(targetClientId !== 'all' ? targetClientId : undefined);
    const [requiresHousing, setRequiresHousing] = useState(false);
    const [housingStartDate, setHousingStartDate] = useState('');
    const [housingEndDate, setHousingEndDate] = useState('');

    // Playbook & Email options
    const [reopenCompletedTasks, setReopenCompletedTasks] = useState(false);
    const [openEmailAfterSave, setOpenEmailAfterSave] = useState(true);
    const [saving, setSaving] = useState(false);

    const originalDueDate = useMemo(() => {
        return toInputDate(
            solicitud?.due_date ||
            firstTarget?.housing_start_date ||
            solicitud?.pedido?.fecha_inicio_pedido ||
            ''
        );
    }, [solicitud, firstTarget]);

    useEffect(() => {
        if (!isOpen || !solicitud) return;

        const initDate = toInputDate(
            solicitud.due_date ||
            firstTarget?.housing_start_date ||
            solicitud.pedido?.fecha_inicio_pedido ||
            ''
        );

        setTitle(solicitud.title || '');
        setPriority(solicitud.priority || 'normal');
        setDueDate(initDate);
        setReason((solicitud as any).reason || firstTarget?.reason || '');
        setNotes(firstTarget?.notes || solicitud.description || '');

        const resolvedClientId = solicitud.client?.id || (solicitud as any).client_id || firstTarget?.target_client_id || 'all';
        const resolvedSiteId = solicitud.client_site?.id || (solicitud as any).client_site_id || firstTarget?.target_client_site_id || 'all';

        setTargetClientId(resolvedClientId);
        setTargetClientSiteId(resolvedSiteId);
        setRequiresHousing(Boolean(firstTarget?.requires_housing));
        setHousingStartDate(toInputDate(firstTarget?.housing_start_date) || initDate);
        setHousingEndDate(toInputDate(firstTarget?.housing_end_date));
        setReopenCompletedTasks(false);
        setOpenEmailAfterSave(true);
    }, [isOpen, solicitud, firstTarget]);

    const clientOptions = useMemo(() => {
        const list = clients
            .filter(c => c.status !== 'inactive' || c.id === targetClientId)
            .map(c => ({
                value: c.id || '',
                label: c.trade_name || c.legal_name || ''
            }))
            .filter(c => c.value && c.label);

        return [
            { value: 'all', label: 'Selecione o Cliente' },
            ...list
        ];
    }, [clients, targetClientId]);

    const dateDiffInfo = useMemo(() => {
        if (!originalDueDate || !dueDate) return null;
        const [y1, m1, d1] = originalDueDate.split('-').map(Number);
        const [y2, m2, d2] = dueDate.split('-').map(Number);
        if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;

        const origTime = Date.UTC(y1, m1 - 1, d1);
        const newTime = Date.UTC(y2, m2 - 1, d2);
        const diffDays = Math.round((newTime - origTime) / (1000 * 60 * 60 * 24));

        return {
            diffDays,
            changed: diffDays !== 0,
            originalFormatted: formatDateClean(originalDueDate),
            newFormatted: formatDateClean(dueDate)
        };
    }, [originalDueDate, dueDate]);

    const handleDueDateChange = (newVal: string) => {
        const prevDue = dueDate;
        setDueDate(newVal);
        // Se for reubicação com alojamento e a data de início do alojamento acompanhava a data de início, sincroniza
        if (solicitud.tipo === 'relocation' && requiresHousing && (!housingStartDate || housingStartDate === prevDue)) {
            setHousingStartDate(newVal);
        }
    };

    const getDateFieldLabel = () => {
        switch (solicitud.tipo) {
            case 'relocation':
                return 'Data de Início da Reubicación (Realocação)';
            case 'replacement':
                return 'Data de Início do Reemplazo (Substituição)';
            case 'offboarding':
            case 'worker_resignation':
                return 'Data Efetiva da Baixa (Saída)';
            case 'order_extension':
                return 'Nova Data de Término (Prorrogação da Obra)';
            case 'order_termination':
                return 'Data de Encerramento da Obra';
            case 'order_postponement':
                return 'Nova Data de Início Programada';
            default:
                return 'Data Prevista / Programada da Operação';
        }
    };

    const handleSave = async () => {
        if (!dueDate && solicitud.tipo !== 'order_pause') {
            toast.error('Informe a data programada da operação.');
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, any> = {
                solicitud_id: solicitud.id,
                title: title.trim() || solicitud.title,
                priority,
                due_date: dueDate || null,
                reason: reason.trim(),
                notes: notes.trim(),
                reopen_completed_tasks: reopenCompletedTasks
            };

            if (solicitud.tipo === 'relocation') {
                payload.client_id = targetClientId !== 'all' ? targetClientId : null;
                payload.client_site_id = targetClientSiteId !== 'all' ? targetClientSiteId : null;
                payload.requires_housing = requiresHousing;
                payload.housing_start_date = requiresHousing && housingStartDate ? housingStartDate : null;
                payload.housing_end_date = requiresHousing && housingEndDate ? housingEndDate : null;
            }

            let { data, error } = await supabase.rpc('atualizar_solicitud_operativa', { payload });
            if (error) {
                const retry = await supabase.schema('core_operacoes').rpc('atualizar_solicitud_operativa', { payload });
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;

            toast.success('Operação atualizada com sucesso!', {
                description: dateDiffInfo?.changed
                    ? `Data alterada de ${dateDiffInfo.originalFormatted} para ${dateDiffInfo.newFormatted}.`
                    : 'Os dados operacionais foram salvos e sincronizados.'
            });

            onClose();
            if (onSuccess) {
                onSuccess({
                    oldDueDate: originalDueDate,
                    newDueDate: dueDate,
                    openEmailModal: openEmailAfterSave
                });
            }
        } catch (err: any) {
            console.error('Erro ao atualizar solicitação:', err);
            toast.error('Erro ao salvar alterações', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[650px] max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-850 dark:text-slate-100">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        Editar Operação / Alterar Data ({solicitud.codigo})
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Altere ou prorrogue a data programada, ajuste detalhes operacionais e notifique os setores sem interromper o fluxo do Playbook.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-left">
                    {/* Data Principal + Prioridade */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                                {getDateFieldLabel()} <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleDueDateChange(e.target.value)}
                                className="h-10 text-sm font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 focus-visible:ring-amber-500"
                            />
                            {originalDueDate && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                    Data atual registrada: <strong>{formatDateClean(originalDueDate)}</strong>
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                Prioridade
                            </label>
                            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                <SelectTrigger className="h-10 text-xs font-semibold bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="Prioridade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baixa (Low)</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">Alta (High)</SelectItem>
                                    <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dateDiffInfo && dateDiffInfo.changed && (
                            <div className="md:col-span-3 pt-1">
                                <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                                    dateDiffInfo.diffDays > 0
                                        ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                }`}>
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>
                                        {dateDiffInfo.diffDays > 0
                                            ? `Prorrogação / Adiamento de +${dateDiffInfo.diffDays} dia(s): de ${dateDiffInfo.originalFormatted} para ${dateDiffInfo.newFormatted}.`
                                            : `Antecipação de ${Math.abs(dateDiffInfo.diffDays)} dia(s): de ${dateDiffInfo.originalFormatted} para ${dateDiffInfo.newFormatted}.`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Campos específicos de Reubicación (Destino e Alojamento) */}
                    {solicitud.tipo === 'relocation' && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                <Building2 className="h-4 w-4" />
                                Destino e Logística da Reubicación
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cliente de Destino</label>
                                    <Combobox
                                        options={clientOptions}
                                        value={targetClientId === 'all' ? null : targetClientId}
                                        onChange={(val) => {
                                            setTargetClientId(val || 'all');
                                            setTargetClientSiteId('all');
                                        }}
                                        placeholder="Selecione o Cliente"
                                        emptyText="Nenhum cliente encontrado."
                                        className="h-9 text-xs bg-white dark:bg-slate-900"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Obra / Local de Destino</label>
                                    <Select
                                        value={targetClientSiteId}
                                        onValueChange={setTargetClientSiteId}
                                        disabled={targetClientId === 'all'}
                                    >
                                        <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                                            <SelectValue placeholder="Selecione a Obra" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Local não definido</SelectItem>
                                            {targetClientSites.map(s => (
                                                <SelectItem key={s.id} value={s.id || ''}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-1 space-y-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={requiresHousing}
                                        onChange={(e) => setRequiresHousing(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Home className="h-3.5 w-3.5 text-slate-500" />
                                    Necessita de Alojamento no Destino?
                                </label>

                                {requiresHousing && (
                                    <div className="grid grid-cols-2 gap-3 pl-6 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-medium text-slate-500">Início do Alojamento</label>
                                            <Input
                                                type="date"
                                                value={housingStartDate}
                                                onChange={(e) => setHousingStartDate(e.target.value)}
                                                className="h-8 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-medium text-slate-500">Fim do Alojamento (Opcional)</label>
                                            <Input
                                                type="date"
                                                value={housingEndDate}
                                                onChange={(e) => setHousingEndDate(e.target.value)}
                                                className="h-8 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Título */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                            Título da Operação
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-9 text-xs font-medium"
                        />
                    </div>

                    {/* Motivo e Observações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                Motivo da Solicitação / Alteração
                            </label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Cliente solicitou prorrogação do início de 23/10 para 30/10..."
                                rows={3}
                                className="text-xs resize-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                Observações Extras / Descrição
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observações adicionais para RH, Logística e Documentação..."
                                rows={3}
                                className="text-xs resize-none"
                            />
                        </div>
                    </div>

                    {/* Opções de Playbook e E-mail */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium pb-1.5 border-b border-slate-200/70 dark:border-slate-800">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>Playbook Protegido:</strong> As tarefas pendentes ou em andamento continuarão ativas normalmente e terão a nova data sincronizada automaticamente nas alocações e na Linha do Tempo.
                            </span>
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={reopenCompletedTasks}
                                onChange={(e) => setReopenCompletedTasks(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                            />
                            <div className="text-xs">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                                    Reabrir tarefas já concluídas do Playbook para revisão dos setores
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                    Marque se algum setor (ex: Logística/Alojamento ou Seguridade) já concluiu sua tarefa na data antiga e precisa reajustar para a nova data.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={openEmailAfterSave}
                                onChange={(e) => setOpenEmailAfterSave(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                            />
                            <div className="text-xs">
                                <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    Abrir envio de e-mail de atualização após salvar
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                    Abre automaticamente o e-mail preenchido com o aviso de alteração/prorrogação de data para notificar toda a equipe.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
