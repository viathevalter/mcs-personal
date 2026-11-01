import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';

interface AdminNotesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    periodYear: number;
    periodMonth: number;
    existingNote: string | null;
    hourRecordId: string | null;
    clientName?: string;
    contratante?: string;
    onSuccess: () => void;
}

export function AdminNotesDialog({
    open,
    onOpenChange,
    workerId,
    workerName,
    periodYear,
    periodMonth,
    existingNote,
    hourRecordId,
    clientName,
    contratante,
    onSuccess
}: AdminNotesDialogProps) {
    const { t } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const [note, setNote] = useState(existingNote || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setNote(existingNote || '');
        }
    }, [open, existingNote]);

    const handleSave = async () => {
        if (!selectedEmpresaId) return;

        try {
            setLoading(true);

            if (hourRecordId) {
                const updatePayload: Record<string, any> = {
                    observacoes: note,
                    updated_at: new Date().toISOString()
                };
                if (clientName && clientName.trim() !== '') {
                    updatePayload.cliente_nombre = clientName.trim();
                }
                if (contratante && contratante.trim() !== '') {
                    updatePayload.contratante = contratante.trim();
                }
                const { error } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .update(updatePayload)
                    .eq('id', hourRecordId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .insert({
                        empresa_id: selectedEmpresaId,
                        worker_id: workerId,
                        period_year: periodYear,
                        period_month: periodMonth,
                        status: 'pendente',
                        observacoes: note,
                        cliente_nombre: clientName && clientName.trim() !== '' ? clientName.trim() : 'NÃO DEFINIDO',
                        contratante: contratante && contratante.trim() !== '' ? contratante.trim() : null
                    });

                if (error) throw error;
            }

            toast.success(t('clientHoursDetail.messages.noteSaved', 'Anotação salva com sucesso'));
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error(t('clientHoursDetail.messages.noteSaveError', 'Erro ao salvar anotação'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>{t('clientHoursDetail.notesDialog.title')}</span>
                        <span className="text-xs px-2 py-0.5 font-normal rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            {t('clientHoursDetail.notesDialog.badge')}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {t('clientHoursDetail.notesDialog.desc', {
                            name: workerName,
                            month: periodMonth,
                            year: periodYear
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t('clientHoursDetail.notesDialog.placeholder')}
                        className="min-h-[120px] resize-none"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('common.cancel', 'Cancelar')}
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Salvar')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
