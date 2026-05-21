import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

import type { CreateJobFunctionEpiDTO } from '../types';
import { createJobFunctionEpiSchema } from '../types';
import { useEpis } from '../../epis/hooks/useEpis';
import { useJobFunctionEpis, useMutateJobFunctionEpi } from '../hooks/useJobFunctionEpis';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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

interface EpisTabProps {
  jobFunctionId: string;
}

export function EpisTab({ jobFunctionId }: EpisTabProps) {
  const { data: episVinculados = [], isLoading: isLoadingVinculos } = useJobFunctionEpis(jobFunctionId);
  const { data: catalogoEpis = [], isLoading: isLoadingCatalogo } = useEpis();
  const { createEpi, isCreating, archiveEpi } = useMutateJobFunctionEpi(jobFunctionId);

  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<CreateJobFunctionEpiDTO>({
    resolver: zodResolver(createJobFunctionEpiSchema) as any,
    defaultValues: {
      job_function_id: jobFunctionId,
      epi_id: '',
      quantity: 1,
      is_required: true,
      renewal_period_days: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: CreateJobFunctionEpiDTO) => {
    try {
      await createEpi(data);
      toast.success('EPI vinculado com sucesso!');
      form.reset();
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao vincular EPI');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja realmente desvincular este EPI?')) return;
    try {
      await archiveEpi(id);
      toast.success('EPI desvinculado');
    } catch (error: any) {
      toast.error('Erro ao desvincular EPI');
    }
  };

  if (isLoadingVinculos) {
    return <Skeleton className="h-64 w-full mt-6" />;
  }

  // Filtrar EPIs que já estão vinculados para não mostrar no Select (ou mostrar desabilitado)
  const episDisponiveis = catalogoEpis.filter(
    (catEpi) => !episVinculados.some((v) => v.epi_id === catEpi.id)
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">EPIs Obrigatórios</h3>
          <p className="text-sm text-muted-foreground">
            Equipamentos de Proteção Individual necessários para a execução desta função.
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar EPI
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {episVinculados.length === 0 && !isAdding && (
          <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
            Nenhum EPI vinculado a esta função.
          </div>
        )}

        {episVinculados.map((vinculo) => (
          <div key={vinculo.id} className="flex items-center gap-4 p-4 border rounded-md bg-white hover:border-slate-300 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{vinculo.epi?.name || 'EPI Desconhecido'}</span>
                {!vinculo.is_required && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Opcional</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex gap-4">
                <span>Qtd: {vinculo.quantity} {vinculo.epi?.unit}</span>
                {vinculo.renewal_period_days && (
                  <span>Troca a cada {vinculo.renewal_period_days} dias</span>
                )}
              </div>
            </div>
            <div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => vinculo.id && handleRemove(vinculo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="p-4 border rounded-md bg-slate-50 relative">
          <h4 className="font-medium mb-4">Vincular Novo EPI</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="epi_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selecione o Equipamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCatalogo ? 'Carregando catálogo...' : 'Selecione um EPI'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {episDisponiveis.map(epi => (
                          <SelectItem key={epi.id} value={epi.id}>
                            {epi.code ? `[${epi.code}] ` : ''}{epi.name}
                          </SelectItem>
                        ))}
                        {episDisponiveis.length === 0 && (
                          <SelectItem value="none" disabled>Todos os EPIs já foram vinculados ou catálogo vazio</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade (Padrão)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renewal_period_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renovação (Dias)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 90"
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? parseInt(val) : null);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 p-2 md:pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mb-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          EPI Obrigatório
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações de Uso</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Apenas para trabalho em altura" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Vinculando...' : 'Vincular EPI'}
                </Button>
              </div>
            </form>
          </Form>

          {catalogoEpis.length === 0 && !isLoadingCatalogo && (
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded flex items-start gap-2 text-sm border border-yellow-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>O catálogo de EPIs desta empresa está vazio. Você precisará ir ao módulo de <b>Logística &gt; Catálogo de EPIs</b> para cadastrar os equipamentos primeiro.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
