import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { useJobFunctions, useAllJobFunctionRates } from '../hooks/useJobFunctions';
import { useSpainProvinces } from '../hooks/useSpainProvinces';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useCountries } from '@/features/master-data/locations/hooks/useLocations';
import { useLodgingRates } from '../hooks/useLodgingRates';
import { useCountryTaxParameters } from '../hooks/useCountryTaxParameters';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

// Utility functions for date calculations
function countWeekdays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;
  
  let count = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function countTotalDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return diffDays;
}

function getBaseLodgingRate(countryId: string, regionId: string | null | undefined, lodgingRates: any[]): number {
  if (regionId) {
    const regBase = lodgingRates.find(
      (r) => r.country_id === countryId && 
             r.region_id === regionId && 
             !r.start_date && 
             !r.end_date
    );
    if (regBase) return Number(regBase.rate_per_day);
  }
  const countryBase = lodgingRates.find(
    (r) => r.country_id === countryId && 
           !r.region_id && 
           !r.start_date && 
           !r.end_date
  );
  return countryBase ? Number(countryBase.rate_per_day) : 0;
}

function getRateForDay(day: Date, countryId: string, regionId: string | null | undefined, lodgingRates: any[]): number {
  const yyyy = day.getFullYear();
  const mm = String(day.getMonth() + 1).padStart(2, '0');
  const dd = String(day.getDate()).padStart(2, '0');
  const dayStr = `${yyyy}-${mm}-${dd}`;

  if (regionId) {
    // 1. Regional seasonal rate covering 'day'
    const regSeasonal = lodgingRates.find(
      (r) => r.country_id === countryId && 
             r.region_id === regionId && 
             r.start_date && 
             r.end_date && 
             dayStr >= r.start_date && 
             dayStr <= r.end_date
    );
    if (regSeasonal) return Number(regSeasonal.rate_per_day);

    // 2. Regional base rate
    const regBase = lodgingRates.find(
      (r) => r.country_id === countryId && 
             r.region_id === regionId && 
             !r.start_date && 
             !r.end_date
    );
    if (regBase) return Number(regBase.rate_per_day);
  }

  // 3. Country seasonal rate covering 'day'
  const countrySeasonal = lodgingRates.find(
    (r) => r.country_id === countryId && 
           !r.region_id && 
           r.start_date && 
           r.end_date && 
           dayStr >= r.start_date && 
           dayStr <= r.end_date
  );
  if (countrySeasonal) return Number(countrySeasonal.rate_per_day);

  // 4. Country base rate
  const countryBase = lodgingRates.find(
    (r) => r.country_id === countryId && 
           !r.region_id && 
           !r.start_date && 
           !r.end_date
  );
  return countryBase ? Number(countryBase.rate_per_day) : 0;
}

function calculateEffectiveLodgingRate({
  countryId,
  regionId,
  startDateStr,
  endDateStr,
  lodgingRates
}: {
  countryId: string;
  regionId: string | null | undefined;
  startDateStr: string | null | undefined;
  endDateStr: string | null | undefined;
  lodgingRates: any[];
}): number {
  if (!startDateStr || !endDateStr) {
    return getBaseLodgingRate(countryId, regionId, lodgingRates);
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return getBaseLodgingRate(countryId, regionId, lodgingRates);
  }

  const totalDays = countTotalDays(startDateStr, endDateStr);
  if (totalDays <= 0) return 0;

  let totalCost = 0;
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    totalCost += getRateForDay(day, countryId, regionId, lodgingRates);
  }

  return totalCost / totalDays;
}


