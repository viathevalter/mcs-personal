import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  FileText, 
  Save, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/supabase/client';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export function EditLeadModal({
  isOpen,
  onClose,
  lead,
  onLeadUpdated,
}: EditLeadModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        cargo: lead.cargo || '',
        phone: lead.phone || '',
        email: lead.email || '',
        billing_email: lead.billing_email || '',
        company_name: lead.company_name || '',
        legal_name: lead.legal_name || '',
        tax_id: lead.tax_id || '',
        website: lead.website || '',
        address_line: lead.address_line || '',
        city: lead.city || '',
        province: lead.province || '',
        postal_code: lead.postal_code || '',
        sector: lead.sector || '',
        notes: lead.notes || '',
      });
    }
  }, [lead, isOpen]);

  const handleChange = (field: keyof Lead, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id) return;

    if (!formData.name?.trim()) {
      toast.error('O nome do contato / decisor é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const updatePayload = {
        name: formData.name?.trim(),
        cargo: formData.cargo?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        billing_email: formData.billing_email?.trim() || null,
        company_name: formData.company_name?.trim() || null,
        legal_name: formData.legal_name?.trim() || null,
        tax_id: formData.tax_id?.trim() || null,
        website: formData.website?.trim() || null,
        address_line: formData.address_line?.trim() || null,
        city: formData.city?.trim() || null,
        province: formData.province?.trim() || null,
        postal_code: formData.postal_code?.trim() || null,
        sector: formData.sector?.trim() || null,
        notes: formData.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Lead atualizado com sucesso!');
      onLeadUpdated(data as Lead);
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar lead:', err);
      toast.error(err.message || 'Falha ao salvar as alterações do lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 bg-card border-border text-foreground shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Editar Cadastro do Lead
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                    Cockpit Discador
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Atualize telefone, e-mail do decisor, CIF ou razão social durante a chamada.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Contato Direto & Telefonia */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Decisor & Canais de Contato
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Nome do Decisor / Contato <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Ex: Mireille Jouary"
                  className="h-9 text-xs bg-background"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Cargo / Departamento</Label>
                <Input
                  value={formData.cargo || ''}
                  onChange={e => handleChange('cargo', e.target.value)}
                  placeholder="Ex: Gerente de Compras / Obras"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Telefone Principal (Discador)
                </Label>
                <Input
                  value={formData.phone || ''}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="Ex: +34 600 000 000 ou 06 22 97 10 13"
                  className="h-9 text-xs bg-background font-mono font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  E-mail do Decisor
                </Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="Ex: decisor@empresa.com"
                  className="h-9 text-xs bg-background font-medium"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  E-mail Secundário / Faturamento (Opcional)
                </Label>
                <Input
                  type="email"
                  value={formData.billing_email || ''}
                  onChange={e => handleChange('billing_email', e.target.value)}
                  placeholder="Ex: compras@empresa.com ou administracion@empresa.com"
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Empresa & Dados Fiscais */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Empresa & Dados Fiscais
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Nome Comercial / Fantasia</Label>
                <Input
                  value={formData.company_name || ''}
                  onChange={e => handleChange('company_name', e.target.value)}
                  placeholder="Ex: MJ Metal"
                  className="h-9 text-xs bg-background font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Razão Social (Legal Name)</Label>
                <Input
                  value={formData.legal_name || ''}
                  onChange={e => handleChange('legal_name', e.target.value)}
                  placeholder="Ex: MJ METAL SARL"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">CIF / NIF / TVA / CNPJ</Label>
                <Input
                  value={formData.tax_id || ''}
                  onChange={e => handleChange('tax_id', e.target.value)}
                  placeholder="Ex: FR12345678901 ou B12345678"
                  className="h-9 text-xs bg-background font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  Website / Domínio
                </Label>
                <Input
                  value={formData.website || ''}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="Ex: https://www.mjmetal.fr"
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Localização */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Endereço & Localização
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs font-semibold text-foreground">Endereço (Rua, Número, Bloco)</Label>
                <Input
                  value={formData.address_line || ''}
                  onChange={e => handleChange('address_line', e.target.value)}
                  placeholder="Ex: Zone Industrielle des Paluds, 12"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Cidade</Label>
                <Input
                  value={formData.city || ''}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="Ex: Vitrolles"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Província / Região</Label>
                <Input
                  value={formData.province || ''}
                  onChange={e => handleChange('province', e.target.value)}
                  placeholder="Ex: Bouches-du-Rhône"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Código Postal</Label>
                <Input
                  value={formData.postal_code || ''}
                  onChange={e => handleChange('postal_code', e.target.value)}
                  placeholder="Ex: 13127"
                  className="h-9 text-xs bg-background font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Anotações & Observações do Lead */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Anotações Permanentes do Lead
            </Label>
            <Textarea
              value={formData.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Ex: Lead qualificado na França. Exigem soldadores TIG certificados ASME. Contato prefere ligar nas terças pela manhã..."
              rows={3}
              className="text-xs bg-background resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border flex justify-between items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-amber-600/20 px-5"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
