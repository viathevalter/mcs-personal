import { useState } from 'react';
import { usePaymentTerms } from '../../hooks/usePaymentTerms';
import { useMutateClient } from '../../hooks/useClients';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Client } from '../../types';
import { Wallet, ShieldAlert, CreditCard, Landmark } from 'lucide-react';

interface ClientFinanceTabProps {
  client: Client;
}

export function ClientFinanceTab({ client }: ClientFinanceTabProps) {
  const { data: paymentTerms = [] } = usePaymentTerms();
  const { updateClient, isUpdating } = useMutateClient();

  const [paymentTermId, setPaymentTermId] = useState(client.payment_term_id || 'none');
  const [financialStatus, setFinancialStatus] = useState(client.financial_status || 'active');
  const [creditLimit, setCreditLimit] = useState(client.credit_limit?.toString() || '0');

  const handleSave = async () => {
    try {
      await updateClient({
        id: client.id!,
        payload: {
          payment_term_id: paymentTermId === 'none' ? null : paymentTermId,
          financial_status: financialStatus as any,
          credit_limit: parseFloat(creditLimit) || 0,
        } as any,
      });
      toast.success('Parâmetros financeiros atualizados com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao atualizar dados financeiros.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Dados Financeiros e Faturamento</h2>
        <p className="text-sm text-muted-foreground">
          Configure as regras de cobrança, limite de risco e prazos de faturamento para este cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Billing Configuration Card */}
        <div className="border rounded-xl p-5 bg-card space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Regras de Cobrança</h3>
              <p className="text-xs text-muted-foreground">Prazos de vencimento das faturas</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="tab_payment_term">Prazo de Pagamento Padrão</Label>
            <Select value={paymentTermId} onValueChange={setPaymentTermId}>
              <SelectTrigger id="tab_payment_term" className="focus-visible:ring-orange-500">
                <SelectValue placeholder="Selecione o prazo padrão..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum / A combinar</SelectItem>
                {paymentTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Este prazo será utilizado como padrão ao criar propostas comerciais para este cliente.
            </p>
          </div>
        </div>

        {/* Risk & Credit Configuration Card */}
        <div className="border rounded-xl p-5 bg-card space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Risco e Limite de Crédito</h3>
              <p className="text-xs text-muted-foreground">Status e teto de inadimplência</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="tab_financial_status">Status Financeiro</Label>
              <Select value={financialStatus} onValueChange={setFinancialStatus}>
                <SelectTrigger id="tab_financial_status" className="focus-visible:ring-orange-500">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Regular / Ativo</SelectItem>
                  <SelectItem value="debtor">Inadimplente / Devedor</SelectItem>
                  <SelectItem value="blocked">Bloqueado para Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tab_credit_limit">Limite de Crédito (€)</Label>
              <Input
                id="tab_credit_limit"
                type="number"
                min={0}
                placeholder="Ex: 5000"
                className="focus-visible:ring-orange-500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Debt summary indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-xl p-5 bg-slate-50 dark:bg-slate-900/30">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Saldo Devedor Atual</div>
            <div className="text-lg font-bold text-foreground">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(client.current_debt || 0)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Faturamento Acumulado (Mês)</div>
            <div className="text-lg font-bold text-foreground">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={handleSave} 
          disabled={isUpdating} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6"
        >
          {isUpdating ? 'Salvando...' : 'Salvar Alterações Financeiras'}
        </Button>
      </div>

    </div>
  );
}
