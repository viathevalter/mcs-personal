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
import { DEFAULT_BENEFIT_CATEGORIES } from '@/features/settings/api/categoriesApi';
import React from 'react';
import { useDiscountCategories, useBenefitCategories } from '@/features/settings/hooks/useCategories';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

const formSchema = z.object({
    tipo: z.enum(['provento', 'desconto']),
    categoria: z.string().min(1, { message: "Selecione uma categoria" }),
    valor: z.coerce.number().min(0.01, { message: "O valor deve ser maior que zero." }),
    descricao: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface LançamentosSheetProps {
    worker: Worker;
    mesReferencia: string;
    eventosMensais: HoleriteEvento[];
    trigger: React.ReactNode;
    targetEmpresaName?: string;
    targetEmpresaId?: string;
    extraDiscounts?: any[];
    onDeleteDiscount?: (id: string) => void;
}

export function HoleriteLancamentosSheet({ 
    worker, 
    mesReferencia, 
    eventosMensais, 
    trigger,
    targetEmpresaName,
    targetEmpresaId,
    extraDiscounts = [],
    onDeleteDiscount
}: LançamentosSheetProps) {
    const { i18n } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const currentLocale = i18n.language.startsWith('pt') ? pt : es;
    const [open, setOpen] = useState(false);

    const { mutate: addEvento, isPending: isAdding } = useAddHoleriteEvento();
    const { mutate: deleteEvento, isPending: isDeleting } = useDeleteHoleriteEvento();
    const effectiveEmpresaId = targetEmpresaId || selectedEmpresaId || worker.empresa_id;
    const { data: discountCategories = [] } = useDiscountCategories(effectiveEmpresaId);
    const { data: benefitCategories = [] } = useBenefitCategories(effectiveEmpresaId);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            tipo: 'desconto',
            categoria: '',
            valor: 0,
            descricao: ''
        }
    });

    const activeBenefitOptions = React.useMemo(() => {
        const dbNames = benefitCategories.map(c => c.name);
        return Array.from(new Set([...DEFAULT_BENEFIT_CATEGORIES, ...dbNames]));
    }, [benefitCategories]);

    const isDebito = form.watch('tipo') === 'desconto';

    const onSubmit = (values: FormValues) => {
        const validEmpresaId = (targetEmpresaId && targetEmpresaId.length > 20)
            ? targetEmpresaId
            : (selectedEmpresaId && selectedEmpresaId.length > 20)
                ? selectedEmpresaId
                : (worker.empresa_id && worker.empresa_id.length > 20)
                    ? worker.empresa_id
                    : 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

        addEvento({
            trabalhador_id: worker.id,
            empresa_id: validEmpresaId,
            mes_referencia: mesReferencia,
            tipo: values.tipo as EventoTipo,
            categoria: values.categoria as EventoCategoria,
            valor: values.valor,
            descricao: values.descricao || 'Lançamento Manual'
        }, {
            onSuccess: () => {
                toast.success('Lançamento inserido com sucesso.');
                form.reset({
                    tipo: values.tipo,
                    categoria: '',
                    valor: 0,
                    descricao: ''
                });
            },
            onError: (err: any) => {
                toast.error(err?.message || 'Ocorreu um erro ao inserir o lançamento.');
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
                        {targetEmpresaName && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">
                                Empresa: {targetEmpresaName}
                            </span>
                        )}
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
                                                    form.setValue('categoria', ''); // Reset category when type changes
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
                                                        {isDebito ? discountCategories.map(opt => (
                                                            <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                                        )) : activeBenefitOptions.map(catName => (
                                                            <SelectItem key={catName} value={catName}>{catName}</SelectItem>
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
                            {eventosMensais.length === 0 && extraDiscounts.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">Nenhum lançamento avulso ou desconto registrado neste mês.</p>
                            ) : (
                                <>
                                    {eventosMensais.map(ev => {
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
                                                            {ev.categoria}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={ev.descricao || ''}>
                                                            {ev.descricao || 'Sem descrição'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <span className={`font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                                                        {isDebit ? '-' : '+'} € {Number(ev.valor).toFixed(2)}
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
                                        );
                                    })}

                                    {extraDiscounts.map(d => {
                                        return (
                                            <div key={d.id} className="flex items-center justify-between p-3 border border-red-100 rounded-lg bg-red-50/20 dark:bg-red-950/20">
                                                <div className="flex items-center space-x-3">
                                                    <ArrowDownCircle className="text-red-500 h-8 w-8 opacity-80" />
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                                {d.category || 'Desconto'}
                                                            </p>
                                                            <Badge variant="outline" className="text-[9px] py-0 px-1 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300 border-red-200">
                                                                Gestão Descontos
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={d.description || ''}>
                                                            {d.description || 'Lançado no Módulo de Descontos'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <span className="font-bold text-red-600">
                                                        - € {Number(d.amount).toFixed(2)}
                                                    </span>
                                                    {onDeleteDiscount && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                            onClick={() => onDeleteDiscount(d.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
