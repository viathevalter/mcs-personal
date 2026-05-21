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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { CountrySelector, RegionSelector } from '../../locations/components/LocationSelectors';
import type { Empresa, CreateEmpresaDTO } from '../types';
import { createEmpresaSchema } from '../types';
import { useMutateEmpresa } from '../hooks/useEmpresas';

interface EmpresaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
}

export function EmpresaSheet({ open, onOpenChange, empresa }: EmpresaSheetProps) {
  const isEditing = !!empresa;
  const { createEmpresa, updateEmpresa, isCreating, isUpdating } = useMutateEmpresa();
  const isSaving = isCreating || isUpdating;

  const form = useForm<CreateEmpresaDTO>({
    resolver: zodResolver(createEmpresaSchema) as any,
    defaultValues: {
      codigo: '',
      nome: '',
      trade_name: '',
      legal_name: '',
      tax_id: '',
      vat_id: '',
      address_line: '',
      postal_code: '',
      city: '',
      province: '',
      country_id: undefined,
      region_id: undefined,
      phone: '',
      mobile: '',
      email: '',
      billing_email: '',
      iban: '',
      latitude: undefined,
      longitude: undefined,
      bank_details: '',
      is_active: true,
    },
  });

  const selectedCountry = useWatch({ control: form.control, name: 'country_id' }) as string | null | undefined;

  useEffect(() => {
    if (open) {
      if (empresa) {
        form.reset({
          codigo: empresa.codigo || '',
          nome: empresa.nome || '',
          trade_name: empresa.trade_name || '',
          legal_name: empresa.legal_name || '',
          tax_id: empresa.tax_id || '',
          vat_id: empresa.vat_id || '',
          address_line: empresa.address_line || '',
          postal_code: empresa.postal_code || '',
          city: empresa.city || '',
          province: empresa.province || '',
          country_id: empresa.country_id || undefined,
          region_id: empresa.region_id || undefined,
          phone: empresa.phone || '',
          mobile: empresa.mobile || '',
          email: empresa.email || '',
          billing_email: empresa.billing_email || '',
          iban: empresa.iban || '',
          latitude: empresa.latitude || undefined,
          longitude: empresa.longitude || undefined,
          bank_details: empresa.bank_details || '',
          is_active: empresa.is_active,
        });
      } else {
        form.reset({
          codigo: '',
          nome: '',
          trade_name: '',
          legal_name: '',
          tax_id: '',
          vat_id: '',
          address_line: '',
          postal_code: '',
          city: '',
          province: '',
          country_id: undefined,
          region_id: undefined,
          phone: '',
          mobile: '',
          email: '',
          billing_email: '',
          iban: '',
          latitude: undefined,
          longitude: undefined,
          bank_details: '',
          is_active: true,
        });
      }
    }
  }, [open, empresa, form]);

  const onSubmit = async (data: CreateEmpresaDTO) => {
    try {
      if (isEditing && empresa.id) {
        await updateEmpresa({ id: empresa.id, payload: data });
        toast.success('Empresa atualizada com sucesso!');
      } else {
        await createEmpresa(data);
        toast.success('Empresa cadastrada com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar empresa');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Edite as informações completas desta entidade legal.' 
              : 'Cadastre os dados completos da nova empresa / entidade no sistema.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Identificação Geral</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: EMP-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome de Exibição (Sistema)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp Portugal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razon Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp S.A." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trade_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Comercial</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp" {...field} value={field.value || ''} />
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
                      <FormLabel>Cif DNI</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 515660710" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Endereço (Domicilio)</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="vat_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cif Europeo (VAT)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PT515660710" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_line"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Domicilio</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: R. São Tomé e Príncipe, 267" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          form.setValue('region_id', undefined as any);
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

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codigo Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 4430-228" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio / Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vila Nova de Gaia" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia / Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Porto" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contato e Faturamento</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: +351 210 000 000" {...field} value={field.value || ''} />
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
                        <Input type="email" placeholder="Ex: geral@empresa.com" {...field} value={field.value || ''} />
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
                      <FormLabel>Email Envio Factura</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: faturas@empresa.com" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movil</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: +351 910 000 000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dados Operacionais e Bancários</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Iban</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PT50..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Ex: 41.1579" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                        <Input type="number" step="any" placeholder="Ex: -8.6291" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bank_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta Transferencia Faturacion</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: REVOLUT BUSINESS&#10;IBAN: LT44...&#10;SWIFT/BIC: REVOLT21" 
                        className="resize-none h-24 font-mono text-sm" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-col rounded-lg border p-4 bg-white dark:bg-slate-900 mt-4 space-y-4">
                    <div className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">Empresa Ativa no Sistema</FormLabel>
                        <div className="text-sm text-slate-500">
                          Define se esta empresa está visível no selecionador global e permite novas operações.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={true} // TODO: apenas super_admin pode alterar no futuro
                        />
                      </FormControl>
                    </div>
                    
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm flex gap-2 items-start border border-amber-200">
                      <span className="font-semibold shrink-0">Atenção:</span>
                      <p>O arquivamento/desativação de empresas base requer validação de segurança e permissão de super administrador.</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Empresa'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
