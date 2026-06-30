import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Building2, Wallet, MapPin, Info } from 'lucide-react';
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
import { usePaymentTerms } from '../hooks/usePaymentTerms';

interface ClientFormProps {
  client?: Client | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isSheet?: boolean;
}

export function ClientForm({ client, onSuccess, onCancel, isSheet = false }: ClientFormProps) {
  const isEditing = !!client;
  const { createClient, updateClient, isCreating, isUpdating } = useMutateClient();
  const { data: paymentTerms = [] } = usePaymentTerms();
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
      payment_term_id: undefined,
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
        payment_term_id: client.payment_term_id || undefined,
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
        payment_term_id: undefined,
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
        payment_term_id: data.payment_term_id === 'none' || data.payment_term_id === '' ? null : data.payment_term_id,
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
        
        {/* BLOCO 1: Identificação */}
        <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-orange-500" />
            Identificação
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno</FormLabel>
                    <FormControl>
                      <Input placeholder="Gerado automaticamente se vazio" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500 font-mono text-xs font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF / Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 500123456" {...field} className="bg-white focus-visible:ring-orange-500 font-mono text-xs font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="hidden md:block md:col-span-1" />

            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="trade_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Mastercorp Portugal" {...field} className="bg-white focus-visible:ring-orange-500 font-medium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Mastercorp S.A." {...field} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: Contato e Faturamento */}
        <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="h-4.5 w-4.5 text-orange-500" />
            Contato e Faturamento
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail de Contato</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: contato@empresa.com" type="email" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="billing_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail Financeiro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: financeiro@empresa.com" type="email" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: +351 912 345 678" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="payment_term_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo de Pagamento Padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="bg-white focus-visible:ring-orange-500">
                          <SelectValue placeholder="Selecione o prazo de pagamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum / A combinar</SelectItem>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: Endereço */}
        <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-orange-500" />
            Endereço Principal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="address_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Av. da Liberdade, 123 - 4º Andar" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="country_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <CountrySelector value={field.value || null} onChange={(v) => {
                        field.onChange(v);
                        form.setValue('region_id', undefined);
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
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

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Província / Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Catalunha / Minho" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1.5">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Barcelona / Braga" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-1">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 08001 / 4700-001" {...field} value={field.value || ''} className="bg-white focus-visible:ring-orange-500 font-mono text-xs font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* BLOCO 4: Observações e Status */}
        <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-orange-500" />
            Outros
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Informações adicionais sobre o cliente..." className="resize-none min-h-[90px] bg-white focus-visible:ring-orange-500" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <div className="md:col-span-1">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status de Cadastro</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white focus-visible:ring-orange-500">
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
              </div>
            )}
          </div>
        </div>

        <div className={`pt-4 flex gap-3 justify-end ${isSheet ? 'sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8' : ''}`}>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10">
            {isSaving ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
