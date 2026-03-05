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
import { Loader2, Edit2 } from 'lucide-react';
import type { Worker } from '@/shared/types/corePersonal';
import { useUpdateWorker } from '../hooks/useUpdateWorker';

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
    const [open, setOpen] = useState(false);
    const { mutate: updateWorker, isPending } = useUpdateWorker();

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
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex" title="Editar informações básicas">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar Perfil
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] w-11/12 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Trabalhador</DialogTitle>
                    <DialogDescription>
                        Preencha os dados abaixo para modificar as informações básicas do funcionário.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Nome Completo *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do trabalhador" {...field} />
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
                                        <FormLabel>Status Trabalhador</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Ativo">Ativo</SelectItem>
                                                <SelectItem value="Inativo">Inativo</SelectItem>
                                                <SelectItem value="Pendente Ingresso">Pendente Ingresso</SelectItem>
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
                                        <FormLabel>Status Seguridade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Alta">Alta</SelectItem>
                                                <SelectItem value="Pendente Alta">Pendente Alta</SelectItem>
                                                <SelectItem value="Baixa">Baixa</SelectItem>
                                                <SelectItem value="Pendente Baixa">Pendente Baixa</SelectItem>
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
                                        <FormLabel>Telemóvel</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+351 900 000 000" {...field} value={field.value || ''} />
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
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@exemplo.com" {...field} value={field.value || ''} />
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
                                        <FormLabel>Nacionalidade</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nacionalidade" {...field} value={field.value || ''} />
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
                                        <FormLabel>Data de Nascimento</FormLabel>
                                        <FormControl>
                                            <Input placeholder="DD/MM/AAAA" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Documentos Portugal</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="niss"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NISS</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nº NISS" {...field} value={field.value || ''} />
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
                                                <Input placeholder="Nº NIF" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Documentos Espanha</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dni"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>DNI</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nº DNI" {...field} value={field.value || ''} />
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
                                                <Input placeholder="Nº NIE" {...field} value={field.value || ''} />
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
                                                <Input placeholder="Nº NUSS" {...field} value={field.value || ''} />
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
                                        <FormLabel>Passaporte</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nº Passaporte" {...field} value={field.value || ''} />
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
                                        <FormLabel>Licença de Conduzir</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Si">Sim</SelectItem>
                                                <SelectItem value="No">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
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
                                    'Salvar'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
