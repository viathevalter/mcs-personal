import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobFunctions } from '@/features/master-data/job-functions/hooks/useJobFunctions';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  solicitud: any;
  target: any;
  onSuccess: () => void;
}

export function RequestReplacementFromBajaModal({
  isOpen,
  onClose,
  solicitud,
  target,
  onSuccess
}: Props) {
  const { t } = useTranslation();
  const empresaId = solicitud?.empresa_id;
  const { data: jobFunctions = [], isLoading: loadingFunctions } = useJobFunctions(empresaId);

  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');
  const [selectedFunctionName, setSelectedFunctionName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default function based on original worker
  useEffect(() => {
    if (target?.source_worker?.funcion && jobFunctions.length > 0) {
      const workerFunc = target.source_worker.funcion;
      const matched = jobFunctions.find(
        (jf: any) => jf.name.toLowerCase() === workerFunc.toLowerCase()
      );
      if (matched) {
        setSelectedFunctionId(matched.id);
        setSelectedFunctionName(matched.name);
      } else {
        setSelectedFunctionName(workerFunc);
      }
    }
  }, [target, jobFunctions]);

  const handleFunctionChange = (funcId: string) => {
    setSelectedFunctionId(funcId);
    const found = jobFunctions.find((jf: any) => jf.id === funcId);
    if (found) {
      setSelectedFunctionName(found.name);
    }
  };

  const handleSubmit = async () => {
    if (!target?.id) {
      toast.error('Alvo da solicitação não encontrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const workerName = target.source_worker?.nome || 'Trabalhador';
      const clientName = solicitud.client?.trade_name || solicitud.client?.legal_name || 'Cliente';

      // 1. Update solicitud_targets to set requires_replacement = true
      const { error: updErr } = await supabase
        .schema('core_operacoes')
        .from('solicitud_targets')
        .update({
          requires_replacement: true,
          target_job_function_id: selectedFunctionId || null,
          target_job_function_name: selectedFunctionName || target.source_worker?.funcion || 'Trabalhador',
          notes: notes ? `${target.notes || ''}\n[Reemplazo Solicitado]: ${notes}`.trim() : target.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', target.id);

      if (updErr) throw updErr;

      // 2. If a due_date was provided and solicitud due_date is empty, update it
      if (dueDate) {
        await supabase
          .schema('core_operacoes')
          .from('solicitudes_operativas')
          .update({
            due_date: new Date(dueDate).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', solicitud.id);
      }

      // 3. Add timeline entry
      await supabase
        .schema('core_operacoes')
        .from('solicitud_timeline')
        .insert({
          empresa_id: empresaId,
          solicitud_id: solicitud.id,
          event_type: 'note',
          title: 'Reemplazo Solicitado pelo Cliente',
          description: `O cliente ${clientName} solicitou a contratação de um substituto para ${workerName} (Função: ${selectedFunctionName || 'Mesma função'}).`,
          metadata: {
            action: 'request_replacement',
            target_job_function: selectedFunctionName,
            target_job_function_id: selectedFunctionId,
            due_date: dueDate || null,
            notes: notes || null
          },
          created_at: new Date().toISOString()
        });

      toast.success(t('solicitud_detail.replacement_modal.toast_success'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error requesting replacement:', err);
      toast.error(`${t('solicitud_detail.replacement_modal.toast_error')}: ${err.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const worker = target?.source_worker;
  const clientName = solicitud?.client?.trade_name || solicitud?.client?.legal_name || 'Cliente';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            {t('solicitud_detail.replacement_modal.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('solicitud_detail.replacement_modal.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-left">
          {/* Worker summary card */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {worker?.nome || t('solicitud_detail.replacement_modal.offboarded_worker')}
              </span>
              <span className="font-mono text-slate-500">ID: {worker?.cod_colab || 'N/A'}</span>
            </div>
            <div className="text-slate-500">
              {t('solicitud_detail.replacement_modal.client_label')} <strong className="text-slate-700 dark:text-slate-300">{clientName}</strong>
            </div>
            <div className="text-slate-500">
              {t('solicitud_detail.replacement_modal.original_role')} <strong className="text-slate-700 dark:text-slate-300">{worker?.funcion || 'N/A'}</strong>
            </div>
          </div>

          {/* Target job function */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {t('solicitud_detail.replacement_modal.target_role')} <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedFunctionId || ''}
              onValueChange={handleFunctionChange}
              disabled={loadingFunctions}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={loadingFunctions ? t('solicitud_detail.replacement_modal.loading_roles') : t('solicitud_detail.replacement_modal.select_role')} />
              </SelectTrigger>
              <SelectContent>
                {jobFunctions.map((jf: any) => (
                  <SelectItem key={jf.id} value={jf.id}>
                    {jf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t('solicitud_detail.replacement_modal.role_hint')}
            </p>
          </div>

          {/* Expected start date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {t('solicitud_detail.replacement_modal.expected_start')}
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {t('solicitud_detail.replacement_modal.notes_label')}
            </label>
            <Textarea
              placeholder={t('solicitud_detail.replacement_modal.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none min-h-[60px]"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('solicitud_detail.replacement_modal.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {t('solicitud_detail.replacement_modal.processing')}
              </>
            ) : (
              t('solicitud_detail.replacement_modal.confirm_btn')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
