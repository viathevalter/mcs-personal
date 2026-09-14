import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  CheckCircle, 
  FileText, 
  MapPin, 
  Mail, 
  Phone, 
  User, 
  Loader2, 
  CreditCard,
  Building
} from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface CollectFiscalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

export function CollectFiscalDataModal({
  isOpen,
  onClose,
  lead,
}: CollectFiscalDataModalProps) {
  const queryClient = useQueryClient();

  const [legalName, setLegalName] = useState(lead.legal_name || lead.company_name || '');
  const [companyName, setCompanyName] = useState(lead.company_name || lead.name || '');
  const [taxId, setTaxId] = useState(lead.tax_id || '');
  const [contactName, setContactName] = useState(lead.name || '');
  const [contactEmail, setContactEmail] = useState(lead.email || '');
  const [billingEmail, setBillingEmail] = useState(lead.billing_email || lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [addressLine, setAddressLine] = useState(lead.address_line || '');
  const [city, setCity] = useState(lead.city || '');
  const [province, setProvince] = useState(lead.province || '');
  const [postalCode, setPostalCode] = useState(lead.postal_code || '');
  const [countryId, setCountryId] = useState(lead.country_id || 'ES');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveFiscalData = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taxId.trim()) {
      toast.error('Por favor, informe o CIF / NIF / Número Fiscal da empresa.');
      return;
    }
    if (!legalName.trim()) {
      toast.error('Por favor, informe a Razão Social da empresa.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Atualiza Lead na tabela core_comercial.leads
      const { error: updateError } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          legal_name: legalName.trim(),
          company_name: companyName.trim() || legalName.trim(),
          tax_id: taxId.trim().toUpperCase(),
          name: contactName.trim() || lead.name,
          email: contactEmail.trim() || lead.email,
          billing_email: billingEmail.trim() || contactEmail.trim() || null,
          phone: phone.trim() || null,
          address_line: addressLine.trim() || null,
          city: city.trim() || null,
          province: province.trim() || null,
          postal_code: postalCode.trim() || null,
          country_id: countryId || 'ES',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // 2. Se o lead já estiver associado a um cliente, atualiza o cadastro do cliente
      if (lead.client_id) {
        await supabase
          .schema('core_common')
          .from('clients')
          .update({
            legal_name: legalName.trim(),
            commercial_name: companyName.trim() || legalName.trim(),
            tax_id: taxId.trim().toUpperCase(),
            billing_email: billingEmail.trim() || null,
            phone: phone.trim() || null,
            address: addressLine.trim() || null,
            city: city.trim() || null,
            postal_code: postalCode.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.client_id);
      }

      // 3. Invalida cache de queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign'] });

      toast.success('Dados cadastrais e fiscais (CIF) atualizados com sucesso!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao atualizar dados fiscais');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Ficha Cadastral & Dados Fiscais (CIF / NIF)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Preencha os dados jurídicos e fiscais de faturamento coletados com o cliente durante a ligação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveFiscalData} className="p-6 space-y-5">
          {/* Seção 1: Identificação Jurídica da Empresa */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
              1. Identificação Fiscal & Razão Social
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  NIF / CIF / Número Fiscal *
                </Label>
                <Input
                  type="text"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  placeholder="Ex: B-50012345 (Espanha) ou 500123456 (PT)"
                  required
                  className="h-9 text-xs bg-background border-input font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Razão Social (Legal Name) *
                </Label>
                <Input
                  type="text"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="Ex: Oficinas y Calderería del Norte S.L."
                  required
                  className="h-9 text-xs bg-background border-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Nome Comercial / Fantasia
              </Label>
              <Input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: Caldeiraria Norte"
                className="h-8 text-xs bg-background border-input"
              />
            </div>
          </div>

          {/* Seção 2: Contato & Faturamento */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              2. Contato & E-mail para Faturas
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Nome do Ponto de Contato
                </Label>
                <Input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Ex: Miguel Santos"
                  className="h-8 text-xs bg-background border-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Telefone
                </Label>
                <Input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: +34 989 123 456"
                  className="h-8 text-xs bg-background border-input font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  E-mail Comercial / Contato
                </Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="Ex: contacto@empresa.com"
                  className="h-8 text-xs bg-background border-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  E-mail para Faturamento / Faturas
                </Label>
                <Input
                  type="email"
                  value={billingEmail}
                  onChange={e => setBillingEmail(e.target.value)}
                  placeholder="Ex: contabilidad@empresa.com"
                  className="h-8 text-xs bg-background border-input"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Endereço Fiscal de Faturamento */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              3. Endereço Fiscal da Empresa
            </h4>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Logradouro / Rua e Número
              </Label>
              <Input
                type="text"
                value={addressLine}
                onChange={e => setAddressLine(e.target.value)}
                placeholder="Ex: Polígono Industrial Can Valero, Calle Asival 24"
                className="h-8 text-xs bg-background border-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Cidade
                </Label>
                <Input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex: Madrid"
                  className="h-8 text-xs bg-background border-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Província / Região
                </Label>
                <Input
                  type="text"
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  placeholder="Ex: Madrid"
                  className="h-8 text-xs bg-background border-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  Código Postal (CEP)
                </Label>
                <Input
                  type="text"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  placeholder="Ex: 28020"
                  className="h-8 text-xs bg-background border-input font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-input"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5 shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Salvar Dados Fiscais & CIF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
