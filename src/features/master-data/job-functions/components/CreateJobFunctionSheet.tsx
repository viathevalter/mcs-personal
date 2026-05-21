import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { createJobFunctionSchema } from '../types';
import type { CreateJobFunctionDTO } from '../types';
import { useMutateJobFunction } from '../hooks/useMutateJobFunction';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
import { Plus } from 'lucide-react';

export function CreateJobFunctionSheet() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { createJobFunction, isCreating } = useMutateJobFunction();

  const form = useForm<CreateJobFunctionDTO>({
    resolver: zodResolver(createJobFunctionSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      status: 'active',
      risk_level: 'low',
    },
  });

  const onSubmit = async (data: CreateJobFunctionDTO) => {
    try {
      const newJob = await createJobFunction(data);
      toast.success('Função criada com sucesso!');
      setOpen(false);
      form.reset();
      // Redirect para a página de detalhes (Aba 1)
      navigate(`/master-data/job-functions/${newJob.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar função');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Função
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[425px]">
        <SheetHeader>
          <SheetTitle>Criar Nova Função</SheetTitle>
          <SheetDescription>
            Crie o perfil básico. Você poderá preencher EPIs e Tarifas na próxima tela.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ENGBR01" {...field} />
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
                    <FormLabel>Nome da Função</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Engenheiro Eletricista" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Risco Base</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'low'}>
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
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Salvando...' : 'Salvar e Continuar'}
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
