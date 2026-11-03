import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Check, ShieldAlert, UserCheck, Calendar, FileText, AlertTriangle } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextObservationInput } from './RichTextObservationInput';
import { WorkerObservationTimelineModal } from './WorkerObservationTimelineModal';
import { useUpdateWorkerStatusUnified } from '../hooks/useWorkerStatus';

const STATUS_TRABALHO_OPTIONS = [
    { value: 'ATIVO', label: 'Ativo', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    { value: 'INATIVO', label: 'Inativo', badgeBg: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' },
    { value: 'PENDENTE INGRESSO', label: 'Pendente Ingresso', badgeBg: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    { value: 'AFASTADO', label: 'Afastado / Licença Saúde (Permanece Alojado)', badgeBg: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
    { value: 'DESLIGADO', label: 'Desligado', badgeBg: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    { value: 'DESISTIU', label: 'Desistiu', badgeBg: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' }
];

const STATUS_SEGURIDADE_OPTIONS = [
    { value: 'Alta', label: 'Alta', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    { value: 'Em Regularização', label: 'Em Regularização', badgeBg: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800' },
    { value: 'Pendente Alta', label: 'Pendente Alta', badgeBg: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    { value: 'Pendente Baixa', label: 'Pendente Baixa', badgeBg: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
    { value: 'Baixa', label: 'Baixa', badgeBg: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' }
];

const formSchema = z.object({
    statusTrabalhador: z.string().min(1, 'Selecione o status do trabalhador'),
    statusSeguridad: z.string().min(1, 'Selecione o status da seguridade social'),
    effectiveDate: z.string().min(1, 'A data efetiva é obrigatória'),
    comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkerStatusManagerDialogProps {
    workerId: string;
    currentTrabalhoStatus: string | null;
    currentSeguridadeStatus: string | null;
    workerName?: string;
    codColab?: string;
    defaultEffectiveDate?: string | null;
    defaultComments?: string | null;
    compact?: boolean;
    alertBanner?: string | null;
}

export function WorkerStatusManagerDialog({
    workerId,
    currentTrabalhoStatus,
    currentSeguridadeStatus,
    workerName,
    codColab,
    defaultEffectiveDate,
    defaultComments,
    compact = false,
    alertBanner
}: WorkerStatusManagerDialogProps) {
    const [open, setOpen] = useState(false);
    const [timelineOpen, setTimelineOpen] = useState(false);
    const { mutate: updateStatusUnified, isPending } = useUpdateWorkerStatusUnified();

    const initialTrab = (currentTrabalhoStatus || 'ATIVO').toUpperCase();
    const matchTrab = STATUS_TRABALHO_OPTIONS.find(o => o.value === initialTrab || o.label.toUpperCase() === initialTrab)?.value || 'ATIVO';

    const initialSeg = currentSeguridadeStatus || 'Em Regularização';
    const matchSeg = STATUS_SEGURIDADE_OPTIONS.find(o => o.value.toLowerCase() === initialSeg.toLowerCase())?.value || initialSeg;

    const resolvedDate = defaultEffectiveDate ? String(defaultEffectiveDate).slice(0, 10) : format(new Date(), 'yyyy-MM-dd');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            statusTrabalhador: matchTrab,
            statusSeguridad: matchSeg,
            effectiveDate: resolvedDate,
            comments: defaultComments || ''
        }
    });

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            form.reset({
                statusTrabalhador: matchTrab,
                statusSeguridad: matchSeg,
                effectiveDate: resolvedDate,
                comments: defaultComments || ''
            });
        }
    };

    const onSubmit = (values: FormValues) => {
        updateStatusUnified({
            workerId,
            statusTrabalhador: values.statusTrabalhador,
            statusSeguridad: values.statusSeguridad,
            effectiveDate: values.effectiveDate,
            comments: values.comments
        }, {
            onSuccess: () => {
                setOpen(false);
            }
        });
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {compact ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:text-primary/90 border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 shadow-xs gap-1"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Atualizar
                        </Button>
                    ) : (
                        <Button variant="outline" className="text-primary hover:text-primary/80 border-primary shadow-sm hover:shadow-md transition-all gap-2">
                            <UserCheck className="w-4 h-4" />
                            Mudar Status
                        </Button>
                    )}
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[780px] w-full max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader className="pb-2 border-b">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Alteração Unificada de Status do Trabalhador
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {workerName ? (
                                <span className="font-semibold text-foreground">
                                    {codColab ? `${codColab} • ` : ''}{workerName}
                                </span>
                            ) : (
                                'Selecione as novas opções para o Trabalhador e para a Seguridade Social simultaneamente em uma única ação.'
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {alertBanner && (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Atividade Operacional Pendente:</p>
                                <p className="mt-0.5">{alertBanner}</p>
                            </div>
                        </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
                            
                            {/* SEÇÃO PRINCIPAL LADO A LADO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* COLUNA 1: STATUS DO TRABALHADOR */}
                                <div className="flex flex-col gap-3 p-4 rounded-xl border bg-card shadow-sm">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-semibold text-sm">Status do Trabalhador</h3>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                            Atual: {currentTrabalhoStatus || 'N/A'}
                                        </span>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="statusTrabalhador"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-xs text-muted-foreground font-normal">
                                                    Escolha uma alternativa abaixo:
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {STATUS_TRABALHO_OPTIONS.map((opt) => {
                                                            const isSelected = field.value === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => field.onChange(opt.value)}
                                                                    className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all text-sm font-medium ${
                                                                        isSelected
                                                                            ? `${opt.badgeBg} border-primary shadow-sm font-bold scale-[1.01]`
                                                                            : 'border-transparent bg-muted/40 hover:bg-muted/70 text-foreground'
                                                                    }`}
                                                                >
                                                                    <span>{opt.label}</span>
                                                                    {isSelected && (
                                                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* COLUNA 2: STATUS DA SEGURIDADE SOCIAL */}
                                <div className="flex flex-col gap-3 p-4 rounded-xl border bg-card shadow-sm">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <h3 className="font-semibold text-sm">Segurança Social</h3>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                            Atual: {currentSeguridadeStatus || 'N/A'}
                                        </span>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="statusSeguridad"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-xs text-muted-foreground font-normal">
                                                    Escolha uma alternativa abaixo:
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {STATUS_SEGURIDADE_OPTIONS.map((opt) => {
                                                            const isSelected = field.value === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => field.onChange(opt.value)}
                                                                    className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all text-sm font-medium ${
                                                                        isSelected
                                                                            ? `${opt.badgeBg} border-primary shadow-sm font-bold scale-[1.01]`
                                                                            : 'border-transparent bg-muted/40 hover:bg-muted/70 text-foreground'
                                                                    }`}
                                                                >
                                                                    <span>{opt.label}</span>
                                                                    {isSelected && (
                                                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                            </div>

                            {/* CAMPOS COMPARTILHADOS: DATA E OBSERVAÇÕES */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                                <FormField
                                    control={form.control}
                                    name="effectiveDate"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-1">
                                            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                                Data Efetiva
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="date" className="h-10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="comments"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold justify-between">
                                                <span className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                                    Observações / Motivo (Opcional)
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-normal">Formatação & Alertas Disponíveis</span>
                                            </FormLabel>
                                            <FormControl>
                                                <RichTextObservationInput
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    placeholder="Ex: Atualização solicitada pela contabilidade, aviso da gerência, fim de obra..."
                                                    minHeight="min-h-[90px]"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* BOTÕES DE AÇÃO */}
                            <div className="flex items-center justify-between gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs font-medium gap-1.5"
                                    onClick={() => setTimelineOpen(true)}
                                >
                                    <FileText className="w-3.5 h-3.5 text-primary" /> Ver Timeline de Histórico
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={isPending} className="px-6 font-semibold shadow-md">
                                        {isPending ? 'Salvando...' : 'Salvar Ambos os Status'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
                
                {/* Timeline Dialog */}
                <WorkerObservationTimelineModal
                    open={timelineOpen}
                    onOpenChange={setTimelineOpen}
                    workerId={workerId}
                    workerName={workerName}
                    codColab={codColab}
                />
            </Dialog>
        </div>
    );
}
