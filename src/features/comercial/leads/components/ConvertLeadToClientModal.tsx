import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useMutateClient } from '@/features/master-data/clients/hooks/useClients';
import { useMutateLead } from '@/features/comercial/leads/hooks/useLeads';
import { usePaymentTerms } from '@/features/master-data/clients/hooks/usePaymentTerms';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Building2, ShieldCheck, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface ConvertLeadToClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  estimacionId?: string;
  onSuccess?: (newClient: any) => void;
}

export function ConvertLeadToClientModal({
  isOpen,
  onClose,
  lead,
  estimacionId,
  onSuccess,
}: ConvertLeadToClientModalProps) {
  const queryClient = useQueryClient();
  const { createClient } = useMutateClient();
  const { updateLead } = useMutateLead();
  const { data: paymentTerms = [] } = usePaymentTerms();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    trade_name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    billing_email: '',
    phone: '',
    country_id: '2f487ab4-c7f5-4b70-9c37-995dc4cda125', // Default Spain
    region_id: '',
    province: '',
    city: '',
    postal_code: '',
    address_line: '',
    payment_term_id: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        trade_name: lead.company_name || lead.name || '',
        legal_name: lead.legal_name || lead.company_name || '',
        tax_id: lead.tax_id || '',
        email: lead.email || '',
        billing_email: lead.billing_email || lead.email || '',
        phone: lead.phone || '',
        country_id: lead.country_id || '2f487ab4-c7f5-4b70-9c37-995dc4cda125',
        region_id: lead.region_id || '',
        province: lead.province || '',
        city: lead.city || '',
        postal_code: lead.postal_code || '',
        address_line: lead.address_line || '',
        payment_term_id: lead.payment_term_id || '',
      });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!formData.trade_name.trim()) {
      toast.error('Informe o Nome Comercial / Fantasia da empresa');
      return;
    }
    if (!formData.legal_name.trim()) {
      toast.error('A Razão Social é obrigatória para contratos e faturamento');
      return;
    }
    if (!formData.tax_id.trim()) {
      toast.error('O CIF / NIF / Tax ID é obrigatório para conferir validade jurídica');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Criar o cliente formal no core_common
      const newClient = await createClient({
        trade_name: formData.trade_name.trim(),
        legal_name: formData.legal_name.trim(),
        tax_id: formData.tax_id.trim(),
        email: formData.email.trim() || null,
        billing_email: formData.billing_email.trim() || null,
        phone: formData.phone.trim() || null,
        country_id: formData.country_id || null,
        region_id: formData.region_id || null,
        province: formData.province.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        address_line: formData.address_line.trim() || null,
        payment_term_id: formData.payment_term_id === 'none' || !formData.payment_term_id ? null : formData.payment_term_id,
        status: 'active',
        codigo: null,
      } as any);

      // 2. Vincular o lead ao cliente criado
      await updateLead({
        id: lead.id,
        payload: {
          client_id: newClient.id,
          tax_id: formData.tax_id.trim(),
          legal_name: formData.legal_name.trim(),
          billing_email: formData.billing_email.trim() || null,
          country_id: formData.country_id || null,
          region_id: formData.region_id || null,
          province: formData.province.trim() || null,
          city: formData.city.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          address_line: formData.address_line.trim() || null,
          payment_term_id: formData.payment_term_id === 'none' || !formData.payment_term_id ? null : formData.payment_term_id,
        } as any,
      });

      // 3. Vincular todas as estimativas deste lead ao novo cliente formal
      if (estimacionId) {
        await supabase
          .schema('core_comercial')
          .from('estimaciones')
          .update({ 
            client_id: newClient.id,
            country_id: formData.country_id || null,
          })
          .eq('id', estimacionId);
      }

      await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({ 
          client_id: newClient.id,
          country_id: formData.country_id || null,
        })
        .eq('lead_id', lead.id);

      queryClient.invalidateQueries({ queryKey: ['estimaciones'] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      toast.success('🎉 Empresa formalizada como Cliente!', {
        description: 'Os dados fiscais foram gravados e vinculados à proposta contratual.'
      });

      onSuccess?.(newClient);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao converter lead em cliente', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="p-5 px-6 pb-4 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Converter Lead em Cliente Formal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preencha os dados fiscais e contratuais para emissão válida de Propostas e Contratos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identificação Fiscal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Identificação Jurídica & Fiscal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="conv_trade_name" className="text-xs font-semibold">
                  Nome Comercial / Fantasia <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conv_trade_name"
                  required
                  placeholder="Ex: Tamarco Metalúrgica"
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_legal_name" className="text-xs font-semibold">
                  Razão Social Completa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conv_legal_name"
                  required
                  placeholder="Ex: Tamarco Metalúrgica S.L."
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="conv_tax_id" className="text-xs font-semibold">
                  CIF / NIF / Tax ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conv_tax_id"
                  required
                  placeholder="Ex: B12345678"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  className="h-9 text-xs font-mono font-medium focus-visible:ring-emerald-500 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_payment_term" className="text-xs font-semibold">Condição de Pagamento</Label>
                <Select
                  value={formData.payment_term_id}
                  onValueChange={(val) => setFormData({ ...formData, payment_term_id: val })}
                >
                  <SelectTrigger id="conv_payment_term" className="h-9 text-xs focus-visible:ring-emerald-500">
                    <SelectValue placeholder="Selecione a condição..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">A combinar / Padrão</SelectItem>
                    {paymentTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id} className="text-xs">
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contatos */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="conv_email" className="text-xs font-semibold">E-mail Comercial</Label>
                <Input
                  id="conv_email"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_billing_email" className="text-xs font-semibold">E-mail Financeiro</Label>
                <Input
                  id="conv_billing_email"
                  type="email"
                  placeholder="faturamento@empresa.com"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_phone" className="text-xs font-semibold">Telefone</Label>
                <Input
                  id="conv_phone"
                  placeholder="+34 912 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Sede e Endereço */}
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 pb-1">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Endereço da Sede Fiscal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">País</Label>
                <CountrySelector
                  value={formData.country_id || null}
                  onChange={(val) => setFormData({ ...formData, country_id: val || '', region_id: '' })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Região</Label>
                <RegionSelector
                  countryId={formData.country_id || null}
                  value={formData.region_id || null}
                  onChange={(val) => setFormData({ ...formData, region_id: val || '' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="conv_province" className="text-xs font-semibold">Província</Label>
                <Input
                  id="conv_province"
                  placeholder="Ex: Cádiz"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_city" className="text-xs font-semibold">Cidade</Label>
                <Input
                  id="conv_city"
                  placeholder="Ex: Barcelona"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_postal_code" className="text-xs font-semibold">Código Postal</Label>
                <Input
                  id="conv_postal_code"
                  placeholder="Ex: 08001"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conv_address_line" className="text-xs font-semibold">Logradouro Completo</Label>
              <Input
                id="conv_address_line"
                placeholder="Ex: Polígono Industrial Las Salinas, Calle A, Nave 12"
                value={formData.address_line}
                onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                className="h-9 text-xs focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-9 px-4 text-xs font-medium">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              size="sm" 
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/10 text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Formalizando Cliente...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Formalizar Cliente & Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
