import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Info, DollarSign } from 'lucide-react';

interface Props {
  data: any;
}

export function EstimacionReviewStep({ data }: Props) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const hasItems = data.items.length > 0;
  const isMarginLow = data.estimated_margin_percent < 15;
  const missingRates = data.items.some((i: any) => i.sell_rate_hour <= 0);

  const totalWorkers = data.items.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
  const totalHours = data.items.reduce((acc: number, item: any) => acc + Number(item.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Revisão e Confirmação</h2>
        <p className="text-sm text-muted-foreground">Verifique os totais calculados e eventuais alertas antes de salvar.</p>
      </div>

      {!hasItems && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Orçamento Vazio</AlertTitle>
          <AlertDescription>
            Você não adicionou nenhum perfil profissional no Passo 2. 
            A estimación não pode ser salva sem pelo menos um item.
          </AlertDescription>
        </Alert>
      )}

      {missingRates && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Tarifas Zeradas</AlertTitle>
          <AlertDescription>
            Existem perfis com tarifa de venda igual a 0. Revise os valores antes de enviar para aprovação.
          </AlertDescription>
        </Alert>
      )}

      {hasItems && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Validação Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Total de Trabalhadores:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalWorkers}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Volume de Horas (Estimado):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalHours}h</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Quantidade de Perfis/Funções:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{data.items.length}</span>
              </div>
              
              {data.costs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2 font-medium">Custos Adicionais Declarados:</span>
                  <div className="flex flex-wrap gap-2">
                    {data.costs.map((c: any) => (
                      <span key={c.id} className="text-xs bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300">
                        {c.cost_category} ({formatCurrency(c.amount)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-950/20 border-2 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center text-slate-700 dark:text-slate-300">
                <DollarSign className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" /> Viabilidade Financeira
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Custo Base Estimado:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300">{formatCurrency(data.total_estimated_cost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-blue-700 dark:text-blue-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span>Receita Total Estimada:</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(data.total_estimated_revenue)}</span>
              </div>
              
              <div className="pt-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1">Margem Global Calculada:</span>
                <div className="flex items-center space-x-3">
                  <span className={`text-3xl font-black tracking-tight ${
                    data.estimated_margin_percent >= 20 ? 'text-emerald-600 dark:text-emerald-400' :
                    data.estimated_margin_percent >= 10 ? 'text-amber-600 dark:text-amber-500' : 'text-red-650 dark:text-red-500'
                  }`}>
                    {data.estimated_margin_percent}%
                  </span>
                  
                  {isMarginLow && (
                    <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md border border-amber-250 dark:border-amber-900/40">
                      <AlertTriangle className="h-3 w-3 mr-1 text-amber-600 dark:text-amber-400" />
                      Margem abaixo do recomendado (15%)
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-200 flex items-start mt-6">
        <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 shrink-0" />
        <p>
          Ao <strong>Salvar Rascunho</strong>, o orçamento fica salvo mas não aparece para o fluxo de revisão. 
          Ao <strong>Salvar e Enviar</strong>, ele fica disponível para aprovação do Diretor Comercial que, quando aprovado, gerará o Pedido Oficial e as tarefas operacionais.
        </p>
      </div>
    </div>
  );
}
