import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChangeWorkerStatus } from '../hooks/useWorkerStatus';

const STATUS_TRABALHO_OPTIONS = [
    'ATIVO',
    'INATIVO',
    'DESLIGADO',
    'AFASTADO',
    'PENDENTE INGRESSO'
];

const STATUS_SEGURIDADE_OPTIONS = [
    'Alta',
    'Baixa',
    'Pendente Alta',
    'Pendente Baixa',
    'Em Regularização'
];

const formSchema = z.object({
    changeType: z.enum(['TRABALHADOR', 'SEGURIDADE']),
    newValue: z.string().min(1, 'Selecione o novo status'),
    effectiveDate: z.string().min(1, 'A data efetiva é obrigatória'),
    comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkerStatusManagerDialogProps {
    workerId: string;
    currentTrabalhoStatus: string | null;
    currentSeguridadeStatus: string | null;
}

export function WorkerStatusManagerDialog({
    workerId,
    currentTrabalhoStatus,
    currentSeguridadeStatus
}: WorkerStatusManagerDialogProps) {
    const [open, setOpen] = useState(false);
    const { mutate: changeStatus, isPending } = useChangeWorkerStatus();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            changeType: 'TRABALHADOR',
            newValue: currentTrabalhoStatus || 'ATIVO',
            effectiveDate: format(new Date(), 'yyyy-MM-dd'),
            comments: ''
        }
    });

    const watchChangeType = form.watch('changeType');
    
    // Dynamically set options based on type
    const isSeguridade = watchChangeType === 'SEGURIDADE';
    const options = isSeguridade ? STATUS_SEGURIDADE_OPTIONS : STATUS_TRABALHO_OPTIONS;

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            form.reset({
                changeType: 'TRABALHADOR',
                newValue: currentTrabalhoStatus || 'ATIVO',
                effectiveDate: format(new Date(), 'yyyy-MM-dd'),
                comments: ''
            });
        }
    };

    const onSubmit = (values: FormValues) => {
        changeStatus({
            workerId,
            changeType: values.changeType,
            newValue: values.newValue,
            effectiveDate: values.effectiveDate,
            comments: values.comments
        }, {
            onSuccess: () => {
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-primary hover:text-primary/80 border-primary shadow-sm hover:shadow-md transition-all">
                    Mudar Status
                </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mudar Status do Trabalhador</DialogTitle>
                </DialogHeader>

                <div className="bg-muted p-3 my-2 rounded-md border text-sm flex gap-4">
                    <div>
                        <span className="text-muted-foreground block text-xs">Status Atual (Trabalhador)</span>
                        <span className="font-semibold">{currentTrabalhoStatus || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block text-xs">Status Atual (Seguridade)</span>
                        <span className="font-semibold">{currentSeguridadeStatus || 'N/A'}</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="changeType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>O que deseja alterar?</FormLabel>
                                    <Select 
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            // Reset the value when changing types
                                            form.setValue('newValue', val === 'SEGURIDADE' ? (currentSeguridadeStatus || 'Alta') : (currentTrabalhoStatus || 'ATIVO'));
                                        }} 
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="TRABALHADOR">Status do Trabalhador</SelectItem>
                                            <SelectItem value="SEGURIDADE">Status da Seguridade Social</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Novo Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {options.map((opt) => (
                                                <SelectItem key={opt} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="effectiveDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data Efetiva {isSeguridade && watchChangeType === 'SEGURIDADE' ? '(Ex: Data da Baixa Médica)' : '(Ex: Último dia de trabalho)'}</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="comments"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações / Motivo</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Ex: Fim do contrato, Rescisão por justa causa, Licença Médica, etc." 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Salvando...' : 'Salvar Novo Status'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
