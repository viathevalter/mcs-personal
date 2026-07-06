import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building, Wallet, MapPin, Phone, Info } from 'lucide-react';

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
      cobranca_email: '',
      proposal_sender_email: '',
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
          cobranca_email: (empresa as any).cobranca_email || '',
          proposal_sender_email: empresa.proposal_sender_email || '',
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
          cobranca_email: '',
          proposal_sender_email: '',
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
            
            {/* Bloco 1: Identificação Geral */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Building className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Identificação Geral</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: EMP-01" className="bg-white dark:bg-slate-950" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome de Exibição (Sistema)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp Portugal" className="bg-white dark:bg-slate-950" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp S.A." className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
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
                      <FormLabel>Nome Comercial</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Mastercorp" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bloco 2: Endereço e Registros Fiscais */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Endereço e Registros Fiscais</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CIF / NIF</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 515660710" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CIF Europeu (VAT)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PT515660710" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="hidden md:block"></div>

                <FormField
                  control={form.control}
                  name="address_line"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Domicílio / Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: R. São Tomé e Príncipe, 267" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <FormLabel>Região / Distrito</FormLabel>
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

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 4430-228" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
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
                      <FormLabel>Município / Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vila Nova de Gaia" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
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
                      <FormLabel>Província / Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Porto" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bloco 3: Contato e Faturamento */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Phone className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Contato e Faturamento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: +351 210 000 000" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telemóvel / Celular</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: +351 910 000 000" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
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
                      <FormLabel>E-mail Geral</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: geral@empresa.com" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
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
                      <FormLabel>E-mail para Envio de Faturas</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: faturas@empresa.com" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cobranca_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail para Envio de Cobrança</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: cobranca@empresa.com" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposal_sender_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Remetente de Propostas (Outlook)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: vendas@stoco.es" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bloco 4: Dados Financeiros e Operacionais */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Wallet className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Dados Financeiros e Operacionais</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>IBAN Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PT50..." className="bg-white dark:bg-slate-950 font-mono" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2 md:col-span-1">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="Ex: 41.1579" className="bg-white dark:bg-slate-950 text-xs font-mono" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                          <Input type="number" step="any" placeholder="Ex: -8.6291" className="bg-white dark:bg-slate-950 text-xs font-mono" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                    <FormItem className="md:col-span-3">
                      <FormLabel>Dados de Transferência Faturação (Layout Fatura)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: REVOLUT BUSINESS&#10;IBAN: LT44...&#10;SWIFT/BIC: REVOLT21" 
                          className="resize-none h-24 font-mono text-sm bg-white dark:bg-slate-950" 
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
                    <FormItem className="flex flex-col rounded-lg border p-4 bg-white dark:bg-slate-900 md:col-span-3 space-y-4">
                      <div className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">Empresa Ativa no Sistema</FormLabel>
                          <div className="text-xs text-slate-500">
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
                      
                      <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs flex gap-2 items-start border border-amber-200">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                        <p>O arquivamento/desativação de empresas base requer validação de segurança e permissão de super administrador.</p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8 z-20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                {isSaving ? 'Salvando...' : 'Salvar Empresa'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
