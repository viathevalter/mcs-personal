import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useManageWorkerIban } from '../hooks/useManageWorkerIban';
import { toast } from 'sonner';
import { Loader2, Sparkles, Pencil } from 'lucide-react';
import { identifyBankFromIban, formatIban } from '@/shared/utils/ibanHelper';

const editIbanSchema = z.object({
    banco: z.string().min(2, 'O nome do banco é obrigatório'),
    iban: z.string().min(15, 'O IBAN deve ter pelo menos 15 caracteres'),
    observacoes: z.string().optional(),
});

type EditIbanFormValues = z.infer<typeof editIbanSchema>;

interface EditIbanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName?: string;
    ibanId?: string;
    initialIban: string;
    initialBanco: string;
    initialObservacoes?: string | null;
}

export function EditIbanDialog({
    open,
    onOpenChange,
    workerId,
    workerName,
    ibanId,
    initialIban,
    initialBanco,
    initialObservacoes,
}: EditIbanDialogProps) {
    const { editIban, isEditing } = useManageWorkerIban();

    const form = useForm<EditIbanFormValues>({
        resolver: zodResolver(editIbanSchema),
        defaultValues: {
            banco: initialBanco || '',
            iban: initialIban || '',
            observacoes: initialObservacoes || '',
        }
    });

    useEffect(() => {
        if (open) {
            form.reset({
                banco: initialBanco || '',
                iban: initialIban || '',
                observacoes: initialObservacoes || '',
            });
        }
    }, [open, initialBanco, initialIban, initialObservacoes, form]);

    const watchedIban = useWatch({ control: form.control, name: 'iban' });
    const identifiedBank = identifyBankFromIban(watchedIban || '');

    const handleIbanChange = (rawValue: string) => {
        const formatted = formatIban(rawValue);
        form.setValue('iban', formatted, { shouldValidate: true });

        const bankInfo = identifyBankFromIban(formatted);
        if (bankInfo) {
            form.setValue('banco', bankInfo.name, { shouldValidate: true });
        }
    };

    const onSubmit = async (data: EditIbanFormValues) => {
        try {
            await editIban({
                id: ibanId,
                worker_id: workerId,
                banco: data.banco,
                iban: data.iban,
                ...(initialObservacoes !== undefined ? { observacoes: data.observacoes || null } : {})
            });
            toast.success('IBAN corrigido com sucesso!');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar o IBAN');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-indigo-600" />
                        Corrigir Dados do IBAN Ativo
                    </DialogTitle>
                    <DialogDescription>
                        {workerName ? (
                            <span>Ajuste diretamente o número do IBAN ou banco de <strong>{workerName}</strong> sem gerar um novo registro inativo.</span>
                        ) : (
                            <span>Ajuste diretamente o número do IBAN ou nome do banco da conta ativa mantendo os documentos anexados.</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="iban"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número do IBAN</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ex: ES27 0182 0444..."
                                            value={field.value}
                                            onChange={(e) => handleIbanChange(e.target.value)}
                                            className="font-mono uppercase text-base"
                                        />
                                    </FormControl>
                                    {identifiedBank && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 mt-1">
                                            <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                                            <span>Banco identificado: {identifiedBank.name} ({identifiedBank.bic})</span>
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="banco"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Instituição Financeira (Banco)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: BBVA, Santander, CaixaBank, Nickel..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {initialObservacoes !== undefined && (
                            <FormField
                                control={form.control}
                                name="observacoes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observações Internas (Opcional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Observação ou nota de correção..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isEditing}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isEditing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isEditing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Correção
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
