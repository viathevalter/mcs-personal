import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Info, DollarSign, Activity, ShieldCheck, ShieldAlert, Coins, Sparkles, Building, Calendar, CreditCard } from 'lucide-react';
import { calculateViability } from '../utils/viabilityEngine';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  client?: any;
  settings?: any;
}

export function EstimacionReviewStep({ data, client, settings }: Props) {
  const { t } = useTranslation();
  const viability = calculateViability(data, client, settings, t);

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
        return t('comercial.costCategories.housing');
      case 'epi':
        return t('comercial.costCategories.epi');
      case 'transport':
        return t('comercial.costCategories.transport');
      case 'social_security':
        return t('comercial.costCategories.social_security');
      case 'documentation':
        return t('comercial.costCategories.documentation');
      case 'other':
      default:
        return t('comercial.costCategories.other');
    }
  };

  const hasItems = data.items.length > 0;
  const missingRates = data.items.some((i: any) => i.sell_rate_hour <= 0);

  const totalWorkers = data.items.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
  const totalHours = data.items.reduce((acc: number, item: any) => acc + Number(item.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">{t('comercial.stepReview.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('comercial.stepReview.subtitle')}</p>
      </div>

      {!hasItems && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('comercial.stepReview.emptyBudgetTitle')}</AlertTitle>
          <AlertDescription>
            {t('comercial.stepReview.emptyBudgetDesc')}
          </AlertDescription>
        </Alert>
      )}

      {missingRates && (
        <Alert className="bg-amber-55 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>{t('comercial.stepReview.zeroRatesTitle')}</AlertTitle>
          <AlertDescription>
            {t('comercial.stepReview.zeroRatesDesc')}
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
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> {t('comercial.stepReview.technicalValidation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('comercial.stepReview.totalWorkersLabel')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{totalWorkers}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('comercial.stepReview.totalHoursLabel')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{totalHours}h</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('comercial.stepReview.workScheduleLabel')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {(() => {
                      const wl = data.hours_lunes ?? data.hours_weekday ?? 8.0;
                      const wt = data.hours_martes ?? data.hours_weekday ?? 8.0;
                      const wq = data.hours_miercoles ?? data.hours_weekday ?? 8.0;
                      const wqi = data.hours_jueves ?? data.hours_weekday ?? 8.0;
                      const wv = data.hours_viernes ?? data.hours_weekday ?? 8.0;
                      const dw = data.hours_weekday ?? 8.0;
                      const isCustom = wl !== dw || wt !== dw || wq !== dw || wqi !== dw || wv !== dw;

                      const parts = [];
                      if (isCustom) {
                        if (data.work_lunes !== false) parts.push(`${t('comercial.stepGeneral.mondayShort')} (${wl}h)`);
                        if (data.work_martes !== false) parts.push(`${t('comercial.stepGeneral.tuesdayShort')} (${wt}h)`);
                        if (data.work_miercoles !== false) parts.push(`${t('comercial.stepGeneral.wednesdayShort')} (${wq}h)`);
                        if (data.work_jueves !== false) parts.push(`${t('comercial.stepGeneral.thursdayShort')} (${wqi}h)`);
                        if (data.work_viernes !== false) parts.push(`${t('comercial.stepGeneral.fridayShort')} (${wv}h)`);
                      } else {
                        if (data.work_lunes !== false) parts.push(`${t('comercial.stepGeneral.monFriShort')} (${dw}h)`);
                      }
                      if (data.work_sabado) parts.push(`${t('comercial.stepGeneral.saturdayShort')} (${data.hours_sabado ?? 0}h)`);
                      if (data.work_domingo) parts.push(`${t('comercial.stepGeneral.sundayShort')} (${data.hours_domingo ?? 0}h)`);
                      return parts.join(' | ') || t('comercial.stepReview.noActiveDays', { defaultValue: 'Nenhum dia ativo' });
                    })()}
                  </span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('comercial.stepReview.totalProfilesLabel')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{data.items.length}</span>
                </div>
                
                {data.costs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2 font-medium">{t('comercial.stepReview.additionalCostsDeclared')}</span>
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
                  <DollarSign className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" /> {t('comercial.stepReview.financialViability')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('comercial.stepReview.estimatedBaseCost')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-300">{formatCurrency(data.total_estimated_cost)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-blue-700 dark:text-blue-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>{t('comercial.stepReview.estimatedTotalRevenue')}</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(data.total_estimated_revenue)}</span>
                </div>
                
                <div className="pt-2">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1">{t('comercial.stepReview.directMarginCalculated')}</span>
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
                        {t('comercial.stepReview.belowRecommended', { margin: settings?.min_margin_percent || 15 })}
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
                {t('comercial.stepReview.financialBreakdown')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('comercial.stepReview.financialBreakdownDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4">{t('comercial.stepReview.thGroupCategory')}</th>
                      <th className="p-3">{t('comercial.stepReview.thType')}</th>
                      <th className="p-3 text-right pr-4">{t('comercial.stepReview.thAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                      <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.baseProfileRevenue')}</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-450 font-medium">{t('comercial.stepReview.revenueLabel')}</td>
                      <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalBaseRevenue)}</td>
                    </tr>
                    {totalRechargeableRevenue > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.rechargeableCostsRevenue')}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-455 font-medium">{t('comercial.stepReview.revenueLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalRechargeableRevenue)}</td>
                      </tr>
                    )}
                    {(() => {
                      const additionalRevenuesSum = (data.additional_revenues || []).reduce(
                        (sum: number, r: any) => sum + Number(r.amount || 0),
                        0
                      );
                      if (additionalRevenuesSum > 0) {
                        return (
                          <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                            <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">
                              {t('comercial.stepReview.additionalRevenuesGroup')}
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block pt-0.5 font-normal">
                                {(data.additional_revenues || []).map((r: any) => `${r.description || t('comercial.stepReview.revenueLabel')}: ${formatCurrency(r.amount)}`).join(', ')}
                              </span>
                            </td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-455 font-medium">{t('comercial.stepReview.revenueLabel')}</td>
                            <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(additionalRevenuesSum)}</td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    <tr className="bg-emerald-50/30 dark:bg-emerald-950/10 font-bold border-b border-slate-250 dark:border-slate-800">
                      <td className="p-3 pl-4">{t('comercial.stepReview.totalRevenuesSummary')}</td>
                      <td className="p-3"></td>
                      <td className="p-3 font-mono text-emerald-700 dark:text-emerald-400 text-right pr-4">{formatCurrency(data.total_estimated_revenue)}</td>
                    </tr>

                    {/* Custos */}
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                      <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.baseSalariesCost')}</td>
                      <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                      <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalSalaries)}</td>
                    </tr>
                    {totalSocialSecurity > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.socialSecurityCost')}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalSocialSecurity)}</td>
                      </tr>
                    )}
                    {totalHousing > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.housingCost')}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalHousing)}</td>
                      </tr>
                    )}
                    {totalEpi > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.epiCost')}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalEpi)}</td>
                      </tr>
                    )}
                    {totalTransport > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.transportCost')}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalTransport)}</td>
                      </tr>
                    )}
                    {totalOthers > 0 && (
                      <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 pl-4 text-slate-750 dark:text-slate-300 font-medium">{t('comercial.stepReview.brokerOtherCosts')}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-455 font-medium">{t('comercial.stepReview.costLabel')}</td>
                        <td className="p-3 font-mono text-slate-900 dark:text-white text-right pr-4">{formatCurrency(totalOthers)}</td>
                      </tr>
                    )}
                    <tr className="bg-rose-50/30 dark:bg-rose-950/10 font-bold border-b border-slate-250 dark:border-slate-800">
                      <td className="p-3 pl-4">{t('comercial.stepReview.totalCostsSummary')}</td>
                      <td className="p-3"></td>
                      <td className="p-3 font-mono text-rose-700 dark:text-rose-450 text-right pr-4">{formatCurrency(data.total_estimated_cost)}</td>
                    </tr>

                    {/* Resultado */}
                    <tr className="bg-indigo-50/45 dark:bg-indigo-950/20 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3.5 pl-4 text-indigo-900 dark:text-indigo-300 text-sm">{t('comercial.stepReview.grossProfitMargin')}</td>
                      <td className="p-3.5 text-indigo-700 dark:text-indigo-400 font-bold text-sm">{t('comercial.stepReview.resultLabel')}</td>
                      <td className="p-3.5 font-mono text-indigo-950 dark:text-white text-right pr-4 text-sm">
                        {formatCurrency(data.total_estimated_revenue - data.total_estimated_cost)}
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block pt-0.5">
                          {t('comercial.stepReview.marginPercentSummary', { margin: data.estimated_margin_percent })}
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
                    {t('comercial.stepReview.viabilityAnalysisTitle')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('comercial.stepReview.viabilityAnalysisDesc')}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">{t('comercial.stepReview.generalStatusLabel')}</span>
                  {viability.status === 'viable' ? (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-405 border border-emerald-200 dark:border-emerald-900/40">
                      <ShieldCheck className="h-3 w-3 mr-1.5" /> {t('comercial.stepReview.statusViable')}
                    </span>
                  ) : viability.status === 'warning' ? (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-405 border border-amber-200 dark:border-amber-900/40">
                      <ShieldAlert className="h-3 w-3 mr-1.5" /> {t('comercial.stepReview.statusWarning')}
                    </span>
                  ) : (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-405 border border-red-200 dark:border-red-900/40">
                      <ShieldAlert className="h-3 w-3 mr-1.5" /> {t('comercial.stepReview.statusCritical')}
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
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comercial.stepReview.ivpIndex')}</span>
                  <span className={`text-5xl font-black ${
                    viability.ivp >= (settings?.ivp_min_threshold || 5) ? 'text-emerald-600 dark:text-emerald-400' :
                    viability.ivp >= 0 ? 'text-amber-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {viability.ivp.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-2 text-center">
                    {t('comercial.stepReview.ivpRequired', { min: settings?.ivp_min_threshold || '5.0' })}
                  </span>
                </div>

                {/* Margem Líquida */}
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Coins className="h-16 w-16 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comercial.stepReview.netProfitability')}</span>
                  <span className={`text-4xl font-black ${
                    viability.rentabilidad >= 10 ? 'text-emerald-600 dark:text-emerald-400' :
                    viability.rentabilidad >= 0 ? 'text-amber-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {viability.rentabilidad.toFixed(2)}%
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground mt-2 text-center">
                    {t('comercial.stepReview.netResultValue', { net: formatCurrency(viability.neto) })}
                  </span>
                </div>

                {/* Fator K */}
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="h-16 w-16 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comercial.stepReview.factorKLabel')}</span>
                  <span className="text-4xl font-black text-slate-850 dark:text-slate-100">
                    {formatCurrency(viability.indiceK)}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-2 text-center">
                    {t('comercial.stepReview.factorKDesc')}
                  </span>
                </div>
              </div>

              {/* Breakdown detail of Indirect Costs */}
              <div className="bg-slate-100/50 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 mb-3 flex items-center">
                  <Coins className="h-4 w-4 mr-2 text-indigo-500" />
                  {t('comercial.stepReview.indirectCostsBreakdown')}
                </h4>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">{t('comercial.stepReview.fixedAdminExpenses')}</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.gastosFijos)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">{t('comercial.stepReview.estimatedSSTrabs')}</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.segSocialTrabajadores)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">{t('comercial.stepReview.platformsLicenses')}</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(viability.plataformas)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50 font-semibold text-indigo-650 dark:text-indigo-400">
                    <span>{t('comercial.stepReview.totalEstimatedIndirectCosts')}</span>
                    <span className="font-mono">{formatCurrency(viability.operativos)}</span>
                  </div>
                </div>
              </div>

              {/* Warnings and Risk logs */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100">{t('comercial.stepReview.riskAlertsTitle')}</h4>
                
                {/* Credit Risk Panel */}
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.clientCreditRiskTitle')}</p>
                      {client ? (
                        <p className="text-xs text-muted-foreground">
                          {t('comercial.stepReview.clientCreditStatus', {
                            status: client.financial_status === 'active' 
                              ? t('comercial.stepReview.creditStatusGood') 
                              : client.financial_status === 'debtor' 
                              ? t('comercial.stepReview.creditStatusDebtor') 
                              : t('comercial.stepReview.creditStatusBlocked')
                          })}
                          {client.credit_limit !== null && t('comercial.stepReview.creditLimitVal', { limit: formatCurrency(client.credit_limit) })}
                          {client.current_debt !== null && t('comercial.stepReview.creditDebtVal', { debt: formatCurrency(client.current_debt) })}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground text-amber-600">{t('comercial.stepReview.noClientSelectedRisk')}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {client?.financial_status === 'blocked' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 uppercase">{t('comercial.stepReview.badgeBlocked')}</span>
                    ) : client?.financial_status === 'debtor' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase">{t('comercial.stepReview.badgeDebtor')}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 uppercase">{t('comercial.stepReview.badgeRegular')}</span>
                    )}
                  </div>
                </div>

                {/* Sazonal Coastal Lodging Warning */}
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.coastalLodgingTitle')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('comercial.stepReview.coastalLodgingDesc')}
                      </p>
                    </div>
                  </div>
                  <div>
                    {viability.coastalSummerRisk ? (
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase flex items-center animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" /> {t('comercial.stepReview.summerRiskBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">{t('comercial.stepReview.noAlertBadge')}</span>
                    )}
                  </div>
                </div>

                {/* Detailed reasons list if approval is needed */}
                {viability.reasons.length > 0 && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2.5 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-bold text-amber-900 dark:text-amber-450">{t('comercial.stepReview.outsideStandardPolicy')}</h5>
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
        <p dangerouslySetInnerHTML={{
          __html: t('comercial.stepReview.bottomInfoBanner', {
            defaultValue: 'Ao <strong>Salvar Rascunho</strong>, o orçamento fica salvo mas não entra no fluxo de revisão. Ao <strong>Salvar e Enviar</strong> (ou <strong>Solicitar Aprovação Comercial</strong>), ele segue as regras de validação para revisão ou envio direto.'
          })
        }} />
      </div>
    </div>
  );
}
