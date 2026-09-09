import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Save, Loader2 } from 'lucide-react';
import { useMutateClient } from '@/features/master-data/clients/hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
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
  };
  estimacionId?: string;
}

export function EditClientModal({ isOpen, onClose, client, estimacionId }: EditClientModalProps) {
  const { updateClient, isUpdating } = useMutateClient();
  const queryClient = useQueryClient();

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
  });

  useEffect(() => {
    if (client) {
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
      });
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id) return;

    if (!formData.legal_name.trim()) {
      toast.error('A Razão Social é obrigatória para contratos e faturamento');
      return;
    }
    if (!formData.tax_id.trim()) {
      toast.error('O CIF / NIF é obrigatório');
      return;
    }

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
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail'] });
      queryClient.invalidateQueries({ queryKey: ['estimaciones'] });

      toast.success('Dados fiscais do cliente atualizados com sucesso!');
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
