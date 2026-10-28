import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
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
import { Loader2, Edit2, Wallet, FileText, BadgeDollarSign, Plus, Trash2, Phone } from 'lucide-react';
import type { Worker } from '@/shared/types/corePersonal';
import { useUpdateWorker } from '../hooks/useUpdateWorker';
import { useTranslation } from 'react-i18next';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import { BenefitsTab, type BenefitsTabRef } from './BenefitsTab';
import { BankTab, type BankTabRef } from './BankTab';
import { DiscountsTab } from './tabs/DiscountsTab';
import { useJobFunctions } from '@/features/master-data/job-functions/hooks/useJobFunctions';

const formSchema = z.object({
    nome: z.string().min(3, { message: "O nome deve ter no mínimo 3 caracteres." }),
    email: z.string().email({ message: "Insira um email válido." }).or(z.literal("")),
    movil: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    niss: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    nif: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    nie: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    dni: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    pasaporte: z.string().max(50, { message: "No máximo 50 caracteres." }).nullable(),
    licencia_conducir: z.string().optional().nullable(),
    nacionalidade: z.string().optional().nullable(),
    fecha_nacimiento: z.string().optional().nullable(),
    nuss: z.string().max(30, { message: "No máximo 30 caracteres." }).nullable(),
    status_trabajador: z.string().optional().nullable(),
    status_seguridad: z.string().optional().nullable(),
    funcion: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditWorkerDialogProps {
    worker: Worker;
}

export function EditWorkerDialog({ worker }: EditWorkerDialogProps) {
    const { t } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("basico");
    const [extraPhones, setExtraPhones] = useState<string[]>(() =>
        Array.isArray(worker.telefones_adicionais) ? worker.telefones_adicionais.filter(Boolean) : []
    );
    const benefitsTabRef = useRef<BenefitsTabRef>(null);
    const bankTabRef = useRef<BankTabRef>(null);

    const { mutate: updateWorker, isPending: isUpdatingWorker } = useUpdateWorker();
    const isPending = isUpdatingWorker;

    const { data: jobFunctions = [] } = useJobFunctions(worker.empresa_id || selectedEmpresaId);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: worker.nome,
            email: worker.email || "",
            movil: worker.movil || "",
            niss: worker.niss || "",
            nif: worker.nif || "",
            nie: worker.nie || "",
            dni: worker.dni || "",
            pasaporte: worker.pasaporte || "",
            licencia_conducir: worker.licencia_conducir || "",
            nacionalidade: worker.nacionalidade || "",
            fecha_nacimiento: worker.fecha_nacimiento || "",
            nuss: worker.nuss || "",
            status_trabajador: worker.status_trabajador || "",
            status_seguridad: worker.status_seguridad || "",
            funcion: worker.funcion || "none",
        },
    });

    // Reset values when opened with new external props
    useEffect(() => {
        if (open) {
            form.reset({
                nome: worker.nome,
                email: worker.email || "",
                movil: worker.movil || "",
                niss: worker.niss || "",
                nif: worker.nif || "",
                nie: worker.nie || "",
                dni: worker.dni || "",
                pasaporte: worker.pasaporte || "",
                licencia_conducir: worker.licencia_conducir || "",
                nacionalidade: worker.nacionalidade || "",
                fecha_nacimiento: worker.fecha_nacimiento || "",
                nuss: worker.nuss || "",
                status_trabajador: worker.status_trabajador || "",
                status_seguridad: worker.status_seguridad || "",
                funcion: worker.funcion || "none",
            });
            setExtraPhones(
                Array.isArray(worker.telefones_adicionais)
                    ? worker.telefones_adicionais.filter(Boolean)
                    : []
            );
            setActiveTab("basico");
        }
    }, [open, worker, form]);

    const handleAddExtraPhone = () => {
        setExtraPhones((prev) => [...prev, ""]);
    };

    const handleChangeExtraPhone = (index: number, val: string) => {
        setExtraPhones((prev) => prev.map((p, idx) => (idx === index ? val : p)));
    };

    const handleRemoveExtraPhone = (index: number) => {
        setExtraPhones((prev) => prev.filter((_, idx) => idx !== index));
    };

    const onSubmit = (values: FormValues) => {
        const cleanedExtraPhones = Array.from(
            new Set(
                extraPhones
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0 && p !== (values.movil || "").trim())
            )
        );

        updateWorker({
            id: worker.id,
            nome: values.nome,
            email: values.email || null,
            movil: values.movil ? values.movil.trim() : null,
            telefones_adicionais: cleanedExtraPhones,
            niss: values.niss || null,
            nif: values.nif || null,
            nie: values.nie || null,
            dni: values.dni || null,
            pasaporte: values.pasaporte || null,
            licencia_conducir: values.licencia_conducir || null,
            nacionalidade: values.nacionalidade || null,
            fecha_nacimiento: values.fecha_nacimiento || null,
            nuss: values.nuss || null,
            foto: worker.foto || null,
            funcion: values.funcion === 'none' ? null : (values.funcion || null),
        }, {
            onSuccess: () => {
                if (activeTab === "beneficios" && benefitsTabRef.current) {
                    benefitsTabRef.current.save().then(() => {
                        toast.success(t('editWorker.messages.success'));
                        setOpen(false);
                    }).catch((err) => {
                        console.error('Failed to save benefits synchronously', err);
                        toast.error(err.message || 'Erro ao salvar benefícios');
                    });
                } else if (activeTab === "banco" && bankTabRef.current) {
                    bankTabRef.current.save().then(() => {
                        toast.success(t('editWorker.messages.success'));
                        setOpen(false);
                    }).catch((err) => {
                        console.error('Failed to save bank info synchronously', err);
                        toast.error(err.message || 'Erro ao salvar informações bancárias');
                    });
                } else {
                    toast.success(t('editWorker.messages.success'));
                    setOpen(false);
                }
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex" title={t('editWorker.btnTooltip')}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('editWorker.btnLabel')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] w-11/12 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('editWorker.title')}</DialogTitle>
                    <DialogDescription>
                        {t('editWorker.desc')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                                <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
                                <TabsTrigger value="banco">
                                    <Wallet className="w-4 h-4 mr-2" />
                                    Conta Corrente
                                </TabsTrigger>
                                <TabsTrigger value="beneficios">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Benefícios
                                </TabsTrigger>
                                <TabsTrigger value="descontos">
                                    <BadgeDollarSign className="w-4 h-4 mr-2" />
                                    Descontos
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="basico" className="space-y-4 mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nome"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-3">
                                                <FormLabel>{t('editWorker.fields.name')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.name')} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status_trabajador"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-1">
                                                <FormLabel>{t('editWorker.fields.workerStatus')}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('editWorker.placeholders.select')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Ativo">{t('editWorker.status.active')}</SelectItem>
                                                        <SelectItem value="Inativo">{t('editWorker.status.inactive')}</SelectItem>
                                                        <SelectItem value="Pendente Ingresso">{t('editWorker.status.pendingEntry')}</SelectItem>
                                                        <SelectItem value="AFASTADO">{t('editWorker.status.medicalLeave', 'Afastado / Licença Saúde')}</SelectItem>
                                                        <SelectItem value="Desligado">{t('editWorker.status.terminated', 'Desligado')}</SelectItem>
                                                        <SelectItem value="Desistiu">{t('editWorker.status.quit', 'Desistiu')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status_seguridad"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>{t('editWorker.fields.securityStatus')}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('editWorker.placeholders.select')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Alta">{t('editWorker.security.alta')}</SelectItem>
                                                        <SelectItem value="Pendente Alta">{t('editWorker.security.pendingAlta')}</SelectItem>
                                                        <SelectItem value="Em Regularização">Em Regularização</SelectItem>
                                                        <SelectItem value="Baixa">{t('editWorker.security.baixa')}</SelectItem>
                                                        <SelectItem value="Pendente Baixa">{t('editWorker.security.pendingBaixa')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="movil"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>{t('editWorker.fields.mobile')}</FormLabel>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddExtraPhone}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                                                        title="Adicionar outro número de telefone / WhatsApp (ex: número da Colômbia, Espanha, Portugal...)"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        + Telefone
                                                    </button>
                                                </div>
                                                <FormControl>
                                                    <Input placeholder="+34 600 000 000" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.email')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.email')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="funcion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.jobFunction')}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || 'none'} value={field.value || 'none'}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('editWorker.placeholders.selectJobFunction')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">{t('editWorker.placeholders.noJobFunction')}</SelectItem>
                                                        {jobFunctions.map((jf: any) => (
                                                            <SelectItem key={jf.id} value={jf.name}>
                                                                {jf.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {extraPhones.length > 0 && (
                                    <div className="rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                Telefones / WhatsApp Adicionais ({extraPhones.length})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleAddExtraPhone}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Adicionar mais um nº
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {extraPhones.map((phoneVal, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <Input
                                                        value={phoneVal}
                                                        onChange={(e) => handleChangeExtraPhone(idx, e.target.value)}
                                                        placeholder={`Ex: +57 313... ou +34 657... (Móvil ${idx + 2})`}
                                                        className="bg-white dark:bg-slate-900 h-9 text-sm"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveExtraPhone(idx)}
                                                        className="h-9 w-9 shrink-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                        title="Remover este número"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Quando o trabalhador enviar mensagem de qualquer um destes números no WhatsApp (MCS Chat), o sistema identificará automaticamente a ficha dele.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                    <FormField
                                        control={form.control}
                                        name="nacionalidade"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.nationality')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.nationality')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fecha_nacimiento"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.birthDate')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.birthDate')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">{t('editWorker.fields.docsPt')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="niss"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>NISS</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('editWorker.placeholders.niss')} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="nif"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>NIF</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('editWorker.placeholders.nif')} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">{t('editWorker.fields.docsEs')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="dni"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>DNI</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('editWorker.placeholders.dni')} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="nie"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>NIE</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('editWorker.placeholders.nie')} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="nuss"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>NUSS</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('editWorker.placeholders.nuss')} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                                    <FormField
                                        control={form.control}
                                        name="pasaporte"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.passport')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.passport')} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="licencia_conducir"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('editWorker.fields.driversLicense')}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('editWorker.placeholders.selectOption')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Si">{t('editWorker.options.yes')}</SelectItem>
                                                        <SelectItem value="No">{t('editWorker.options.no')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                            </TabsContent>

                            <TabsContent value="banco" className="space-y-4 mt-0">
                                <BankTab workerId={worker.id} ref={bankTabRef} />
                            </TabsContent>

                            <TabsContent value="beneficios" className="space-y-4 mt-0">
                                <div className="space-y-4">
                                    <BenefitsTab workerId={worker.id} empresaId={selectedEmpresaId || worker.empresa_id} isEmbedded={true} ref={benefitsTabRef} />
                                </div>
                            </TabsContent>

                            <TabsContent value="descontos" className="space-y-4 mt-0">
                                <DiscountsTab workerId={worker.id} empresaId={selectedEmpresaId || worker.empresa_id} isEmbedded={false} />
                            </TabsContent>
                        </Tabs>

                        {activeTab !== 'descontos' && (
                            <div className="flex justify-end space-x-2 pt-2 border-t mt-6">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        "Salvar"
                                    )}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
