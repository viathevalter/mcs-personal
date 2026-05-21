import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Epi, CreateEpiDTO } from '../types';
import { createEpiSchema } from '../types';
import { useMutateEpi } from '../hooks/useEpis';

interface EpiSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epi?: Epi | null;
}

export function EpiSheet({ open, onOpenChange, epi }: EpiSheetProps) {
  const isEditing = !!epi;
  const { createEpi, updateEpi, isCreating, isUpdating } = useMutateEpi();
  const { selectedEmpresaId } = useEmpresa();
  const isSaving = isCreating || isUpdating;

  const form = useForm<CreateEpiDTO>({
    resolver: zodResolver(createEpiSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category: '',
      unit: '',
      default_cost: undefined,
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (epi) {
        form.reset({
          code: epi.code || '',
          name: epi.name,
          description: epi.description || '',
          category: epi.category || '',
          unit: epi.unit || '',
          default_cost: epi.default_cost || undefined,
          status: epi.status,
        });
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          category: '',
          unit: '',
          default_cost: undefined,
          status: 'active',
        });
      }
    }
  }, [open, epi, form]);

  const onSubmit = async (data: CreateEpiDTO) => {
    try {
      if (!selectedEmpresaId) {
        toast.error('Empresa não selecionada');
        return;
      }

      if (isEditing && epi.id) {
        await updateEpi({ id: epi.id, payload: data });
        toast.success('EPI atualizado com sucesso!');
      } else {
        await createEpi({ ...data, empresa_id: selectedEmpresaId });
        toast.success('EPI cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar EPI');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Editar EPI' : 'Novo EPI'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Atualize as informações do Equipamento de Proteção Individual.' 
              : 'Cadastre um novo Equipamento de Proteção Individual no catálogo.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Interno</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: EPI-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Equipamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Capacete de Segurança" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Proteção da Cabeça" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Unidade, Par" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="default_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Padrão (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Especificações técnicas, normas..." className="resize-none" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="pt-6 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar EPI'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
