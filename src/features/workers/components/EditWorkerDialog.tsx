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
import { Loader2, Edit2, Wallet, FileText, BadgeDollarSign } from 'lucide-react';
import type { Worker } from '@/shared/types/corePersonal';
import { useUpdateWorker } from '../hooks/useUpdateWorker';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BenefitsTab, type BenefitsTabRef } from './BenefitsTab';
import { BankTab, type BankTabRef } from './BankTab';
import { DiscountsTab } from './tabs/DiscountsTab';

const formSchema = z.object({
    nome: z.string().min(3, { message: "O nome deve ter no mínimo 3 caracteres." }),
    email: z.string().email({ message: "Insira um email válido." }).or(z.literal("")),
    movil: z.string().max(20, { message: "No máximo 20 caracteres." }).nullable(),
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
});

type FormValues = z.infer<typeof formSchema>;

interface EditWorkerDialogProps {
    worker: Worker;
}

export function EditWorkerDialog({ worker }: EditWorkerDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("basico");
    const benefitsTabRef = useRef<BenefitsTabRef>(null);
    const bankTabRef = useRef<BankTabRef>(null);

    const { mutate: updateWorker, isPending: isUpdatingWorker } = useUpdateWorker();
    const isPending = isUpdatingWorker;

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
            });
            setActiveTab("basico");
        }
    }, [open, worker, form]);

    const onSubmit = (values: FormValues) => {
        updateWorker({
            id: worker.id,
            nome: values.nome,
            email: values.email || null,
            movil: values.movil || null,
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
            status_trabajador: values.status_trabajador || null,
            status_seguridad: values.status_seguridad || null,
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
                                                <FormLabel>{t('editWorker.fields.mobile')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('editWorker.placeholders.mobile')} {...field} value={field.value || ''} />
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
                                </div>

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
                                    <BenefitsTab workerId={worker.id} empresaId={worker.empresa_id} isEmbedded={true} ref={benefitsTabRef} />
                                </div>
                            </TabsContent>

                            <TabsContent value="descontos" className="space-y-4 mt-0">
                                <DiscountsTab workerId={worker.id} empresaId={worker.empresa_id} isEmbedded={false} />
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
