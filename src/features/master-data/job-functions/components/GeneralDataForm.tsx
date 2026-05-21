import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateJobFunctionSchema } from '../types';
import type { JobFunction, UpdateJobFunctionDTO } from '../types';
import { useMutateJobFunction } from '../hooks/useMutateJobFunction';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface GeneralDataFormProps {
  jobFunction: JobFunction;
}

export function GeneralDataForm({ jobFunction }: GeneralDataFormProps) {
  const { updateJobFunction, isUpdating } = useMutateJobFunction();

  const form = useForm<UpdateJobFunctionDTO>({
    resolver: zodResolver(updateJobFunctionSchema) as any,
    defaultValues: {
      code: jobFunction.code,
      name: jobFunction.name,
      description: jobFunction.description || '',
      risk_level: jobFunction.risk_level || 'low',
      status: jobFunction.status,
      default_language: jobFunction.default_language || '',
    },
  });

  // Atualiza o form se os dados do banco mudarem
  useEffect(() => {
    form.reset({
      code: jobFunction.code,
      name: jobFunction.name,
      description: jobFunction.description || '',
      risk_level: jobFunction.risk_level || 'low',
      status: jobFunction.status,
      default_language: jobFunction.default_language || '',
    });
  }, [jobFunction, form]);

  const onSubmit = async (data: UpdateJobFunctionDTO) => {
    try {
      await updateJobFunction({ id: jobFunction.id!, payload: data });
      toast.success('Dados gerais atualizados com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar dados');
    }
  };

  return (
    <div className="max-w-2xl mt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
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
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Função</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Descrição / Escopo</FormLabel>
                <FormControl>
                  <Textarea 
                    rows={4} 
                    placeholder="Descreva as atividades principais desta função..."
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="risk_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Risco Base</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'low'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o risco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma Padrão (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Não definido" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PT">Português</SelectItem>
                      <SelectItem value="ES">Espanhol</SelectItem>
                      <SelectItem value="EN">Inglês</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
