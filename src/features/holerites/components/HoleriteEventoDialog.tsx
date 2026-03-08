import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es, pt } from 'date-fns/locale';
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import type { Worker } from '@/shared/types/corePersonal';
import type { HoleriteEvento, EventoTipo, EventoCategoria } from '@/shared/types/holerites';
import { useAddHoleriteEvento } from '../hooks/useAddHoleriteEvento';
import { useDeleteHoleriteEvento } from '../hooks/useDeleteHoleriteEvento';

const EVENTO_OPTIONS = {
    provento: [
        { value: 'bonus', label: 'Bônus / Premiação' },
        { value: 'adiantamento', label: 'Devolução de Adiantamento' },
        { value: 'outros', label: 'Outros Proventos' }
    ],
    desconto: [
        { value: 'adiantamento', label: 'Adiantamento Solicitado' },
        { value: 'multa_transito', label: 'Multa de Trânsito' },
        { value: 'sinistro_carro', label: 'Sinistro / Batida de Viatura' },
        { value: 'dias_faltas', label: 'Faltas Injustificadas' },
        { value: 'outros', label: 'Outros Descontos' }
    ]
};

const formSchema = z.object({
    tipo: z.enum(['provento', 'desconto']),
    categoria: z.enum(['adiantamento', 'multa_transito', 'sinistro_carro', 'dias_faltas', 'bonus', 'outros']),
    valor: z.coerce.number().min(0.01, { message: "O valor deve ser maior que zero." }),
    descricao: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface LançamentosSheetProps {
    worker: Worker;
    mesReferencia: string;
    eventosMensais: HoleriteEvento[];
    trigger: React.ReactNode;
}

export function HoleriteLancamentosSheet({ worker, mesReferencia, eventosMensais, trigger }: LançamentosSheetProps) {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language.startsWith('pt') ? pt : es;
    const [open, setOpen] = useState(false);

    const { mutate: addEvento, isPending: isAdding } = useAddHoleriteEvento();
    const { mutate: deleteEvento, isPending: isDeleting } = useDeleteHoleriteEvento();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            tipo: 'desconto',
            categoria: 'adiantamento',
            valor: 0,
            descricao: ''
        }
    });

    const isDebito = form.watch('tipo') === 'desconto';

    const onSubmit = (values: FormValues) => {
        addEvento({
            trabalhador_id: worker.id,
            empresa_id: worker.empresa_id,
            mes_referencia: mesReferencia,
            tipo: values.tipo as EventoTipo,
            categoria: values.categoria as EventoCategoria,
            valor: values.valor,
            descricao: values.descricao
        }, {
            onSuccess: () => {
                toast.success('Lançamento inserido com sucesso.');
                form.reset();
            },
            onError: (err) => {
                toast.error('Ocorreu um erro ao inserir o lançamento.');
                console.error(err);
            }
        });
    };

    const handleDelete = (eventoId: string) => {
        deleteEvento(eventoId, {
            onSuccess: () => toast.success('Lançamento removido.')
        });
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl">Lançamentos Eventuais</SheetTitle>
                    <SheetDescription>
                        Trabalhador: <strong>{worker.nome}</strong> <br />
                        Competência: <strong>{format(new Date(mesReferencia + '-02'), 'MMMM yyyy', { locale: currentLocale }).toUpperCase()}</strong>
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* NEW EVENT FORM */}
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-5">
                        <h3 className="font-semibold text-lg flex items-center mb-4">
                            <Plus className="mr-2 h-5 w-5 text-indigo-500" />
                            Novo Lançamento
                        </h3>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="tipo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Evento</FormLabel>
                                                <Select onValueChange={(val) => {
                                                    field.onChange(val);
                                                    // Auto select first option on type change
                                                    form.setValue('categoria', val === 'provento' ? 'bonus' : 'adiantamento');
                                                }} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className={isDebito ? 'border-red-200 focus:ring-red-500' : 'border-green-200 focus:ring-green-500'}>
                                                            <SelectValue placeholder="Selecione o tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="desconto" className="text-red-600 font-medium">Débito (Descontar)</SelectItem>
                                                        <SelectItem value="provento" className="text-green-600 font-medium">Crédito (Abonar)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="categoria"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoria</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Categoria" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {isDebito ? EVENTO_OPTIONS.desconto.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        )) : EVENTO_OPTIONS.provento.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="valor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor (€)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="descricao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição / Referência</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Multa Placa XYZ / Adiantamento Pix XYZ" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" disabled={isAdding} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                    Adicionar Lançamento
                                </Button>
                            </form>
                        </Form>
                    </div>

                    {/* HISTORY OF MONTH */}
                    <div>
                        <h4 className="font-semibold text-lg mb-4">Lançamentos do Mês</h4>
                        <div className="space-y-3">
                            {eventosMensais.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">Nenhum lançamento avulso neste mês.</p>
                            ) : (
                                eventosMensais.map(ev => {
                                    const isDebit = ev.tipo === 'desconto';
                                    return (
                                        <div key={ev.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-950">
                                            <div className="flex items-center space-x-3">
                                                {isDebit ?
                                                    <ArrowDownCircle className="text-red-500 h-8 w-8 opacity-80" /> :
                                                    <ArrowUpCircle className="text-green-500 h-8 w-8 opacity-80" />
                                                }
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {ev.categoria.replace('_', ' ').toUpperCase()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={ev.descricao || ''}>
                                                        {ev.descricao || 'Sem descrição'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className={`font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                                                    {isDebit ? '-' : '+'} € {ev.valor.toFixed(2)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    onClick={() => handleDelete(ev.id)}
                                                    disabled={isDeleting}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
