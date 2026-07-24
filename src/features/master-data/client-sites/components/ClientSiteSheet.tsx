import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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

import { CountrySelector, RegionSelector } from '../../locations/components/LocationSelectors';
import { useRegions } from '../../locations/hooks/useLocations';
import type { ClientSite, CreateClientSiteDTO } from '../types';
import { createClientSiteSchema } from '../types';
import { useMutateClientSite } from '../hooks/useClientSites';
import { useClients } from '../../clients/hooks/useClients';

interface ClientSiteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: ClientSite | null;
  preSelectedClientId?: string;
}

export function ClientSiteSheet({ open, onOpenChange, site, preSelectedClientId }: ClientSiteSheetProps) {
  const isEditing = !!site;
  const { createSite, updateSite, isCreating, isUpdating } = useMutateClientSite();
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const isSaving = isCreating || isUpdating;

  const form = useForm<CreateClientSiteDTO>({
    resolver: zodResolver(createClientSiteSchema) as any,
    defaultValues: {
      client_id: preSelectedClientId || '',
      site_code: '',
      name: '',
      country_id: undefined,
      region_id: undefined,
      province: '',
      city: '',
      postal_code: '',
      address_line: '',
      latitude: undefined,
      longitude: undefined,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
      status: 'active',
    },
  });

  const selectedCountry = useWatch({ control: form.control, name: 'country_id' }) as string | null | undefined;
  const selectedRegion = useWatch({ control: form.control, name: 'region_id' }) as string | null | undefined;
  const { data: regions = [] } = useRegions(selectedCountry || undefined);

  useEffect(() => {
    if (selectedRegion && regions.length > 0) {
      const matchedRegion = regions.find(r => r.id === selectedRegion);
      if (matchedRegion) {
        form.setValue('province', matchedRegion.name);
      }
    }
  }, [selectedRegion, regions, form]);

  useEffect(() => {
    if (open) {
      if (site) {
        form.reset({
          client_id: preSelectedClientId || site.client_id || '',
          site_code: site.site_code || '',
          name: site.name,
          country_id: site.country_id || undefined,
          region_id: site.region_id || undefined,
          province: site.province || '',
          city: site.city || '',
          postal_code: site.postal_code || '',
          address_line: site.address_line || '',
          latitude: site.latitude || undefined,
          longitude: site.longitude || undefined,
          contact_name: site.contact_name || '',
          contact_phone: site.contact_phone || '',
          contact_email: site.contact_email || '',
          notes: site.notes || '',
          status: site.status,
        });
      } else {
        form.reset({
          client_id: preSelectedClientId || '',
          site_code: '',
          name: '',
          country_id: undefined,
          region_id: undefined,
          province: '',
          city: '',
          postal_code: '',
          address_line: '',
          latitude: undefined,
          longitude: undefined,
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          notes: '',
          status: 'active',
        });
      }
    }
  }, [open, site, form, preSelectedClientId]);

  const onSubmit = async (data: CreateClientSiteDTO) => {
    try {
      const finalClientId = preSelectedClientId || data.client_id || site?.client_id;
      if (!finalClientId) {
        toast.error('Cliente é obrigatório');
        return;
      }

      const payload = {
        ...data,
        client_id: finalClientId,
      };

      if (isEditing && site.id) {
        await updateSite({ id: site.id, payload });
        toast.success('Obra/Local atualizado com sucesso!');
      } else {
        await createSite(payload);
        toast.success('Obra/Local cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar obra');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Editar Obra / Local' : 'Nova Obra / Local'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Edite as informações deste local de trabalho.' 
              : 'Vincule um novo local a um cliente existente.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Identificação Geral</h3>

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente Associado</FormLabel>
                    <Select 
                      key={`${field.value || 'none'}-${clients.length}`}
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={isLoadingClients}
                    >
                      <FormControl>
                        <SelectTrigger 
                          className={!!preSelectedClientId ? "pointer-events-none opacity-60 bg-slate-50 dark:bg-slate-900 select-none cursor-not-allowed border-slate-200 dark:border-slate-800" : ""}
                          tabIndex={!!preSelectedClientId ? -1 : undefined}
                        >
                          <SelectValue placeholder={isLoadingClients ? "Carregando clientes..." : "Selecione um cliente"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id || ''}>
                            {client.trade_name}
                          </SelectItem>
                        ))}
                        {clients.length === 0 && (
                          <SelectItem value="none" disabled>Nenhum cliente cadastrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="site_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Obra</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: OBR-001" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome da Obra / Local</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Construção Edifício A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                      <FormLabel>Região / Província</FormLabel>
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
                      <Input placeholder="Ex: Av. Liberdade, 123" {...field} value={field.value || ''} />
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
                      <FormLabel>Cidade / Município</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ex: 38.7223" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ex: -9.1393" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contato e Observações</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato na Obra</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone do Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: +351 900 000 000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Contato</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ex: encarregado@obra.com" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Restrições de acesso, horários, etc..." className="resize-none" {...field} value={field.value || ''} />
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
                          <SelectItem value="active">Em Andamento</SelectItem>
                          <SelectItem value="inactive">Paralisada</SelectItem>
                          <SelectItem value="archived">Concluída (Arquivada)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Obra'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
