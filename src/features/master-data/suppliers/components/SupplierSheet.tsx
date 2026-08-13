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
import type { Supplier, CreateSupplierDTO } from '../types';
import { createSupplierSchema } from '../types';
import { useMutateSupplier } from '../hooks/useSuppliers';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { suppliersApi } from '../api/suppliersApi';

interface SupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierSheet({ open, onOpenChange, supplier }: SupplierSheetProps) {
  const isEditing = !!supplier;
  const { selectedEmpresaId } = useEmpresa();
  const { createSupplier, updateSupplier, isCreating, isUpdating } = useMutateSupplier();
  const isSaving = isCreating || isUpdating;

  const form = useForm<CreateSupplierDTO>({
    resolver: zodResolver(createSupplierSchema) as any,
    defaultValues: {
      codigo: '',
      trade_name: '',
      legal_name: '',
      tax_id: '',
      email: '',
      billing_email: '',
      phone: '',
      supplier_type: undefined,
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

  const selectedCountry = useWatch({ control: form.control, name: 'country_id' });

  useEffect(() => {
    let isMounted = true;
    if (open) {
      if (supplier) {
        form.reset({
          codigo: supplier.codigo || '',
          trade_name: supplier.trade_name,
          legal_name: supplier.legal_name,
          tax_id: supplier.tax_id,
          email: supplier.email || '',
          billing_email: supplier.billing_email || '',
          phone: supplier.phone || '',
          supplier_type: supplier.supplier_type || '',
          country_id: supplier.country_id || undefined,
          region_id: supplier.region_id || undefined,
          province: supplier.province || '',
          city: supplier.city || '',
          postal_code: supplier.postal_code || '',
          address_line: supplier.address_line || '',
          notes: supplier.notes || '',
          status: supplier.status,
        });
      } else {
        form.reset({
          codigo: 'Carregando...',
          trade_name: '',
          legal_name: '',
          tax_id: '',
          email: '',
          billing_email: '',
          phone: '',
          supplier_type: undefined,
          country_id: undefined,
          region_id: undefined,
          province: '',
          city: '',
          postal_code: '',
          address_line: '',
          notes: '',
          status: 'active',
        });
        if (selectedEmpresaId) {
          suppliersApi.getNextSupplierCode(selectedEmpresaId).then((nextCode) => {
            if (isMounted) {
              form.setValue('codigo', nextCode);
            }
          }).catch((err) => {
            console.error('Erro ao buscar próximo código de fornecedor:', err);
            if (isMounted) form.setValue('codigo', '');
          });
        }
      }
    }
    return () => {
      isMounted = false;
    };
  }, [open, supplier, form, selectedEmpresaId]);

  const onSubmit = async (data: CreateSupplierDTO) => {
    try {
      if (isEditing && supplier.id) {
        await updateSupplier({ id: supplier.id, payload: data });
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await createSupplier(data);
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar fornecedor');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Edite as informações completas deste fornecedor.' 
              : 'Cadastre os dados completos do novo fornecedor.'}
          </SheetDescription>
        </SheetHeader>

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
                        <Input placeholder="Ex: FOR-001" {...field} value={field.value || ''} />
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
                      <Input placeholder="Ex: Master Supplier" {...field} />
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
                      <Input placeholder="Ex: Master Supplier Lda." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Fornecedor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="housing">Alojamento (Housing)</SelectItem>
                        <SelectItem value="transport">Transporte</SelectItem>
                        <SelectItem value="epi">EPIs</SelectItem>
                        <SelectItem value="tools">Ferramentas</SelectItem>
                        <SelectItem value="legal">Assessoria Jurídica</SelectItem>
                        <SelectItem value="accounting">Contabilidade</SelectItem>
                        <SelectItem value="general">Uso Geral</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <Input placeholder="Ex: contato@fornecedor.com" type="email" {...field} value={field.value || ''} />
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
                        <Input placeholder="Ex: financeiro@fornecedor.com" type="email" {...field} value={field.value || ''} />
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

              <FormField
                control={form.control}
                name="address_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Av. da Liberdade, 123" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distrito / Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Lisboa" {...field} value={field.value || ''} />
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
                      <Textarea placeholder="Informações adicionais sobre o fornecedor..." className="resize-none" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control as any}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'active'}>
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

            <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Fornecedor'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
