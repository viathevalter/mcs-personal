import { useState, useEffect } from 'react';
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
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Edit2, Wallet, FileText, Download } from 'lucide-react';
import type { Worker } from '@/shared/types/corePersonal';
import { useUpdateWorker } from '../hooks/useUpdateWorker';
import { useWorkerBeneficios } from '../hooks/useWorkerBeneficios';
import { useWorkerBeneficiosHistory } from '../hooks/useWorkerBeneficiosHistory';
import { useUpdateWorkerBeneficios, type AuditPayload } from '../hooks/useUpdateWorkerBeneficios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
    // Beneficios fields
    iban: z.string().optional().nullable(),
    banco: z.string().optional().nullable(),
    tarifa_hora: z.coerce.number().min(0).default(0),
    recebe_auxilio_moradia: z.boolean().default(false),
    auxilio_moradia_base: z.coerce.number().min(0).default(300),
});

type FormValues = z.infer<typeof formSchema>;

interface EditWorkerDialogProps {
    worker: Worker;
}

export function EditWorkerDialog({ worker }: EditWorkerDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("basico");
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const { mutate: updateWorker, isPending: isUpdatingWorker } = useUpdateWorker();
    const { mutate: updateBeneficios, isPending: isUpdatingBeneficios } = useUpdateWorkerBeneficios();
    const { data: beneficios, isLoading: isLoadingBeneficios } = useWorkerBeneficios(worker.id);
    const { data: historyLogs, isLoading: isLoadingHistory } = useWorkerBeneficiosHistory(worker.id);

    const isPending = isUpdatingWorker || isUpdatingBeneficios; // We'll just track worker pending for the button state as it's the main action

    const form = useForm<FormValues>({
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
            iban: "",
            banco: "",
            tarifa_hora: 0,
            recebe_auxilio_moradia: false,
            auxilio_moradia_base: 300,
        },
    });

    // Sync fetched beneficios into form when loaded
    useEffect(() => {
        if (beneficios && open) {
            form.setValue('iban', beneficios.iban || "");
            form.setValue('banco', beneficios.banco || "");
            form.setValue('tarifa_hora', beneficios.tarifa_hora || 0);
            form.setValue('recebe_auxilio_moradia', beneficios.recebe_auxilio_moradia || false);
            form.setValue('auxilio_moradia_base', beneficios.auxilio_moradia_base ?? 300);
        }
    }, [beneficios, open, form]);

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
                iban: beneficios?.iban || "",
                banco: beneficios?.banco || "",
                tarifa_hora: beneficios?.tarifa_hora || 0,
                recebe_auxilio_moradia: beneficios?.recebe_auxilio_moradia || false,
                auxilio_moradia_base: beneficios?.auxilio_moradia_base ?? 300,
            });
            setActiveTab("basico");
            setDocumentFile(null);
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
                const audits: AuditPayload[] = [];
                const oldIban = beneficios?.iban || "";
                const newIban = values.iban || "";
                const oldTarifa = beneficios?.tarifa_hora || 0;
                const newTarifa = values.tarifa_hora || 0;

                if (newIban !== oldIban) {
                    if (!documentFile && newIban !== "") {
                        toast.error("Documento de autorização é obrigatório ao alterar o IBAN.");
                        return; // Stop here if no document
                    }
                    audits.push({
                        change_type: 'iban_update',
                        old_value: oldIban,
                        new_value: newIban,
                        documentFile: documentFile
                    });
                }

                if (newTarifa !== oldTarifa) {
                    audits.push({
                        change_type: 'tarifa_update',
                        old_value: oldTarifa.toString(),
                        new_value: newTarifa.toString()
                    });
                }

                updateBeneficios({
                    settings: {
                        worker_id: worker.id,
                        iban: values.iban || null,
                        banco: values.banco || null,
                        tarifa_hora: values.tarifa_hora,
                        recebe_auxilio_moradia: values.recebe_auxilio_moradia,
                        auxilio_moradia_base: values.auxilio_moradia_base
                    },
                    audits
                }, {
                    onSuccess: () => {
                        setOpen(false);
                        setDocumentFile(null);
                    }
                });
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
                                <TabsTrigger value="beneficios">
                                    <Wallet className="w-4 h-4 mr-2" />
                                    Benefícios & Folha
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

                            <TabsContent value="beneficios" className="space-y-4 mt-0">
                                {isLoadingBeneficios ? (
                                    <div className="flex justify-center items-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Dados Bancários</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="iban"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel>IBAN (Para Pagamentos)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: ES44 0182 4388 1902 0186" {...field} value={field.value || ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="banco"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel>Banco</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Santander / BBVA" {...field} value={field.value || ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                {form.watch('iban') !== (beneficios?.iban || "") && form.watch('iban') !== "" && (
                                                    <div className="md:col-span-2 space-y-2 p-4 bg-muted/50 rounded-lg border-l-4 border-warning">
                                                        <FormLabel className="flex items-center text-warning-foreground font-semibold">
                                                            <FileText className="w-4 h-4 mr-2" />
                                                            Autorização de Mudança de Conta
                                                        </FormLabel>
                                                        <p className="text-xs text-muted-foreground">O IBAN foi alterado. Faça o upload do documento assinado pelo trabalhador autorizando a mudança (PDF ou Imagem).</p>
                                                        <Input
                                                            type="file"
                                                            accept=".pdf,image/*"
                                                            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                                            className="cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Parâmetros de Holerite</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="tarifa_hora"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Tarifa Base (€ / Hora)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" step="0.01" placeholder="Ex: 10.50" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Auxílio Moradia</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="recebe_auxilio_moradia"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base">Mora em Alojamento Próprio</FormLabel>
                                                                <DialogDescription>
                                                                    Se ativo, o trabalhador receberá o auxílio moradia no holerite proporcional aos dias trabalhados.
                                                                </DialogDescription>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {form.watch('recebe_auxilio_moradia') && (
                                                    <FormField
                                                        control={form.control}
                                                        name="auxilio_moradia_base"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Valor Base Auxílio Moradia (€)</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" step="0.01" placeholder="300.00" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-4">Histórico de Alterações (IBAN & Tarifa)</h4>
                                            {isLoadingHistory ? (
                                                <div className="flex justify-center items-center py-4">
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : historyLogs && historyLogs.length > 0 ? (
                                                <div className="overflow-x-auto border rounded-md">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                                            <tr>
                                                                <th className="px-4 py-3">Data</th>
                                                                <th className="px-4 py-3">Tipo</th>
                                                                <th className="px-4 py-3">Anterior</th>
                                                                <th className="px-4 py-3">Novo</th>
                                                                <th className="px-4 py-3 text-center">Doc</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {historyLogs.map((log) => (
                                                                <tr key={log.id} className="hover:bg-muted/50">
                                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                                                                    </td>
                                                                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                                                                        {log.change_type === 'iban_update' ? 'IBAN' : 'Tarifa'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-muted-foreground max-w-[120px] truncate" title={log.old_value || '-'}>
                                                                        {log.old_value || '-'}
                                                                    </td>
                                                                    <td className="px-4 py-2 font-medium max-w-[120px] truncate" title={log.new_value || '-'}>
                                                                        {log.new_value || '-'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        {log.document_url ? (
                                                                            <Button variant="ghost" size="icon" asChild title="Abrir Documento">
                                                                                <a href={log.document_url} target="_blank" rel="noreferrer">
                                                                                    <Download className="w-4 h-4 text-primary" />
                                                                                </a>
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-muted-foreground text-xs">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-2">Nenhum histórico de alteração registrado.</p>
                                            )}
                                        </div>

                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>

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
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
