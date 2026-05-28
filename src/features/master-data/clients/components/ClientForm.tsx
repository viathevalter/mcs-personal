import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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

import { CountrySelector, RegionSelector } from '../../locations/components/LocationSelectors';
import type { Client, CreateClientDTO } from '../types';
import { createClientSchema } from '../types';
import { useMutateClient } from '../hooks/useClients';

interface ClientFormProps {
  client?: Client | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isSheet?: boolean;
}

export function ClientForm({ client, onSuccess, onCancel, isSheet = false }: ClientFormProps) {
  const isEditing = !!client;
  const { createClient, updateClient, isCreating, isUpdating } = useMutateClient();
  const isSaving = isCreating || isUpdating;

  const form = useForm<CreateClientDTO>({
    resolver: zodResolver(createClientSchema) as any,
    defaultValues: {
      codigo: '',
      trade_name: '',
      legal_name: '',
      tax_id: '',
      email: '',
      billing_email: '',
      phone: '',
      country_id: undefined,
      region_id: undefined,
      province: '',
      city: '',
      postal_code: '',
      address_line: '',
      notes: '',
      status: 'active',
    },
  });

  const selectedCountry = useWatch({ control: form.control, name: 'country_id' }) as string | null | undefined;

  useEffect(() => {
    if (client) {
      form.reset({
        codigo: client.codigo || '',
        trade_name: client.trade_name,
        legal_name: client.legal_name,
        tax_id: client.tax_id,
        email: client.email || '',
        billing_email: client.billing_email || '',
        phone: client.phone || '',
        country_id: client.country_id || undefined,
        region_id: client.region_id || undefined,
        province: client.province || '',
        city: client.city || '',
        postal_code: client.postal_code || '',
        address_line: client.address_line || '',
        notes: client.notes || '',
        status: client.status,
      });
    } else {
      form.reset({
        codigo: '',
        trade_name: '',
        legal_name: '',
        tax_id: '',
        email: '',
        billing_email: '',
        phone: '',
        country_id: undefined,
        region_id: undefined,
        province: '',
        city: '',
        postal_code: '',
        address_line: '',
        notes: '',
        status: 'active',
      });
    }
  }, [client, form]);

  const onSubmit = async (data: CreateClientDTO) => {
    try {
      const payload = {
        ...data,
        codigo: data.codigo?.trim() === '' ? null : data.codigo,
        email: data.email?.trim() === '' ? null : data.email,
        billing_email: data.billing_email?.trim() === '' ? null : data.billing_email,
        phone: data.phone?.trim() === '' ? null : data.phone,
        province: data.province?.trim() === '' ? null : data.province,
        city: data.city?.trim() === '' ? null : data.city,
        postal_code: data.postal_code?.trim() === '' ? null : data.postal_code,
        address_line: data.address_line?.trim() === '' ? null : data.address_line,
        notes: data.notes?.trim() === '' ? null : data.notes,
      };

      if (isEditing && client.id) {
        await updateClient({ id: client.id, payload });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await createClient(payload);
        toast.success('Cliente cadastrado com sucesso!');
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cliente');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Identificação</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Interno</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CLI-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF / Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 500123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="trade_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Fantasia</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Mastercorp Portugal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="legal_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razão Social</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Mastercorp S.A." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contato e Faturamento</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail de Contato</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: contato@empresa.com" type="email" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail Financeiro</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: financeiro@empresa.com" type="email" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: +351 912 345 678" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Endereço</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <CountrySelector value={field.value || null} onChange={(v) => {
                      field.onChange(v);
                      // Clear region when country changes
                      form.setValue('region_id', undefined);
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Região</FormLabel>
                  <FormControl>
                    <RegionSelector 
                      countryId={selectedCountry}
                      value={field.value || null} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address_line"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logradouro</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Av. da Liberdade, 123 - 4º Andar" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Lisboa" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1000-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Outros</h3>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Informações adicionais sobre o cliente..." className="resize-none" {...field} value={field.value || ''} />
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
        </div>

        <div className={`pt-6 flex gap-3 justify-end ${isSheet ? 'sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8' : ''}`}>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
