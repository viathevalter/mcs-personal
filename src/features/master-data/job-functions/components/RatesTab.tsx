import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, Euro, Pencil } from 'lucide-react';

import type { CreateJobFunctionRateRefDTO, JobFunctionRateRef } from '../types';
import { createJobFunctionRateRefSchema } from '../types';
import { useJobFunctionRates, useMutateJobFunctionRate } from '../hooks/useJobFunctionRates';
import { useCountries } from '@/features/master-data/locations/hooks/useLocations';
import { CountrySelector } from '@/features/master-data/locations/components/LocationSelectors';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface RatesTabProps {
  jobFunctionId: string;
}

export function RatesTab({ jobFunctionId }: RatesTabProps) {
  const { data: rates = [], isLoading } = useJobFunctionRates(jobFunctionId);
  const { createRate, isCreating, updateRate, isUpdating, archiveRate } = useMutateJobFunctionRate(jobFunctionId);
  const { data: countries = [] } = useCountries();

  const [isAdding, setIsAdding] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);

  const form = useForm<CreateJobFunctionRateRefDTO>({
    resolver: zodResolver(createJobFunctionRateRefSchema) as any,
    defaultValues: {
      job_function_id: jobFunctionId,
      currency_code: 'EUR',
      base_cost_hour: 0,
      recommended_sell_rate_hour: 0,
      minimum_margin_percent: undefined,
      country_id: undefined,
    },
  });

  const editForm = useForm<CreateJobFunctionRateRefDTO>({
    resolver: zodResolver(createJobFunctionRateRefSchema) as any,
    defaultValues: {
      job_function_id: jobFunctionId,
      currency_code: 'EUR',
      base_cost_hour: 0,
      recommended_sell_rate_hour: 0,
      minimum_margin_percent: undefined,
      country_id: undefined,
    },
  });

  const handleEditClick = (rate: JobFunctionRateRef) => {
    setEditingRateId(rate.id || null);
    editForm.reset({
      job_function_id: rate.job_function_id,
      currency_code: rate.currency_code,
      base_cost_hour: rate.base_cost_hour,
      recommended_sell_rate_hour: rate.recommended_sell_rate_hour,
      minimum_margin_percent: rate.minimum_margin_percent ?? undefined,
      country_id: rate.country_id ?? undefined,
    });
  };

  const onEditSubmit = async (data: CreateJobFunctionRateRefDTO) => {
    if (!editingRateId) return;
    try {
      await updateRate({ id: editingRateId, payload: data });
      toast.success('Tarifa atualizada com sucesso!');
      setEditingRateId(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar tarifa');
    }
  };

  const onSubmit = async (data: CreateJobFunctionRateRefDTO) => {
    try {
      await createRate(data);
      toast.success('Tarifa cadastrada com sucesso!');
      form.reset();
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar tarifa');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja realmente remover esta tarifa?')) return;
    try {
      await archiveRate(id);
      toast.success('Tarifa removida');
    } catch (error: any) {
      toast.error('Erro ao remover tarifa');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full mt-6" />;
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Tarifas e Custos Base</h3>
          <p className="text-sm text-muted-foreground">
            Defina o custo hora padrão e o valor base de venda (rate) para esta função.
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarifa
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {rates.length === 0 && !isAdding && (
          <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
            Nenhuma tarifa cadastrada. Defina o custo e a tarifa de referência.
          </div>
        )}

        {rates.map((rate) => {
          const rateCountry = countries.find((c) => c.id === rate.country_id);

          if (editingRateId === rate.id) {
            return (
              <div key={rate.id} className="p-4 border rounded-md bg-slate-50 relative">
                <h4 className="font-medium mb-4">Editar Tarifa</h4>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="country_id"
                        render={({ field }) => (
                          <FormItem className="flex flex-col justify-end h-full">
                            <FormLabel>País</FormLabel>
                            <FormControl>
                              <CountrySelector
                                value={field.value || null}
                                onChange={(val) => {
                                  field.onChange(val);
                                  if (val) {
                                    const countryObj = countries.find(c => c.id === val);
                                    if (countryObj?.currency_code) {
                                      editForm.setValue('currency_code', countryObj.currency_code);
                                    }
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="currency_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Moeda</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={editForm.control}
                        name="base_cost_hour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custo Base / Hora</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="recommended_sell_rate_hour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tarifa Venda Base / Hora</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="minimum_margin_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Margem Alvo (%) - Opcional</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="Ex: 30"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.onChange(val ? parseFloat(val) : null);
                                }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t">
                      <Button type="button" variant="ghost" onClick={() => setEditingRateId(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            );
          }

          return (
            <div key={rate.id} className="flex items-center gap-4 p-4 border rounded-md bg-white hover:border-slate-300 transition-colors">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Euro className="h-5 w-5 text-slate-500" />
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">País</p>
                  <p className="text-base font-semibold text-slate-700">{rateCountry ? rateCountry.name : 'Padrão / Global'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Custo / Hora</p>
                  <p className="text-base font-semibold">{rate.currency_code} {rate.base_cost_hour?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Tarifa Venda / Hora</p>
                  <p className="text-base font-semibold text-emerald-600">{rate.currency_code} {rate.recommended_sell_rate_hour?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Margem Alvo</p>
                  <p className="text-base font-medium">{rate.minimum_margin_percent ? `${rate.minimum_margin_percent}%` : '--'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  onClick={() => handleEditClick(rate)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => rate.id && handleRemove(rate.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {isAdding && (
        <div className="p-4 border rounded-md bg-slate-50 relative">
          <h4 className="font-medium mb-4">Nova Tarifa de Referência</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end h-full">
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <CountrySelector
                          value={field.value || null}
                          onChange={(val) => {
                            field.onChange(val);
                            if (val) {
                              const countryObj = countries.find(c => c.id === val);
                              if (countryObj?.currency_code) {
                                form.setValue('currency_code', countryObj.currency_code);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moeda</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="base_cost_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo Base / Hora</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommended_sell_rate_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa Venda Base / Hora</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_margin_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margem Alvo (%) - Opcional</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="Ex: 30"
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? parseFloat(val) : null);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Salvando...' : 'Salvar Tarifa'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
