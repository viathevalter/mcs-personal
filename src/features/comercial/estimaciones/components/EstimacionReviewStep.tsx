import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Info, DollarSign, Activity, ShieldCheck, ShieldAlert, Coins, Sparkles, Building, Calendar, CreditCard } from 'lucide-react';
import { calculateViability } from '../utils/viabilityEngine';

interface Props {
  data: any;
  client?: any;
  settings?: any;
}

export function EstimacionReviewStep({ data, client, settings }: Props) {
  const viability = calculateViability(data, client, settings);

  const totalBaseRevenue = data.items.reduce((sum: number, item: any) => sum + (Number(item.sell_rate_hour || 0) * Number(item.total_hours || 0)), 0);
  const totalRechargeableRevenue = (data.costs || []).reduce((sum: number, c: any) => { 
    if (c.is_rechargeable) { 
      return sum + (Number(c.amount || 0) * (1 + (Number(c.markup_percent || 0) / 100))); 
    } 
    return sum; 
  }, 0);
  const totalSalaries = data.items.reduce((sum: number, item: any) => sum + (Number(item.base_cost_hour || 0) * Number(item.total_hours || 0)), 0);
  const totalSocialSecurity = (data.costs || []).filter((c: any) => c.cost_category === 'social_security').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalHousing = (data.costs || []).filter((c: any) => c.cost_category === 'housing').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalEpi = (data.costs || []).filter((c: any) => c.cost_category === 'epi').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalTransport = (data.costs || []).filter((c: any) => c.cost_category === 'transport').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalOthers = (data.costs || []).filter((c: any) => c.cost_category !== 'social_security' && c.cost_category !== 'housing' && c.cost_category !== 'epi' && c.cost_category !== 'transport').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'housing':
        return 'alojamento';
      case 'epi':
        return 'epi';
      case 'transport':
        return 'transporte';
      case 'social_security':
        return 'seguridade social';
      case 'documentation':
        return 'documentação';
      case 'other':
      default:
        return 'outros';
    }
  };

  const hasItems = data.items.length > 0;
  const missingRates = data.items.some((i: any) => i.sell_rate_hour <= 0);

  const totalWorkers = data.items.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
  const totalHours = data.items.reduce((acc: number, item: any) => acc + Number(item.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Revisão e Confirmação</h2>
        <p className="text-sm text-muted-foreground">Verifique os totais calculados e a análise de viabilidade antes de salvar.</p>
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
        <Alert className="bg-amber-55 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Tarifas Zeradas</AlertTitle>
          <AlertDescription>
            Existem perfis com tarifa de venda igual a 0. Revise os valores antes de enviar para aprovação.
          </AlertDescription>
        </Alert>
      )}

      {hasItems && (
        <>
          {/* Main Stats Summary cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow">
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
                          {getCategoryLabel(c.cost_category)} ({formatCurrency(c.amount)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-950/20 border-2 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center text-slate-700 dark:text-slate-300">
                  <DollarSign className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" /> Viabilidade Financeira (Custos Diretos)
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
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1">Margem Direta Calculada:</span>
                  <div className="flex items-center space-x-3">
                    <span className={`text-3xl font-black tracking-tight ${
                      data.estimated_margin_percent >= 20 ? 'text-emerald-600 dark:text-emerald-400' :
                      data.estimated_margin_percent >= 10 ? 'text-amber-600 dark:text-amber-500' : 'text-red-650 dark:text-red-500'
                    }`}>
                      {data.estimated_margin_percent}%
                    </span>
                    
                    {viability.marginRisk && (
                      <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md border border-amber-250 dark:border-amber-900/40">
                        <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />
                        Abaixo do recomendado ({settings?.min_margin_percent || 15}%)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table Breakdown of Costs and Margin */}
          <Card className="hover:shadow-md transition-shadow border-slate-250 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/40">
              <CardTitle className="text-sm font-semibold flex items-center text-slate-700 dark:text-slate-350">
                <Coins className="h-4 w-4 mr-2 text-indigo-500" />
                Detalhamento Financeiro (Margem Direta)
              </CardTitle>
              <CardDescription className="text-xs">
                Demonstrativo de receitas, salários base e custos diretos que compõem a margem direta calculada.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4">Grupo / Categoria</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right pr-4">Valor (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {/* Receitas */}
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                      <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Faturamento de Perfis (Tarifa de Venda)</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-450 font-medium">Receita</td>
                      <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalBaseRevenue)}</td>
                    </tr>
                    {totalRechargeableRevenue > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Reembolso de Custos Logísticos (Markup)</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-450 font-medium">Receita</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalRechargeableRevenue)}</td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50/30 dark:bg-emerald-950/10 font-bold border-b border-slate-250 dark:border-slate-800">
                      <td className="p-3 pl-4">Total de Receitas (A)</td>
                      <td className="p-3"></td>
                      <td className="p-3 font-mono text-emerald-700 dark:text-emerald-400 text-right pr-4">{formatCurrency(data.total_estimated_revenue)}</td>
                    </tr>

                    {/* Custos */}
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                      <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Salários Base de Perfis (Mão de Obra)</td>
                      <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                      <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalSalaries)}</td>
                    </tr>
                    {totalSocialSecurity > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Segurança Social (Encargos)</td>
                        <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalSocialSecurity)}</td>
                      </tr>
                    )}
                    {totalHousing > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Alojamento / Moradia</td>
                        <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalHousing)}</td>
                      </tr>
                    )}
                    {totalEpi > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">EPIs (Material e Envio)</td>
                        <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalEpi)}</td>
                      </tr>
                    )}
                    {totalTransport > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Transporte</td>
                        <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalTransport)}</td>
                      </tr>
                    )}
                    {totalOthers > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">Comissões / Outros Custos Adicionais</td>
                        <td className="p-3 text-rose-600 dark:text-rose-450 font-medium">Custo</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalOthers)}</td>
                      </tr>
                    )}
                    <tr className="bg-rose-50/30 dark:bg-rose-950/10 font-bold border-b border-slate-250 dark:border-slate-800">
                      <td className="p-3 pl-4">Total de Custos (B)</td>
                      <td className="p-3"></td>
                      <td className="p-3 font-mono text-rose-700 dark:text-rose-450 text-right pr-4">{formatCurrency(data.total_estimated_cost)}</td>
                    </tr>

                    {/* Resultado */}
                    <tr className="bg-indigo-50/45 dark:bg-indigo-950/20 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3.5 pl-4 text-indigo-900 dark:text-indigo-300 text-sm">Lucro Bruto Comercial / Margem Direta (A - B)</td>
                      <td className="p-3.5 text-indigo-700 dark:text-indigo-400 font-bold text-sm">Resultado</td>
                      <td className="p-3.5 font-mono text-indigo-950 dark:text-white text-right pr-4 text-sm">
                        {formatCurrency(data.total_estimated_revenue - data.total_estimated_cost)}
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block pt-0.5">
                          Margem: {data.estimated_margin_percent}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Economic Viability & Risk Dashboard */}
          <Card className="overflow-hidden border-slate-250 dark:border-slate-800 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-950/20 dark:to-slate-950/10 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-gradient-to-r from-slate-100/40 to-white dark:from-slate-950/40 dark:to-slate-950/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center text-slate-800 dark:text-white">
                    <Activity className="h-5 w-5 mr-2 text-indigo-500" />
                    Análise de Risco e Viabilidade Econômica
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulação matemática baseada em custos operativos indiretos e indicadores de risco.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Status Geral:</span>
                  {viability.status === 'viable' ? (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                      <ShieldCheck className="h-3 w-3 mr-1.5" /> Viável
                    </span>
                  ) : viability.status === 'warning' ? (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                      <ShieldAlert className="h-3 w-3 mr-1.5" /> Sob Análise / Risco Médio
                    </span>
                  ) : (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                      <ShieldAlert className="h-3 w-3 mr-1.5" /> Crítico / Bloqueado
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* IVP & Profitability Section */}
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Dial/Display of IVP */}
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles className="h-16 w-16 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Índice IVP</span>
                  <span className={`text-5xl font-black ${
                    viability.ivp >= (settings?.ivp_min_threshold || 5) ? 'text-emerald-600 dark:text-emerald-400' :
                    viability.ivp >= 0 ? 'text-amber-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {viability.ivp.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-2 text-center">
                    Mínimo Exigido: <strong className="font-semibold">{settings?.ivp_min_threshold || '5.0'}</strong>
                  </span>
                </div>

                {/* Margem Líquida */}
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Coins className="h-16 w-16 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rentabilidade Líquida</span>
                  <span className={`text-4xl font-black ${
                    viability.rentabilidad >= 10 ? 'text-emerald-600 dark:text-emerald-400' :
                    viability.rentabilidad >= 0 ? 'text-amber-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {viability.rentabilidad.toFixed(2)}%
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground mt-2 text-center">
                    Resultado Líquido: {formatCurrency(viability.neto)}
                  </span>
                </div>

                {/* Fator K */}
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="h-16 w-16 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fator K (Retorno/H-Mês)</span>
                  <span className="text-4xl font-black text-slate-850 dark:text-slate-100">
                    {formatCurrency(viability.indiceK)}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-2 text-center">
                    Lucro líquido mensal por trabalhador
                  </span>
                </div>
              </div>

              {/* Breakdown detail of Indirect Costs */}
              <div className="bg-slate-100/50 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 mb-3 flex items-center">
                  <Coins className="h-4 w-4 mr-2 text-indigo-500" />
                  Detalhamento de Custos Operativos Indiretos
                </h4>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Gastos Administrativos / Fixos:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.gastosFijos)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Seguridade Social Estimada (Trabalhadores):</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.segSocialTrabajadores)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Plataformas / Licenças e Sistemas:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.plataformas)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50 font-semibold text-indigo-650 dark:text-indigo-400">
                    <span>Total Custos Indiretos Estimados:</span>
                    <span className="font-mono">{formatCurrency(viability.operativos)}</span>
                  </div>
                </div>
              </div>

              {/* Warnings and Risk logs */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100">Crivo de Riscos & Alertas</h4>
                
                {/* Credit Risk Panel */}
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Risco Financeiro do Cliente</p>
                      {client ? (
                        <p className="text-xs text-muted-foreground">
                          Status: <span className="font-medium text-slate-700 dark:text-slate-300">
                            {client.financial_status === 'active' ? 'Em dia' : client.financial_status === 'debtor' ? 'Inadimplente (Com Faturas)' : 'Bloqueado'}
                          </span> 
                          {client.credit_limit !== null && ` | Limite: ${formatCurrency(client.credit_limit)}`}
                          {client.current_debt !== null && ` | Dívida Atual: ${formatCurrency(client.current_debt)}`}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground text-amber-600">Nenhum cliente cadastrado selecionado (lead de marketing).</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {client?.financial_status === 'blocked' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 uppercase">Bloqueado</span>
                    ) : client?.financial_status === 'debtor' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase">Inadimplente</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 uppercase">Regular</span>
                    )}
                  </div>
                </div>

                {/* Sazonal Coastal Lodging Warning */}
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Disponibilidade de Alojamento no Litoral</p>
                      <p className="text-xs text-muted-foreground">
                        Validação de impacto sazonal (verão europeu em zonas turísticas costeiras).
                      </p>
                    </div>
                  </div>
                  <div>
                    {viability.coastalSummerRisk ? (
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase flex items-center animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Risco de Verão
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">Sem Alerta</span>
                    )}
                  </div>
                </div>

                {/* Detailed reasons list if approval is needed */}
                {viability.reasons.length > 0 && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2.5 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-bold text-amber-900 dark:text-amber-450">Parâmetros fora da política comercial standard:</h5>
                        <ul className="list-disc pl-5 mt-1.5 text-xs text-amber-800 dark:text-amber-400 space-y-1">
                          {viability.reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-200 flex items-start mt-6">
        <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 shrink-0" />
        <p>
          Ao <strong>Salvar Rascunho</strong>, o orçamento fica salvo mas não entra no fluxo de revisão. 
          Ao <strong>Salvar e Enviar</strong> (ou <strong>Solicitar Aprovação Comercial</strong>), ele segue as regras de validação para revisão ou envio direto.
        </p>
      </div>
    </div>
  );
}