export function EstimacionItemsStep({ data, onChange }: Props) {
  const { data: jobFunctions = [] } = useJobFunctions();
  const { data: rateRefs = [] } = useAllJobFunctionRates();
  const { data: spainProvinces = [] } = useSpainProvinces();
  const { data: sites = [] } = useClientSites(data.client_id || undefined);
  const { data: countries = [] } = useCountries();
  const { data: lodgingRates = [] } = useLodgingRates();
  const { data: taxParams = [] } = useCountryTaxParameters();

  let postalCode = '';
  if (data.lead_id) {
    postalCode = data.postal_code || '';
  } else if (data.client_site_id) {
    const site = sites.find((s: any) => s.id === data.client_site_id);
    postalCode = site?.postal_code || '';
  }
  const prefix = postalCode.trim().substring(0, 2);
  const province = spainProvinces.find((p: any) => p.codigo === prefix);

  const selectedSite = sites.find((s: any) => s.id === data.client_site_id);
  const regionId = selectedSite?.region_id;

  const defaultLodgingRate = calculateEffectiveLodgingRate({
    countryId: data.country_id,
    regionId,
    startDateStr: data.expected_start_date,
    endDateStr: data.expected_end_date,
    lodgingRates
  });

  const portugalCountry = countries.find((c: any) => c.iso2 === 'PT');
  const ptTaxParam = portugalCountry ? taxParams.find((t: any) => t.country_id === portugalCountry.id) : null;

  let ssRate = 0.23; // fallback 23%
  if (ptTaxParam) {
    ssRate = ptTaxParam.ss_use_total
      ? (Number(ptTaxParam.ss_employer_rate) + Number(ptTaxParam.ss_employee_rate)) / 100
      : Number(ptTaxParam.ss_employer_rate) / 100;
  }
  const ssPercentageText = ptTaxParam 
    ? `${ptTaxParam.ss_use_total ? (Number(ptTaxParam.ss_employer_rate) + Number(ptTaxParam.ss_employee_rate)) : ptTaxParam.ss_employer_rate}%`
    : '34%';

  const destTaxParam = taxParams.find((t: any) => t.country_id === data.country_id);
  const ssDestacadoBase = destTaxParam ? Number(destTaxParam.destacado_base_salary) : 920.00;

  const recalculateTotals = (currentItems: any[], includesZentralcom: boolean, prov: any) => {
    const w = countWeekdays(data.expected_start_date, data.expected_end_date);
    const totalDays = countTotalDays(data.expected_start_date, data.expected_end_date);
    const hasDates = data.expected_start_date && data.expected_end_date;

    const updatedItems = currentItems.map(item => {
      const daysCount = hasDates ? w : (item.planned_days_per_week * 4);
      const total_hours = item.quantity * item.planned_hours_per_day * daysCount;
      const hoursPerEmployee = item.planned_hours_per_day * daysCount;
      
      // Calculate Social Security per hour (CSSH)
      const regime = item.ss_regime || 'local';
      let cssh = 0;
      if (regime === 'local') {
        cssh = Number(item.base_cost_hour) * ssRate;
      } else if (regime === 'destacado' && hoursPerEmployee > 0) {
        const projectMonths = totalDays > 0 ? (totalDays / 30) : 1;
        const ssPerEmployee = projectMonths * ssDestacadoBase * ssRate;
        cssh = ssPerEmployee / hoursPerEmployee;
      }

      const cost = Number(item.base_cost_hour) + cssh;
      const sell = Number(item.sell_rate_hour);
      const margin_percent = sell > 0 ? Number((((sell - cost) / sell) * 100).toFixed(2)) : 0;

      return {
        ...item,
        total_hours,
        margin_percent,
        ss_cost_hour: cssh
      };
    });

    const autoCosts = [];
    
    // 1. Lodging: using default rate and overrides
    let totalHousingAmount = 0;
    const housingDetails: string[] = [];
    updatedItems.forEach(item => {
      if (item.includes_accommodation && totalDays > 0) {
        const lodgingRate = item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null
          ? Number(item.custom_lodging_rate)
          : defaultLodgingRate;
        
        const itemHousingAmount = item.quantity * lodgingRate * totalDays;
        totalHousingAmount += itemHousingAmount;
        
        const funcName = jobFunctions.find((jf: any) => jf.id === item.job_function_id)?.title || 'Perfil';
        housingDetails.push(`${item.quantity}x ${funcName} (€${lodgingRate}/dia)`);
      }
    });

    if (totalHousingAmount > 0) {
      autoCosts.push({
        id: 'auto-housing',
        cost_category: 'housing',
        description: `Alojamento Automático (${totalDays} dias: ${housingDetails.join(', ')})`,
        amount: Number(totalHousingAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true
      });
    }

    // 2. EPIs: quantity * coste_envio * Math.max(1, Math.ceil(total_days / 30)) (for items with includes_ppe === true)
    if (prov && totalDays > 0) {
      const ppeItems = updatedItems.filter(item => item.includes_ppe);
      const totalPpeQty = ppeItems.reduce((acc, item) => acc + item.quantity, 0);
      if (totalPpeQty > 0) {
        const blocks = Math.max(1, Math.ceil(totalDays / 30));
        const ppeAmount = totalPpeQty * Number(prov.coste_envio) * blocks;
        autoCosts.push({
          id: 'auto-epi',
          cost_category: 'epi',
          description: `EPIs Automático (Província: ${prov.provincia}, ${blocks} bloco(s) de 30 dias, ${totalPpeQty} pessoas)`,
          amount: Number(ppeAmount.toFixed(2)),
          is_rechargeable: false,
          markup_percent: 0,
          is_auto: true
        });
      }
    }

    // 3. Zentralcom broker fee
    if (includesZentralcom) {
      const totalQty = updatedItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalHoursSum = updatedItems.reduce((acc, item) => acc + item.total_hours, 0);
      
      let zentralcomAmount = (totalHoursSum * 2) + (totalQty * 20);
      if (data.estimation_type === 'new_allocation') {
        zentralcomAmount += 30;
      }

      if (zentralcomAmount > 0) {
        autoCosts.push({
          id: 'auto-zentralcom',
          cost_category: 'other',
          description: `Comissão Zentralcom (${totalHoursSum}h x €2 + ${totalQty} pessoas x €20${data.estimation_type === 'new_allocation' ? ' + €30 taxa fixa' : ''})`,
          amount: Number(zentralcomAmount.toFixed(2)),
          is_rechargeable: false,
          markup_percent: 0,
          is_auto: true
        });
      }
    }

    const manualCosts = (data.costs || []).filter((c: any) => !c.is_auto);
    const allCosts = [...manualCosts, ...autoCosts];

    let totalCost = 0;
    let totalRevenue = 0;

    updatedItems.forEach(item => {
      const cssh = item.ss_cost_hour || 0;
      const effective_cost = Number(item.base_cost_hour) + cssh;
      totalCost += effective_cost * Number(item.total_hours);
      totalRevenue += Number(item.sell_rate_hour) * Number(item.total_hours);
    });

    allCosts.forEach(c => {
      totalCost += Number(c.amount);
      if (c.is_rechargeable) {
        totalRevenue += Number(c.amount) * (1 + (Number(c.markup_percent) / 100));
      }
    });

    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return {
      items: updatedItems,
      costs: allCosts,
      total_estimated_cost: Number(totalCost.toFixed(2)),
      total_estimated_revenue: Number(totalRevenue.toFixed(2)),
      estimated_margin_percent: Number(margin.toFixed(2))
    };
  };

  const provincesLoaded = spainProvinces.length > 0;
  const sitesLoaded = !data.client_id || sites.length > 0;
  const countriesLoaded = countries.length > 0;
  const lodgingRatesLoaded = lodgingRates.length > 0;
  const taxParamsLoaded = taxParams.length > 0;
  const allLoaded = provincesLoaded && sitesLoaded && countriesLoaded && lodgingRatesLoaded && taxParamsLoaded;
  
  useEffect(() => {
    if (allLoaded) {
      const result = recalculateTotals(data.items, !!data.includes_zentralcom, province);
      
      const currentAutoCosts = (data.costs || []).filter((c: any) => c.is_auto);
      const newAutoCosts = result.costs.filter((c: any) => c.is_auto);
      
      const needsUpdate = 
        JSON.stringify(currentAutoCosts) !== JSON.stringify(newAutoCosts) ||
        JSON.stringify(data.items.map((i: any) => i.total_hours)) !== JSON.stringify(result.items.map((i: any) => i.total_hours)) ||
        JSON.stringify(data.items.map((i: any) => i.ss_cost_hour)) !== JSON.stringify(result.items.map((i: any) => i.ss_cost_hour)) ||
        data.total_estimated_cost !== result.total_estimated_cost ||
        data.total_estimated_revenue !== result.total_estimated_revenue;
        
      if (needsUpdate) {
        onChange({
          items: result.items,
          costs: result.costs,
          total_estimated_cost: result.total_estimated_cost,
          total_estimated_revenue: result.total_estimated_revenue,
          estimated_margin_percent: result.estimated_margin_percent
        });
      }
    }
  }, [allLoaded, data.expected_start_date, data.expected_end_date, data.items.length, data.client_site_id, data.postal_code, data.includes_zentralcom]);

  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      job_function_id: '',
      quantity: 1,
      planned_hours_per_day: 8,
      planned_days_per_week: 5,
      total_hours: 160,
      includes_accommodation: false,
      includes_transport: false,
      includes_ppe: false,
      base_cost_hour: 0,
      recommended_sell_rate: 0,
      minimum_sell_rate: 0,
      sell_rate_hour: 0,
      margin_percent: 0,
      risk_level: 'medium',
      notes: '',
      ss_regime: 'local',
      custom_lodging_rate: null
    };
    const newItems = [...data.items, newItem];
    const result = recalculateTotals(newItems, !!data.includes_zentralcom, province);
    onChange(result);
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    const result = recalculateTotals(newItems, !!data.includes_zentralcom, province);
    onChange(result);
  };

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], ...updates };
    const result = recalculateTotals(newItems, !!data.includes_zentralcom, province);
    onChange(result);
  };

  const totalDays = countTotalDays(data.expected_start_date, data.expected_end_date);
  const weekdays = countWeekdays(data.expected_start_date, data.expected_end_date);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-1">Perfis Profissionais e Serviços</h2>
          <p className="text-sm text-muted-foreground">Adicione os perfis, horas e calcule as tarifas.</p>
        </div>
        <Button onClick={addItem} size="sm" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 border border-slate-700 dark:border-slate-300">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Perfil
        </Button>
      </div>

      {/* Resumo da Localidade e Datas */}
      <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Duração do Projeto</span>
          {data.expected_start_date && data.expected_end_date ? (
            <span className="text-slate-900 dark:text-white font-medium">{totalDays} dias corridos ({weekdays} dias de semana)</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Insira as datas no passo anterior</span>
          )}
        </div>
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Código Postal</span>
          {postalCode ? (
            <span className="text-slate-900 dark:text-white font-medium">{postalCode}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Não informado (Leads sem site ou CEP em falta)</span>
          )}
        </div>
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Província / Taxas</span>
          {province ? (
            <span className="text-slate-900 dark:text-white font-medium">
              {province.provincia} (Alojamento: €{province.valor_dia}/dia, EPI: €{province.coste_envio}/envio)
            </span>
          ) : (
            <span className="text-slate-500">Nenhuma província de Espanha identificada</span>
          )}
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950/20 text-slate-500">
          Nenhum perfil adicionado ainda. Clique em "Adicionar Perfil" para começar.
        </div>
      ) : (
        <div className="space-y-6">
          {data.items.map((item: any, idx: number) => {
            const rateToUse = rateRefs.find((r: any) => r.job_function_id === item.job_function_id && r.country_id === data.country_id) 
              || rateRefs.find((r: any) => r.job_function_id === item.job_function_id && (r.country_id === null || !r.country_id));

            return (
              <div key={item.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950/40 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100/30 dark:hover:bg-red-950/30"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-10">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Função / Perfil</Label>
                    <Select 
                      value={item.job_function_id} 
                      onValueChange={(val) => {
                        const jf = jobFunctions.find((j: any) => j.id === val);
                        
                        const matchingRate = rateRefs.find((r: any) => r.job_function_id === val && r.country_id === data.country_id);
                        const fallbackRate = rateRefs.find((r: any) => r.job_function_id === val && (r.country_id === null || !r.country_id));
                        const rateToUseForSelect = matchingRate || fallbackRate;

                        updateItem(idx, {
                          job_function_id: val,
                          ...(jf ? { risk_level: jf.risk_level || 'medium' } : {}),
                          base_cost_hour: rateToUseForSelect ? rateToUseForSelect.base_cost_hour : 0,
                          sell_rate_hour: rateToUseForSelect ? rateToUseForSelect.recommended_sell_rate_hour : 0,
                          recommended_sell_rate: rateToUseForSelect ? rateToUseForSelect.recommended_sell_rate_hour : 0,
                          minimum_sell_rate: rateToUseForSelect ? rateToUseForSelect.minimum_sell_rate_hour : 0,
                        });
                      }}
                    >
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Selecione a Função" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      {jobFunctions.map((jf: any) => (
                        <SelectItem key={jf.id} value={jf.id}>{jf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Quantidade</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Horas Totais</Label>
                  <Input 
                    type="number" 
                    value={item.total_hours}
                    disabled
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono"
                  />
                </div>

                {/* Linha 2 */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Custo Base Hora (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.base_cost_hour}
                    onChange={(e) => updateItem(idx, { base_cost_hour: e.target.value })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                  {item.ss_cost_hour > 0 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 min-h-[15px]">
                      <span>+ €{Number(item.ss_cost_hour).toFixed(2)}/h Seg. Social ({item.ss_regime === 'destacado' ? 'Destacado' : 'Local'})</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Tarifa Venda (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.sell_rate_hour}
                    onChange={(e) => updateItem(idx, { sell_rate_hour: e.target.value })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white focus-visible:ring-blue-650 font-mono"
                  />
                  {rateToUse && (
                    <div className="text-[10px] text-muted-foreground mt-1 min-h-[15px]">
                      {Number(item.base_cost_hour) === Number(rateToUse.base_cost_hour) && Number(item.sell_rate_hour) === Number(rateToUse.recommended_sell_rate_hour) ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">✓ Valores estimados padrão</span>
                      ) : (
                        <span>Padrão: Custo €{Number(rateToUse.base_cost_hour).toFixed(2)} / Venda €{Number(rateToUse.recommended_sell_rate_hour).toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Margem (%)</Label>
                  <Input 
                    type="text" 
                    value={item.margin_percent + '%'}
                    disabled
                    className={`font-semibold ${
                      item.margin_percent >= 25 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 
                      item.margin_percent >= 15 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' : 
                      'text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                    }`}
                  />
                </div>

                <div className="flex flex-col space-y-2 pt-6 md:col-span-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`acc-${idx}`} 
                      checked={item.includes_accommodation}
                      onCheckedChange={(c) => updateItem(idx, { includes_accommodation: c })}
                      className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                    />
                    <label htmlFor={`acc-${idx}`} className="text-xs text-slate-650 dark:text-slate-300 cursor-pointer font-medium">Alojamento</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`trans-${idx}`} 
                      checked={item.includes_transport}
                      onCheckedChange={(c) => updateItem(idx, { includes_transport: c })}
                      className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                    />
                    <label htmlFor={`trans-${idx}`} className="text-xs text-slate-650 dark:text-slate-300 cursor-pointer font-medium">Transporte</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`ppe-${idx}`} 
                      checked={item.includes_ppe}
                      onCheckedChange={(c) => updateItem(idx, { includes_ppe: c })}
                      className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                    />
                    <label htmlFor={`ppe-${idx}`} className="text-xs text-slate-650 dark:text-slate-300 cursor-pointer font-medium">EPIs (Vestuário/Segur.)</label>
                  </div>
                </div>

                {/* Linha 3: Seguridade Social e Alojamento Customizado */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Seguridade Social (Encargos)</Label>
                  <Select 
                    value={item.ss_regime || 'local'} 
                    onValueChange={(val) => updateItem(idx, { ss_regime: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Selecione o Regime" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      <SelectItem value="none">Isento / Não Aplicável</SelectItem>
                      <SelectItem value="local">Local ({ssPercentageText} sobre custo da hora)</SelectItem>
                      <SelectItem value="destacado">Destacado (Base €{ssDestacadoBase.toFixed(2)}/mês de destino)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Diária Alojamento (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    disabled={!item.includes_accommodation}
                    value={item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? item.custom_lodging_rate : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      updateItem(idx, { custom_lodging_rate: val });
                    }}
                    placeholder={defaultLodgingRate ? `${defaultLodgingRate.toFixed(2)} (Padrão)` : '0.00'}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Custo Total c/ Encargos (€)</Label>
                  <Input 
                    type="text" 
                    value={'€' + (Number(item.base_cost_hour) + (item.ss_cost_hour || 0)).toFixed(2)}
                    disabled
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono font-medium"
                  />
                </div>

              </div>
            </div>
          );
        })}
          
        </div>
      )}

      {/* Seção Zentralcom Broker */}
      <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950/60 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="includes_zentralcom" className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
            Comissão Zentralcom (Broker / Intermediação)
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Ative para incluir a taxa Zentralcom no cálculo dos custos da proposta. Adiciona €2/hora por pessoa alocada, €20 por pessoa e uma taxa administrativa fixa de €30 se for uma Nova Alocação.
          </p>
        </div>
        <Checkbox 
          id="includes_zentralcom" 
          checked={!!data.includes_zentralcom}
          onCheckedChange={(c) => {
            const val = !!c;
            const result = recalculateTotals(data.items, val, province);
            onChange({
              includes_zentralcom: val,
              items: result.items,
              costs: result.costs,
              total_estimated_cost: result.total_estimated_cost,
              total_estimated_revenue: result.total_estimated_revenue,
              estimated_margin_percent: result.estimated_margin_percent
            });
          }}
          className="border-slate-300 dark:border-slate-750 w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
        />
      </div>
    </div>
  );
}
