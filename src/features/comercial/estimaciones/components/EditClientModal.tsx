import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Save, Loader2, UserCheck, Link2, Check } from 'lucide-react';
import { useMutateClient } from '@/features/master-data/clients/hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    legal_name?: string;
    trade_name?: string;
    tax_id?: string;
    email?: string;
    billing_email?: string;
    phone?: string;
    address_line?: string;
    postal_code?: string;
    city?: string;
    province?: string;
    country_id?: string;
    legal_rep_name?: string | null;
    legal_rep_tax_id?: string | null;
    legal_rep_role?: string | null;
  };
  estimacionId?: string;
  initialSignerName?: string;
  initialSignerTaxId?: string;
  initialSignerRole?: string;
}

export function EditClientModal({
  isOpen,
  onClose,
  client,
  estimacionId,
  initialSignerName,
  initialSignerTaxId,
  initialSignerRole,
}: EditClientModalProps) {
  const { updateClient, isUpdating } = useMutateClient();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);

  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    tax_id: '',
    address_line: '',
    postal_code: '',
    city: '',
    province: '',
    email: '',
    billing_email: '',
    phone: '',
    legal_rep_name: '',
    legal_rep_tax_id: '',
    legal_rep_role: 'Representante Legal',
  });

  useEffect(() => {
    if (client) {
      const safeInitialName =
        initialSignerName &&
        initialSignerName !== client.trade_name &&
        initialSignerName !== client.legal_name
          ? initialSignerName
          : '';
      setFormData({
        legal_name: client.legal_name || '',
        trade_name: client.trade_name || '',
        tax_id: client.tax_id || '',
        address_line: client.address_line || '',
        postal_code: client.postal_code || '',
        city: client.city || '',
        province: client.province || '',
        email: client.email || '',
        billing_email: client.billing_email || '',
        phone: client.phone || '',
        legal_rep_name: client.legal_rep_name || safeInitialName || '',
        legal_rep_tax_id: client.legal_rep_tax_id || initialSignerTaxId || '',
        legal_rep_role: client.legal_rep_role || initialSignerRole || 'Representante Legal',
      });
    }
  }, [client, isOpen, initialSignerName, initialSignerTaxId, initialSignerRole]);

  const handleCopyPublicFormLink = () => {
    const targetId = estimacionId || client?.id;
    if (!targetId) return;
    const url = `${window.location.origin}/public/coleta-dados/${targetId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Link do formulário copiado!', {
      description: 'Envie este link para o cliente preencher os dados fiscais e do representante legal.',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id) return;

    if (!formData.legal_name.trim()) {
      toast.error('A Razão Social é obrigatória para contratos e faturamento');
      return;
    }
    if (!formData.tax_id.trim()) {
      toast.error('O CIF / NIF da empresa é obrigatório');
      return;
    }

    const repName = formData.legal_rep_name.trim() || null;
    const repTaxId = formData.legal_rep_tax_id.trim().toUpperCase() || null;
    const repRole = formData.legal_rep_role.trim() || 'Representante Legal';

    try {
      await updateClient({
        id: client.id,
        payload: {
          legal_name: formData.legal_name.trim(),
          trade_name: formData.trade_name.trim() || formData.legal_name.trim(),
          tax_id: formData.tax_id.trim().toUpperCase(),
          address_line: formData.address_line.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          city: formData.city.trim() || null,
          province: formData.province.trim() || null,
          email: formData.email.trim() || null,
          billing_email: formData.billing_email.trim() || null,
          phone: formData.phone.trim() || null,
          legal_rep_name: repName,
          legal_rep_tax_id: repTaxId,
          legal_rep_role: repRole,
        } as any,
      });

      if (estimacionId) {
        await supabase
          .schema('core_comercial')
          .from('estimaciones')
          .update({
            ...(repName ? { contact_name: repName } : {}),
            signer_tax_id: repTaxId,
            signer_role: repRole,
          })
          .eq('id', estimacionId);

        // Regenera silenciosamente o DOCX e PDF da proposta/contrato ativa mantendo o mesmo link
        try {
          await supabase.functions.invoke('generate-proposal', {
            body: {
              estimacion_id: estimacionId,
              reprocess_only: true,
            },
          });
        } catch (reprocessErr) {
          console.warn('[EditClientModal] Aviso ao reprocessar proposta:', reprocessErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_contacts', client.id] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail'] });
      queryClient.invalidateQueries({ queryKey: ['estimaciones'] });

      toast.success('Dados fiscais e representante legal atualizados com sucesso!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar dados do cliente', { description: err.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="p-5 px-6 pb-4 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Editar Dados Cadastrais & Fiscais do Cliente
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Estas informações serão inseridas automaticamente no cabeçalho do Contrato Comercial e das Faturas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Razão Social (Legal Name) <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Ex: Tamarco Metalúrgica SL"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Nome Comercial (Fantasia)
              </Label>
              <Input
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Ex: Tamarco"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                CIF / NIF / Tax ID <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="Ex: B72361843"
                className="h-9 text-xs uppercase font-mono font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Telefone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+34 912 345 678"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Endereço Completo da Sede (Morada)
            </Label>
            <Input
              value={formData.address_line}
              onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
              placeholder="Ex: C/ Embalse, 1, El Puerto de Santa María"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Código Postal</Label>
              <Input
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="11500"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cádiz"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Província / Estado</Label>
              <Input
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Cádiz"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">E-mail de Cobrança / Financeiro</Label>
              <Input
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                placeholder="faturamento@empresa.es"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">E-mail Principal / Comercial</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.es"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Representante Legal (Firmante do Contrato) */}
          <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                <UserCheck className="h-4 w-4" />
                Representante Legal (Quem Assina o Contrato)
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPublicFormLink}
                className="h-7 text-[11px] px-2.5 gap-1.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10"
              >
                {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
                {copiedLink ? 'Link Copiado!' : 'Copiar Link p/ Cliente Preencher'}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Nome Completo (Firmante)</Label>
                <Input
                  value={formData.legal_rep_name}
                  onChange={(e) => setFormData({ ...formData, legal_rep_name: e.target.value })}
                  placeholder="Ex: Juan Pérez García"
                  className="h-8 text-xs bg-white dark:bg-slate-950"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">NIF / DNI Pessoal</Label>
                <Input
                  value={formData.legal_rep_tax_id}
                  onChange={(e) => setFormData({ ...formData, legal_rep_tax_id: e.target.value.toUpperCase() })}
                  placeholder="Ex: 12345678Z"
                  className="h-8 text-xs font-mono uppercase font-semibold bg-white dark:bg-slate-950"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Cargo / Qualidade</Label>
                <Input
                  value={formData.legal_rep_role}
                  onChange={(e) => setFormData({ ...formData, legal_rep_role: e.target.value })}
                  placeholder="Administrador / Rep. Legal"
                  className="h-8 text-xs bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-9"
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold gap-1.5"
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
