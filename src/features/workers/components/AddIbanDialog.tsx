import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useManageWorkerIban } from '../hooks/useManageWorkerIban';
import { useWorkerById } from '../hooks/useWorkerById';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ibanSchema = z.object({
    banco: z.string().min(2, 'O nome do banco é obrigatório'),
    iban: z.string().min(15, 'O IBAN deve ter pelo menos 15 caracteres'),
    observacoes: z.string().optional(),
    documentoFile: z.any().optional(),
});

type IbanFormValues = z.infer<typeof ibanSchema>;

interface AddIbanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
}

export function AddIbanDialog({ open, onOpenChange, workerId }: AddIbanDialogProps) {
    const { addIban, isAdding } = useManageWorkerIban();
    const { data: worker } = useWorkerById(workerId);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const form = useForm<IbanFormValues>({
        resolver: zodResolver(ibanSchema),
        defaultValues: {
            banco: '',
            iban: '',
            observacoes: '',
        }
    });

    const onSubmit = async (data: IbanFormValues) => {
        try {
            await addIban({
                worker_id: workerId,
                empresa_id: worker?.empresa_id || '',
                banco: data.banco,
                iban: data.iban,
                observacoes: data.observacoes || null,
                documentoFile: selectedFile
            });
            toast.success('Conta bancária registrada com sucesso');
            form.reset();
            setSelectedFile(null);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao registrar IBAN');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Nova Conta Bancária</DialogTitle>
                    <DialogDescription>
                        A conta anterior será automaticamente marcada como INATIVA. Faça o upload do termo de autorização assinado pelo trabalhador.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="banco"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Instituição Financeira (Banco)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Santander, Millenium, ActivoBank..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="iban"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>IBAN</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Escreva o número do IBAN (ex: PT50...)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="documentoFile"
                            render={({ field: { value, onChange, ...field } }) => (
                                <FormItem>
                                    <FormLabel>Termo de Autorização Assinado (PDF/Imagem)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setSelectedFile(e.target.files[0]);
                                                    onChange(e.target.files[0]);
                                                }
                                            }}
                                            {...field}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground mt-1">Este documento ficará anexado ao histórico (Módulo de Auditoria).</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações Internas (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Motivo da troca de conta..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                disabled={isAdding}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isAdding}>
                                {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Ativação
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
