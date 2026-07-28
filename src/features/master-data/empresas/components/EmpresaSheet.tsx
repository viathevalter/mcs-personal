import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building, Wallet, MapPin, Phone, Info, Upload, Loader2, Mail } from 'lucide-react';

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
import { supabase } from '@/shared/supabase/client';

interface EmpresaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
}

export function EmpresaSheet({ open, onOpenChange, empresa }: EmpresaSheetProps) {
  const isEditing = !!empresa;
  const { createEmpresa, updateEmpresa, isCreating, isUpdating } = useMutateEmpresa();
  const isSaving = isCreating || isUpdating;

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O logotipo deve ter no máximo 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida (PNG, JPG, etc.).');
      return;
    }

    setIsUploadingLogo(true);
    const toastId = toast.loading('Enviando logotipo...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      form.setValue('invoice_logo_url', publicUrl);
      toast.success('Logotipo carregado com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Erro ao enviar logotipo:', error);
      toast.error('Erro ao enviar logotipo: ' + error.message, { id: toastId });
    } finally {
      setIsUploadingLogo(false);
    }
  };

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
      marketing_sender_email: '',
      iban: '',
      latitude: undefined,
      longitude: undefined,
      bank_details: '',
      next_invoice_number: 1,
      invoice_series: '1',
      atcud_prefix: '',
      capital_social: '',
      conservatoria: '',
      matricula: '',
      certified_software_text: 'ab8k - Processado por Programa Certificado nº 1137/AT',
      invoice_logo_url: '',
      microsoft_tenant_id: '',
      microsoft_client_id: '',
      microsoft_client_secret: '',
      microsoft_sharepoint_drive_id: '',
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
          marketing_sender_email: (empresa as any).marketing_sender_email || '',
          iban: empresa.iban || '',
          latitude: empresa.latitude || undefined,
          longitude: empresa.longitude || undefined,
          bank_details: empresa.bank_details || '',
          next_invoice_number: empresa.next_invoice_number || 1,
          invoice_series: empresa.invoice_series || '1',
          atcud_prefix: empresa.atcud_prefix || '',
          capital_social: empresa.capital_social || '',
          conservatoria: empresa.conservatoria || '',
          matricula: empresa.matricula || '',
          certified_software_text: empresa.certified_software_text || 'ab8k - Processado por Programa Certificado nº 1137/AT',
          invoice_logo_url: empresa.invoice_logo_url || '',
          microsoft_tenant_id: (empresa as any).microsoft_tenant_id || '',
          microsoft_client_id: (empresa as any).microsoft_client_id || '',
          microsoft_client_secret: (empresa as any).microsoft_client_secret || '',
          microsoft_sharepoint_drive_id: (empresa as any).microsoft_sharepoint_drive_id || '',
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
          next_invoice_number: 1,
          invoice_series: '1',
          atcud_prefix: '',
          capital_social: '',
          conservatoria: '',
          matricula: '',
          certified_software_text: 'ab8k - Processado por Programa Certificado nº 1137/AT',
          invoice_logo_url: '',
          microsoft_tenant_id: '',
          microsoft_client_id: '',
          microsoft_client_secret: '',
          microsoft_sharepoint_drive_id: '',
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

                <FormField
                  control={form.control}
                  name="marketing_sender_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Remetente de Campanhas / Marketing (Resend)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: mkt@gestaologinpro.com" className="bg-white dark:bg-slate-955" {...field} value={field.value || ''} />
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

            {/* Bloco 5: Faturamento e Certificação */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Wallet className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Faturamento & Certificação</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="invoice_series"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série da Fatura</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximo Número da Fatura</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 117"
                          className="bg-white dark:bg-slate-950"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="atcud_prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefixo ATCUD</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: J6XZTGY3" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capital_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 3.000,00 €" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conservatoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conservatória Reg. Com.</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: V.N.Gaia" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula / Registo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 518954021" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certified_software_text"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Texto de Certificação do Software</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: ab8k - Processado por Programa Certificado nº 1137/AT" className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_logo_url"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Logotipo da Fatura</FormLabel>
                      <div className="flex items-center gap-4">
                        {field.value ? (
                          <div className="relative h-16 w-16 rounded border bg-slate-50 dark:bg-slate-900/50 p-1 flex items-center justify-center overflow-hidden shrink-0 group">
                            <img src={field.value} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={() => form.setValue('invoice_logo_url', '')}
                              className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 shrink-0 text-xs">
                            Sem Logo
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <FormControl>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={isUploadingLogo || isSaving}
                                className="hidden"
                                id="logo-file-input"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-white dark:bg-slate-900 dark:border-slate-800 focus-visible:ring-orange-500 gap-1.5"
                                disabled={isUploadingLogo || isSaving}
                                onClick={() => document.getElementById('logo-file-input')?.click()}
                              >
                                {isUploadingLogo ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    Selecionar Imagem
                                  </>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <p className="text-[10px] text-muted-foreground">Proporção retangular horizontal (ex: 3:1). PNG ou JPG até 2MB.</p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bloco 6: Conectividade Microsoft Office 365 (Opcional) */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Mail className="h-5 w-5 text-blue-500" />
                <div className="space-y-0.5 text-left">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Microsoft Office 365 / Exchange</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Configure credenciais dedicadas para esta empresa (Opcional)</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 leading-normal text-left">
                Deixe estes campos em branco para utilizar as credenciais globais padrão do sistema. Preencha-os apenas se esta empresa (como a Stocco) possuir um Tenant da Microsoft 365 totalmente independente.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="microsoft_tenant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Microsoft Tenant ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: a2a912e1-..." className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="microsoft_client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application (Client) ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: b859012c-..." className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="microsoft_client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret (Valor)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Ex: abc8Q~..." className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="microsoft_sharepoint_drive_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID do SharePoint Drive (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: b!abcde..." className="bg-white dark:bg-slate-950" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
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
