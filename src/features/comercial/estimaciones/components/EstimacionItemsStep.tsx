import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, HelpCircle, Building, Shield, Truck, DollarSign, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useJobFunctions, useAllJobFunctionRates, useAllJobFunctionEpis } from '../hooks/useJobFunctions';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
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

function calculateWorkerHoursPerPeriod({
  startDateStr,
  endDateStr,
  work_lunes,
  work_martes,
  work_miercoles,
  work_jueves,
  work_viernes,
  work_sabado,
  work_domingo,
  hours_weekday,
  hours_lunes,
  hours_martes,
  hours_miercoles,
  hours_jueves,
  hours_viernes,
  hours_sabado,
  hours_domingo,
}: {
  startDateStr: string | null | undefined;
  endDateStr: string | null | undefined;
  work_lunes?: boolean;
  work_martes?: boolean;
  work_miercoles?: boolean;
  work_jueves?: boolean;
  work_viernes?: boolean;
  work_sabado?: boolean;
  work_domingo?: boolean;
  hours_weekday?: number;
  hours_lunes?: number;
  hours_martes?: number;
  hours_miercoles?: number;
  hours_jueves?: number;
  hours_viernes?: number;
  hours_sabado?: number;
  hours_domingo?: number;
}): number {
  if (!startDateStr || !endDateStr) {
    const wl = hours_lunes ?? hours_weekday ?? 8.0;
    const wt = hours_martes ?? hours_weekday ?? 8.0;
    const wq = hours_miercoles ?? hours_weekday ?? 8.0;
    const wqi = hours_jueves ?? hours_weekday ?? 8.0;
    const wv = hours_viernes ?? hours_weekday ?? 8.0;

    const weeklyHours = 
      (work_lunes !== false ? wl : 0.0) +
      (work_martes !== false ? wt : 0.0) +
      (work_miercoles !== false ? wq : 0.0) +
      (work_jueves !== false ? wqi : 0.0) +
      (work_viernes !== false ? wv : 0.0) +
      (work_sabado ? (hours_sabado ?? 0.0) : 0.0) +
      (work_domingo ? (hours_domingo ?? 0.0) : 0.0);
    return weeklyHours * 4; // default to 4 weeks
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    const wl = hours_lunes ?? hours_weekday ?? 8.0;
    const wt = hours_martes ?? hours_weekday ?? 8.0;
    const wq = hours_miercoles ?? hours_weekday ?? 8.0;
    const wqi = hours_jueves ?? hours_weekday ?? 8.0;
    const wv = hours_viernes ?? hours_weekday ?? 8.0;

    const weeklyHours = 
      (work_lunes !== false ? wl : 0.0) +
      (work_martes !== false ? wt : 0.0) +
      (work_miercoles !== false ? wq : 0.0) +
      (work_jueves !== false ? wqi : 0.0) +
      (work_viernes !== false ? wv : 0.0) +
      (work_sabado ? (hours_sabado ?? 0.0) : 0.0) +
      (work_domingo ? (hours_domingo ?? 0.0) : 0.0);
    return weeklyHours * 4;
  }

  let totalHours = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 1 && work_lunes !== false) totalHours += (hours_lunes ?? hours_weekday ?? 8.0);
    else if (day === 2 && work_martes !== false) totalHours += (hours_martes ?? hours_weekday ?? 8.0);
    else if (day === 3 && work_miercoles !== false) totalHours += (hours_miercoles ?? hours_weekday ?? 8.0);
    else if (day === 4 && work_jueves !== false) totalHours += (hours_jueves ?? hours_weekday ?? 8.0);
    else if (day === 5 && work_viernes !== false) totalHours += (hours_viernes ?? hours_weekday ?? 8.0);
    else if (day === 6 && work_sabado) totalHours += (hours_sabado ?? 0.0);
    else if (day === 0 && work_domingo) totalHours += (hours_domingo ?? 0.0);
    
    cur.setDate(cur.getDate() + 1);
  }
  return totalHours;
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
  const { t } = useTranslation();
  
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
            {t('comercial.risk.low', { defaultValue: 'Baixo' })}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
            {t('comercial.risk.medium', { defaultValue: 'Médio' })}
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50">
            {t('comercial.risk.high', { defaultValue: 'Alto' })}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
            {t('comercial.risk.normal', { defaultValue: 'Normal' })}
          </span>
        );
    }
  };

  const { selectedEmpresaId } = useEmpresa();
  const { data: jobFunctions = [] } = useJobFunctions();
  const { data: rateRefs = [] } = useAllJobFunctionRates();
  const { data: jobFunctionEpis = [], isLoading: isLoadingJobFunctionEpis } = useAllJobFunctionEpis();
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

  // Parâmetros Globais Padrão
  const [globalAlojamento, setGlobalAlojamento] = useState(true);
  const [globalLodgingRate, setGlobalLodgingRate] = useState<number | null>(null);
  const [globalEpi, setGlobalEpi] = useState(true);
  const [globalEpiRate, setGlobalEpiRate] = useState<number | null>(null);
  const [globalTransport, setGlobalTransport] = useState(false);
  const [globalTransportRate, setGlobalTransportRate] = useState<number>(0);
  const [globalBroker, setGlobalBroker] = useState(!!data.includes_zentralcom);

  // Form de Inclusão Individual
  const [newJobFunctionId, setNewJobFunctionId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newBaseCost, setNewBaseCost] = useState(0);
  const [newSellRate, setNewSellRate] = useState(0);
  const [newSsRegime, setNewSsRegime] = useState<'none' | 'local' | 'destacado'>('local');

  // Atualizar taxas globais com a província quando carregar
  useEffect(() => {
    if (province) {
      if (globalLodgingRate === null) setGlobalLodgingRate(Number(province.valor_dia));
      if (globalEpiRate === null) setGlobalEpiRate(Number(province.coste_envio));
    }
  }, [province]);

  const handleGlobalBrokerChange = (checked: boolean) => {
    setGlobalBroker(checked);
    const result = recalculateTotals(data.items, checked, province);
    onChange({
      includes_zentralcom: checked,
      ...result
    });
  };

  const handleGlobalAlojamentoChange = (checked: boolean) => {
    setGlobalAlojamento(checked);
    const newItems = data.items.map((item: any) => ({
      ...item,
      includes_accommodation: checked,
      custom_lodging_rate: checked ? (item.custom_lodging_rate ?? globalLodgingRate ?? (province ? Number(province.valor_dia) : 0)) : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleGlobalLodgingRateChange = (rate: number | null) => {
    setGlobalLodgingRate(rate);
    const newItems = data.items.map((item: any) => ({
      ...item,
      custom_lodging_rate: item.includes_accommodation ? rate : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleGlobalEpiChange = (checked: boolean) => {
    setGlobalEpi(checked);
    const newItems = data.items.map((item: any) => ({
      ...item,
      includes_ppe: checked,
      custom_epi_rate: checked ? (item.custom_epi_rate ?? globalEpiRate ?? (province ? Number(province.coste_envio) : 10)) : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleGlobalEpiRateChange = (rate: number | null) => {
    setGlobalEpiRate(rate);
    const newItems = data.items.map((item: any) => ({
      ...item,
      custom_epi_rate: item.includes_ppe ? rate : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleGlobalTransportChange = (checked: boolean) => {
    setGlobalTransport(checked);
    const newItems = data.items.map((item: any) => ({
      ...item,
      includes_transport: checked,
      custom_transport_rate: checked ? (item.custom_transport_rate ?? globalTransportRate ?? 0) : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleGlobalTransportRateChange = (rate: number) => {
    setGlobalTransportRate(rate);
    const newItems = data.items.map((item: any) => ({
      ...item,
      custom_transport_rate: item.includes_transport ? rate : null
    }));
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange(result);
  };

  const handleJobFunctionChange = (val: string) => {
    setNewJobFunctionId(val);
    const jfRates = rateRefs.filter((r: any) => r.job_function_id === val);
    
    let rateToUse = jfRates.find((r: any) => r.country_id === data.country_id && r.empresa_id === selectedEmpresaId);
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => r.country_id === data.country_id);
    }
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => (r.country_id === null || !r.country_id) && r.empresa_id === selectedEmpresaId);
    }
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => r.country_id === null || !r.country_id);
    }

    if (rateToUse) {
      setNewBaseCost(Number(rateToUse.base_cost_hour));
      setNewSellRate(Number(rateToUse.recommended_sell_rate_hour));
    } else {
      setNewBaseCost(0);
      setNewSellRate(0);
    }
  };

  const recalculateTotals = (currentItems: any[], includesZentralcom: boolean, prov: any) => {
    const totalDays = countTotalDays(data.expected_start_date, data.expected_end_date);
    const hoursPerEmployee = calculateWorkerHoursPerPeriod({
      startDateStr: data.expected_start_date,
      endDateStr: data.expected_end_date,
      work_lunes: data.work_lunes,
      work_martes: data.work_martes,
      work_miercoles: data.work_miercoles,
      work_jueves: data.work_jueves,
      work_viernes: data.work_viernes,
      work_sabado: data.work_sabado,
      work_domingo: data.work_domingo,
      hours_weekday: data.hours_weekday,
      hours_lunes: data.hours_lunes,
      hours_martes: data.hours_martes,
      hours_miercoles: data.hours_miercoles,
      hours_jueves: data.hours_jueves,
      hours_viernes: data.hours_viernes,
      hours_sabado: data.hours_sabado,
      hours_domingo: data.hours_domingo,
    });

    const updatedItems = currentItems.map(item => {
      const total_hours = item.quantity * hoursPerEmployee;
      
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
        ss_cost_hour: cssh,
        planned_hours_per_day: data.hours_weekday ?? 8,
        planned_days_per_week: [data.work_lunes, data.work_martes, data.work_miercoles, data.work_jueves, data.work_viernes].filter(d => d !== false).length,
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
        description: t('comercial.costs.autoHousing', { days: totalDays, details: housingDetails.join(', '), defaultValue: `Alojamento Automático (${totalDays} dias: ${housingDetails.join(', ')})` }),
        amount: Number(totalHousingAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true
      });
    }

    // 2. EPIs: custom rate or fallback + material costs
    let totalEpiAmount = 0;
    const epiDetails: string[] = [];
    updatedItems.forEach(item => {
      if (item.includes_ppe && totalDays > 0) {
        const defaultRate = prov ? Number(prov.coste_envio) : 10;
        const epiRate = item.custom_epi_rate !== undefined && item.custom_epi_rate !== null
          ? Number(item.custom_epi_rate)
          : defaultRate;
        const blocks = Math.max(1, Math.ceil(totalDays / 30));

        // Find matching EPIs for this job function
        const jfEpisForFunction = jobFunctionEpis.filter((jfe: any) => jfe.job_function_id === item.job_function_id);
        const materialsCost = jfEpisForFunction.reduce((sum: number, jfe: any) => {
          const defaultCost = jfe.epi?.default_cost !== null && jfe.epi?.default_cost !== undefined
            ? Number(jfe.epi.default_cost)
            : 0;
          return sum + (Number(jfe.quantity) * defaultCost);
        }, 0);

        const itemEpiShipping = item.quantity * epiRate * blocks;
        const itemEpiMaterials = item.quantity * materialsCost;
        const itemEpiAmount = itemEpiShipping + itemEpiMaterials;
        totalEpiAmount += itemEpiAmount;
        
        const funcName = jobFunctions.find((jf: any) => jf.id === item.job_function_id)?.name || 'Perfil';
        const matText = materialsCost > 0 ? ` + €${materialsCost.toFixed(2)} mat.` : '';
        epiDetails.push(`${item.quantity}x ${funcName} (€${epiRate.toFixed(2)}/envio, ${blocks} blc${matText})`);
      }
    });

    if (totalEpiAmount > 0) {
      autoCosts.push({
        id: 'auto-epi',
        cost_category: 'epi',
        description: t('comercial.costs.autoEpi', { details: epiDetails.join(', '), defaultValue: `EPIs Automático (${epiDetails.join(', ')})` }),
        amount: Number(totalEpiAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true
      });
    }

    // 3. Transporte: custom rate
    let totalTransportAmount = 0;
    const transportDetails: string[] = [];
    updatedItems.forEach(item => {
      if (item.includes_transport) {
        const transportRate = item.custom_transport_rate !== undefined && item.custom_transport_rate !== null
          ? Number(item.custom_transport_rate)
          : 0;
        const itemTransportAmount = item.quantity * transportRate;
        totalTransportAmount += itemTransportAmount;
        
        const funcName = jobFunctions.find((jf: any) => jf.id === item.job_function_id)?.name || 'Perfil';
        transportDetails.push(`${item.quantity}x ${funcName} (€${transportRate.toFixed(2)}/pessoa)`);
      }
    });

    if (totalTransportAmount > 0) {
      autoCosts.push({
        id: 'auto-transport',
        cost_category: 'transport',
        description: t('comercial.costs.autoTransport', { details: transportDetails.join(', '), defaultValue: `Transporte Automático (${transportDetails.join(', ')})` }),
        amount: Number(totalTransportAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true
      });
    }

    // 4. Broker fee (anteriormente Zentralcom)
    if (includesZentralcom) {
      const totalQty = updatedItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalHoursSum = updatedItems.reduce((acc, item) => acc + item.total_hours, 0);
      
      let BrokerAmount = (totalHoursSum * 2) + (totalQty * 20);
      if (data.estimation_type === 'new_allocation') {
        BrokerAmount += 30;
      }

      if (BrokerAmount > 0) {
        autoCosts.push({
          id: 'auto-zentralcom',
          cost_category: 'other',
          description: t('comercial.costs.autoBroker', { hours: totalHoursSum, people: totalQty, extra: data.estimation_type === 'new_allocation' ? t('comercial.costs.brokerFlatFee', { defaultValue: ' + €30 taxa fixa' }) : '', defaultValue: `Comissão Broker (${totalHoursSum}h x €2 + ${totalQty} pessoas x €20${data.estimation_type === 'new_allocation' ? ' + €30 taxa fixa' : ''})` }),
          amount: Number(BrokerAmount.toFixed(2)),
          is_rechargeable: false,
          markup_percent: 0,
          is_auto: true
        });
      }
    }

    // 5. Seguridade Social
    let totalSsAmount = 0;
    const ssDetails: string[] = [];
    updatedItems.forEach(item => {
      const itemSs = (item.ss_cost_hour || 0) * item.total_hours;
      if (itemSs > 0) {
        totalSsAmount += itemSs;
        const funcName = jobFunctions.find((jf: any) => jf.id === item.job_function_id)?.name || 'Perfil';
        ssDetails.push(`${item.quantity}x ${funcName} (€${(item.ss_cost_hour || 0).toFixed(2)}/h)`);
      }
    });

    if (totalSsAmount > 0) {
      autoCosts.push({
        id: 'auto-ss',
        cost_category: 'social_security',
        description: t('comercial.costs.autoSS', { details: ssDetails.join(', '), defaultValue: `Segurança Social Estimada (${ssDetails.join(', ')})` }),
        amount: Number(totalSsAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true
      });
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

    // Add additional revenues
    const additionalRevenuesSum = (data.additional_revenues || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );
    totalRevenue += additionalRevenuesSum;

    allCosts.forEach(c => {
      if (c.cost_category === 'social_security') {
        // Ignorar no cálculo do custo total pois já está embutido no custo da hora do perfil (evita dupla contagem)
        return;
      }
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
  const jobFunctionEpisLoaded = !isLoadingJobFunctionEpis;
  const allLoaded = provincesLoaded && sitesLoaded && countriesLoaded && lodgingRatesLoaded && taxParamsLoaded && jobFunctionEpisLoaded;
  
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
  }, [
    allLoaded, 
    data.expected_start_date, 
    data.expected_end_date, 
    data.items.length, 
    data.client_site_id, 
    data.postal_code, 
    data.includes_zentralcom,
    data.work_lunes,
    data.work_martes,
    data.work_miercoles,
    data.work_jueves,
    data.work_viernes,
    data.work_sabado,
    data.work_domingo,
    data.hours_weekday,
    data.hours_lunes,
    data.hours_martes,
    data.hours_miercoles,
    data.hours_jueves,
    data.hours_viernes,
    data.hours_sabado,
    data.hours_domingo,
    data.additional_revenues
  ]);

  const addItem = () => {
    if (!newJobFunctionId) return;

    const jf = jobFunctions.find((j: any) => j.id === newJobFunctionId);
    const jfRates = rateRefs.filter((r: any) => r.job_function_id === newJobFunctionId);
    let rateToUse = jfRates.find((r: any) => r.country_id === data.country_id && r.empresa_id === selectedEmpresaId);
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => r.country_id === data.country_id);
    }
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => (r.country_id === null || !r.country_id) && r.empresa_id === selectedEmpresaId);
    }
    if (!rateToUse) {
      rateToUse = jfRates.find((r: any) => r.country_id === null || !r.country_id);
    }

    const lodgingRate = globalAlojamento ? (globalLodgingRate ?? (province ? Number(province.valor_dia) : 0)) : null;
    const epiRate = globalEpi ? (globalEpiRate ?? (province ? Number(province.coste_envio) : 10)) : null;
    const transportRate = globalTransport ? globalTransportRate : null;

    const hoursPerEmployee = calculateWorkerHoursPerPeriod({
      startDateStr: data.expected_start_date,
      endDateStr: data.expected_end_date,
      work_lunes: data.work_lunes,
      work_martes: data.work_martes,
      work_miercoles: data.work_miercoles,
      work_jueves: data.work_jueves,
      work_viernes: data.work_viernes,
      work_sabado: data.work_sabado,
      work_domingo: data.work_domingo,
      hours_weekday: data.hours_weekday,
      hours_lunes: data.hours_lunes,
      hours_martes: data.hours_martes,
      hours_miercoles: data.hours_miercoles,
      hours_jueves: data.hours_jueves,
      hours_viernes: data.hours_viernes,
      hours_sabado: data.hours_sabado,
      hours_domingo: data.hours_domingo,
    });

    const newItem = {
      id: crypto.randomUUID(),
      job_function_id: newJobFunctionId,
      quantity: newQuantity,
      planned_hours_per_day: data.hours_weekday ?? 8,
      planned_days_per_week: [data.work_lunes, data.work_martes, data.work_miercoles, data.work_jueves, data.work_viernes].filter(d => d !== false).length,
      total_hours: newQuantity * hoursPerEmployee,
      includes_accommodation: globalAlojamento,
      custom_lodging_rate: lodgingRate,
      includes_transport: globalTransport,
      custom_transport_rate: transportRate,
      includes_ppe: globalEpi,
      custom_epi_rate: epiRate,
      base_cost_hour: newBaseCost,
      recommended_sell_rate: rateToUse ? Number(rateToUse.recommended_sell_rate_hour) : 0,
      minimum_sell_rate: rateToUse ? Number(rateToUse.minimum_sell_rate_hour) : 0,
      sell_rate_hour: newSellRate,
      margin_percent: 0,
      risk_level: jf?.risk_level || 'medium',
      notes: '',
      ss_regime: newSsRegime,
    };

    const newItems = [...data.items, newItem];
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange({
      includes_zentralcom: globalBroker,
      ...result
    });

    // Limpar form
    setNewJobFunctionId('');
    setNewQuantity(1);
    setNewBaseCost(0);
    setNewSellRate(0);
    setNewSsRegime('local');
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange({
      includes_zentralcom: globalBroker,
      ...result
    });
  };

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], ...updates };
    const result = recalculateTotals(newItems, globalBroker, province);
    onChange({
      includes_zentralcom: globalBroker,
      ...result
    });
  };

  const totalDays = countTotalDays(data.expected_start_date, data.expected_end_date);
  const weekdays = countWeekdays(data.expected_start_date, data.expected_end_date);
  const weeksVal = totalDays / 7;
  const formattedWeeks = Number.isInteger(weeksVal) ? weeksVal.toString() : weeksVal.toFixed(1);
  const monthsVal = totalDays / 30;
  const formattedMonths = Number.isInteger(monthsVal) ? monthsVal.toString() : monthsVal.toFixed(1);

  const housingTotal = (data.costs || [])
    .filter((c: any) => c.cost_category === 'housing')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const epiTotal = (data.costs || [])
    .filter((c: any) => c.cost_category === 'epi')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const transportTotal = (data.costs || [])
    .filter((c: any) => c.cost_category === 'transport')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const brokerTotal = (data.costs || [])
    .filter((c: any) => c.id === 'auto-zentralcom')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {t('comercial.stepItems.title', { defaultValue: 'Perfis Profissionais e Serviços' })}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('comercial.stepItems.subtitle', { defaultValue: 'Adicione os perfis, configure taxas locais e controle a margem comercial.' })}
          </p>
        </div>
      </div>

      {/* Resumo da Localidade e Datas */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs shadow-sm">
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('comercial.stepItems.projectDuration', { defaultValue: 'Duração do Projeto' })}</span>
          {data.expected_start_date && data.expected_end_date ? (
            <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              {totalDays} {t('comercial.stepGeneral.calendarDays', { defaultValue: 'dias corridos' })} (~{formattedMonths} {Number(formattedMonths) === 1 ? t('comercial.stepGeneral.month', { defaultValue: 'mês' }) : t('comercial.stepGeneral.months', { defaultValue: 'meses' })})
              <span className="text-slate-400">|</span>
              {weekdays} {t('comercial.stepGeneral.weekdays', { defaultValue: 'dias de semana' })} ({formattedWeeks} {t('comercial.stepGeneral.weeks', { defaultValue: 'semanas' })})
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {t('comercial.stepItems.insertDatesFirst', { defaultValue: 'Insira as datas no passo anterior' })}
            </span>
          )}
        </div>
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('comercial.stepItems.postalCodeSite', { defaultValue: 'Código Postal / Localidade' })}</span>
          {postalCode ? (
            <span className="text-slate-900 dark:text-white font-semibold">{postalCode}</span>
          ) : (
            <span className="text-slate-400 font-medium italic">{t('comercial.stepItems.notInformed', { defaultValue: 'Não informado' })}</span>
          )}
        </div>
        <div>
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">{t('comercial.stepItems.provinceRates', { defaultValue: 'Província / Taxas Referência' })}</span>
          {province ? (
            <span className="text-slate-900 dark:text-white font-semibold">
              {province.provincia} ({t('comercial.stepItems.accommodation', { defaultValue: 'Alojamento' })}: €{province.valor_dia}/dia, {t('comercial.stepItems.epi', { defaultValue: 'EPI' })}: €{province.coste_envio}/{t('comercial.stepItems.block', { defaultValue: 'bloco' })})
            </span>
          ) : (
            <span className="text-slate-450 dark:text-slate-400 italic">{t('comercial.stepItems.noSpainProvince', { defaultValue: 'Nenhuma província de Espanha identificada' })}</span>
          )}
        </div>
      </div>

      {/* Parâmetros Globais Padrão */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">{t('comercial.stepItems.globalParams', { defaultValue: 'Parâmetros Globais de Proposta' })}</Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl">
          {/* Alojamento */}
          <div className="flex flex-col justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm transition-all duration-200 hover:shadow-md min-h-[130px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-blue-500" /> {t('comercial.stepItems.accommodation', { defaultValue: 'Alojamento' })}
                </Label>
                <Switch 
                  checked={globalAlojamento} 
                  onCheckedChange={handleGlobalAlojamentoChange} 
                />
              </div>
              <div className="pt-1">
                <Label className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{t('comercial.stepItems.defaultLodgingRate', { defaultValue: 'Diária Padrão (€)' })}</Label>
                <div className="relative flex items-center mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!globalAlojamento}
                    value={globalLodgingRate ?? ''}
                    onChange={(e) => handleGlobalLodgingRateChange(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="0.00"
                    className="h-8 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-5"
                  />
                  <span className="absolute right-2 text-xs text-slate-400 font-mono font-medium">€</span>
                </div>
              </div>
            </div>
            {globalAlojamento && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t('comercial.stepItems.totalHousing', { defaultValue: 'Total Alojamento:' })}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">€{housingTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* EPI */}
          <div className="flex flex-col justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm transition-all duration-200 hover:shadow-md min-h-[130px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-500" /> {t('comercial.stepItems.epiShipping', { defaultValue: 'EPIs' })}
                </Label>
                <Switch 
                  checked={globalEpi} 
                  onCheckedChange={handleGlobalEpiChange} 
                />
              </div>
              <div className="pt-1">
                <Label className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{t('comercial.stepItems.defaultEpiRate', { defaultValue: 'Custo Padrão (€/bloco 30d)' })}</Label>
                <div className="relative flex items-center mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!globalEpi}
                    value={globalEpiRate ?? ''}
                    onChange={(e) => handleGlobalEpiRateChange(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="0.00"
                    className="h-8 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-5"
                  />
                  <span className="absolute right-2 text-xs text-slate-400 font-mono font-medium">€</span>
                </div>
              </div>
            </div>
            {globalEpi && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t('comercial.stepItems.totalEpi', { defaultValue: 'Total EPIs:' })}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">€{epiTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Transporte */}
          <div className="flex flex-col justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm transition-all duration-200 hover:shadow-md min-h-[130px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-amber-500" /> {t('comercial.stepItems.transport', { defaultValue: 'Transporte' })}
                </Label>
                <Switch 
                  checked={globalTransport} 
                  onCheckedChange={handleGlobalTransportChange} 
                />
              </div>
              <div className="pt-1">
                <Label className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{t('comercial.stepItems.defaultTransportRate', { defaultValue: 'Custo Padrão (€/pessoa)' })}</Label>
                <div className="relative flex items-center mt-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!globalTransport}
                    value={globalTransportRate}
                    onChange={(e) => handleGlobalTransportRateChange(Number(e.target.value))}
                    placeholder="0.00"
                    className="h-8 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-5"
                  />
                  <span className="absolute right-2 text-xs text-slate-400 font-mono font-medium">€</span>
                </div>
              </div>
            </div>
            {globalTransport && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t('comercial.stepItems.totalTransport', { defaultValue: 'Total Transporte:' })}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">€{transportTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Broker / Intermediação */}
          <div className="flex flex-col justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm transition-all duration-200 hover:shadow-md min-h-[130px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-purple-500" /> {t('comercial.stepItems.brokerFee', { defaultValue: 'Comissão Broker' })}
                </Label>
                <Switch 
                  checked={globalBroker} 
                  onCheckedChange={handleGlobalBrokerChange} 
                />
              </div>
              <div className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal pt-1">
                {t('comercial.stepItems.brokerFeeDesc', { defaultValue: 'Taxa de intermediação: €2/h por pessoa + €20 taxa operacional por pessoa (+ €30 se alocação nova).' })}
              </div>
            </div>
            {globalBroker && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t('comercial.stepItems.totalBroker', { defaultValue: 'Total Broker:' })}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">€{brokerTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Inclusion Form */}
      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('comercial.stepItems.addProfile', { defaultValue: 'Incluir Perfil Profissional' })}</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Função / Perfil */}
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('comercial.stepItems.profileLabel', { defaultValue: 'Função / Perfil' })}</Label>
            <Select value={newJobFunctionId} onValueChange={handleJobFunctionChange}>
              <SelectTrigger className="h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
                <SelectValue placeholder={t('comercial.stepItems.selectProfilePlaceholder', { defaultValue: 'Selecione a Função' })} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {jobFunctions.map((jf: any) => (
                  <SelectItem key={jf.id} value={jf.id}>{jf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('comercial.stepItems.quantityLabel', { defaultValue: 'Qtd' })}</Label>
            <Input
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="h-9 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm text-center"
            />
          </div>

          {/* Custo Base Hora */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('comercial.stepItems.baseCostLabel', { defaultValue: 'Custo Base/h (€)' })}</Label>
            <div className="relative flex items-center">
              <Input
                type="number"
                step="0.01"
                value={newBaseCost || ''}
                onChange={(e) => setNewBaseCost(Number(e.target.value))}
                placeholder="0.00"
                className="h-9 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm text-right pr-6"
              />
              <span className="absolute right-2 text-xs text-slate-450 font-mono">€</span>
            </div>
          </div>

          {/* Tarifa Venda */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('comercial.stepItems.sellRateLabel', { defaultValue: 'Tarifa Venda/h (€)' })}</Label>
            <div className="relative flex items-center">
              <Input
                type="number"
                step="0.01"
                value={newSellRate || ''}
                onChange={(e) => setNewSellRate(Number(e.target.value))}
                placeholder="0.00"
                className="h-9 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm text-right pr-6"
              />
              <span className="absolute right-2 text-xs text-slate-450 font-mono">€</span>
            </div>
          </div>

          {/* Seguridade Social */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('comercial.stepItems.ssRegimeLabel', { defaultValue: 'Seg. Social (Regime)' })}</Label>
            <Select value={newSsRegime} onValueChange={(val: any) => setNewSsRegime(val)}>
              <SelectTrigger className="h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
                <SelectValue placeholder={t('comercial.stepItems.selectRegimePlaceholder', { defaultValue: 'Selecione o Regime' })} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm">
                <SelectItem value="none">{t('comercial.stepItems.regimeNone', { defaultValue: 'Isento / N/A' })}</SelectItem>
                <SelectItem value="local">{t('comercial.stepItems.regimeLocal', { rate: ssPercentageText, defaultValue: 'Local ({{rate}})' })}</SelectItem>
                <SelectItem value="destacado">{t('comercial.stepItems.regimeDestacado', { base: ssDestacadoBase.toFixed(0), defaultValue: 'Destacado (€{{base}})' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Adicionar */}
          <div className="md:col-span-2">
            <Button
              onClick={addItem}
              disabled={!newJobFunctionId}
              className="w-full h-9 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-md shadow-yellow-500/10 hover:shadow-yellow-500/20 transition-all duration-200 text-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" /> {t('comercial.stepItems.btnAdd', { defaultValue: 'Adicionar' })}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Perfis */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('comercial.stepItems.profilesList', { defaultValue: 'Lista de Perfis Incluídos' })}</Label>
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-inner">
            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {t('comercial.stepItems.noProfilesAddedTitle', { defaultValue: 'Nenhum Perfil Adicionado' })}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {t('comercial.stepItems.noProfilesAddedDesc', { defaultValue: 'Preencha o formulário acima e clique em "Adicionar" para listar os perfis profissionais contratados nesta cotação.' })}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/20 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-50/80 dark:bg-slate-900/60">
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 w-[22%]">{t('comercial.stepItems.thProfile', { defaultValue: 'Função / Observação' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 text-center w-[6%]">{t('comercial.stepItems.thQuantity', { defaultValue: 'Qtd' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 text-center w-[6%]">{t('comercial.stepItems.thHours', { defaultValue: 'Horas' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 w-[16%]">{t('comercial.stepItems.thCostSS', { defaultValue: 'Custo Base / Seg. Social' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 w-[12%]">{t('comercial.stepItems.thSellBase', { defaultValue: 'Venda Base' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 text-center w-[10%]">{t('comercial.stepItems.thMargin', { defaultValue: 'Margem' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 w-[24%]">{t('comercial.stepItems.thLogisticCosts', { defaultValue: 'Custos Logísticos Individualizados' })}</th>
                  <th className="p-3 text-[10px] uppercase font-bold tracking-wider text-slate-555 dark:text-slate-450 text-center w-[4%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-850">
                {data.items.map((item: any, idx: number) => {
                  const jf = jobFunctions.find((j: any) => j.id === item.job_function_id);
                  const jfRates = rateRefs.filter((r: any) => r.job_function_id === item.job_function_id);
                  const rateToUse = jfRates.find((r: any) => r.country_id === data.country_id && r.empresa_id === selectedEmpresaId)
                    || jfRates.find((r: any) => r.country_id === data.country_id)
                    || jfRates.find((r: any) => (r.country_id === null || !r.country_id) && r.empresa_id === selectedEmpresaId)
                    || jfRates.find((r: any) => r.country_id === null || !r.country_id);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors duration-150">
                      {/* Função / Observação */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {jf?.name || t('comercial.stepItems.profileLabel', { defaultValue: 'Perfil' })}
                            </span>
                            {getRiskBadge(item.risk_level || 'medium')}
                          </div>
                          <Input
                            value={item.notes || ''}
                            onChange={(e) => updateItem(idx, { notes: e.target.value })}
                            placeholder={t('comercial.stepItems.notesPlaceholder', { defaultValue: 'Observação ou requisito específico...' })}
                            className="h-7 text-[10.5px] px-2 py-0.5 bg-transparent border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-slate-400 focus:bg-white dark:focus:bg-slate-950 rounded text-slate-600 dark:text-slate-300"
                          />
                        </div>
                      </td>

                      {/* Qtd */}
                      <td className="p-3 text-center align-top">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          className="h-8 w-14 font-mono text-center px-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs mx-auto"
                        />
                      </td>

                      {/* Horas */}
                      <td className="p-3 text-center align-top pt-5">
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {item.total_hours}h
                        </span>
                      </td>

                      {/* Custo Base / Seg. Social */}
                      <td className="p-3 align-top space-y-1.5">
                        <div className="relative flex items-center">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.base_cost_hour}
                            onChange={(e) => updateItem(idx, { base_cost_hour: Number(e.target.value) })}
                            className="h-8 w-24 font-mono text-xs text-right pr-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                          <span className="absolute right-2 text-[10px] text-slate-450 font-mono">€</span>
                        </div>
                        <div className="space-y-1">
                          <Select 
                            value={item.ss_regime || 'local'} 
                            onValueChange={(val) => updateItem(idx, { ss_regime: val })}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-24 px-1 py-0.5 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
                              <SelectValue placeholder={t('comercial.stepItems.selectRegimePlaceholder', { defaultValue: 'Regime' })} />
                            </SelectTrigger>
                            <SelectContent className="text-[10px]">
                              <SelectItem value="none">{t('comercial.stepItems.regimeNoneShort', { defaultValue: 'Isento' })}</SelectItem>
                              <SelectItem value="local">{t('comercial.stepItems.regimeLocalShort', { rate: ssPercentageText, defaultValue: 'Local ({{rate}})' })}</SelectItem>
                              <SelectItem value="destacado">{t('comercial.stepItems.regimeDestacadoShort', { base: ssDestacadoBase.toFixed(0), defaultValue: 'Destacado (€{{base}}/m)' })}</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.ss_cost_hour > 0 && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block pl-0.5">
                              + €{Number(item.ss_cost_hour).toFixed(2)}/h
                            </span>
                          )}
                          <div className="text-[10px] text-slate-900 dark:text-slate-100 font-semibold pl-0.5 pt-0.5 border-t border-slate-100 dark:border-slate-850">
                            Total: €{(Number(item.base_cost_hour) + (item.ss_cost_hour || 0)).toFixed(2)}/h
                          </div>
                        </div>
                      </td>

                      {/* Tarifa Venda */}
                      <td className="p-3 align-top space-y-1.5">
                        <div className="relative flex items-center">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.sell_rate_hour}
                            onChange={(e) => updateItem(idx, { sell_rate_hour: Number(e.target.value) })}
                            className="h-8 w-24 font-mono text-xs text-right pr-6 border-slate-200/80 dark:border-slate-750 bg-white dark:bg-slate-950 focus-visible:ring-blue-500"
                          />
                          <span className="absolute right-2 text-[10px] text-slate-450 font-mono">€</span>
                        </div>
                        {rateToUse && (
                          <div className="text-[9px] text-slate-400 pl-0.5 leading-normal max-w-[110px]">
                            {Number(item.base_cost_hour) === Number(rateToUse.base_cost_hour) && Number(item.sell_rate_hour) === Number(rateToUse.recommended_sell_rate_hour) ? (
                              <span className="text-blue-500 font-medium">{t('comercial.stepItems.sellRateDefault', { defaultValue: '✓ Padrão' })}</span>
                            ) : (
                              <span>{t('comercial.stepItems.sellRateStandard', { rate: Number(rateToUse.recommended_sell_rate_hour).toFixed(1), defaultValue: 'Padrão Venda: €{{rate}}/h' })}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Margem */}
                      <td className="p-3 text-center align-top pt-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold font-mono border ${
                          item.margin_percent >= 25 ? 'text-emerald-700 bg-emerald-50 border-emerald-150 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 
                          item.margin_percent >= 15 ? 'text-amber-700 bg-amber-50 border-amber-150 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50' : 
                          'text-rose-700 bg-rose-50 border-rose-150 dark:text-rose-450 dark:bg-rose-950/20 dark:border-rose-900/50'
                        }`}>
                          {item.margin_percent}%
                        </span>
                      </td>

                      {/* Custos Logísticos Individualizados */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col gap-1.5 py-1 min-w-[210px]">
                          {/* Alojamento */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-medium text-slate-600 dark:text-slate-350">
                              <Checkbox
                                checked={item.includes_accommodation}
                                onCheckedChange={(c) => updateItem(idx, { 
                                  includes_accommodation: !!c, 
                                  custom_lodging_rate: c ? (item.custom_lodging_rate ?? globalLodgingRate ?? (province ? Number(province.valor_dia) : 0)) : null 
                                })}
                                className="h-3.5 w-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                              />
                              <span>{t('comercial.stepItems.labelAccommodation', { defaultValue: 'Alojamento:' })}</span>
                            </label>
                            <div className="relative flex items-center">
                              <Input
                                type="number"
                                step="0.01"
                                disabled={!item.includes_accommodation}
                                value={item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? item.custom_lodging_rate : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  updateItem(idx, { custom_lodging_rate: val });
                                }}
                                placeholder={defaultLodgingRate ? `${defaultLodgingRate.toFixed(1)}` : '0'}
                                className="h-7 w-20 text-xs font-mono text-right pr-6 pl-1 border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-900 dark:text-slate-100"
                              />
                              <span className="absolute right-2 text-[10px] text-slate-400 font-mono">€</span>
                            </div>
                          </div>

                          {/* EPI */}
                          <div className="space-y-1 py-0.5 border-y border-slate-100/50 dark:border-slate-850/30">
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-medium text-slate-600 dark:text-slate-350">
                                <Checkbox
                                  checked={item.includes_ppe}
                                  onCheckedChange={(c) => updateItem(idx, { 
                                    includes_ppe: !!c, 
                                    custom_epi_rate: c ? (item.custom_epi_rate ?? globalEpiRate ?? (province ? Number(province.coste_envio) : 10)) : null 
                                  })}
                                  className="h-3.5 w-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                                />
                                <span>{t('comercial.stepItems.labelEpiShipping', { defaultValue: 'EPIs:' })}</span>
                              </label>
                              <div className="relative flex items-center">
                                <Input
                                  type="number"
                                  step="0.01"
                                  disabled={!item.includes_ppe}
                                  value={item.custom_epi_rate !== undefined && item.custom_epi_rate !== null ? item.custom_epi_rate : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    updateItem(idx, { custom_epi_rate: val });
                                  }}
                                  placeholder={province ? `${province.coste_envio}` : '10'}
                                  className="h-7 w-20 text-xs font-mono text-right pr-6 pl-1 border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                                <span className="absolute right-2 text-[10px] text-slate-400 font-mono">€</span>
                              </div>
                            </div>

                            {item.includes_ppe && (() => {
                              const jfEpisForFunction = jobFunctionEpis.filter((jfe: any) => jfe.job_function_id === item.job_function_id);
                              const materialsCost = jfEpisForFunction.reduce((sum: number, jfe: any) => {
                                const defaultCost = jfe.epi?.default_cost !== null && jfe.epi?.default_cost !== undefined
                                  ? Number(jfe.epi.default_cost)
                                  : 0;
                                return sum + (Number(jfe.quantity) * defaultCost);
                              }, 0);

                              return (
                                <div className="space-y-0.5 pl-5">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-450">
                                    <span>{t('comercial.stepItems.labelEpiMaterial', { defaultValue: 'EPI (Material):' })}</span>
                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                      €{materialsCost.toFixed(2)}
                                    </span>
                                  </div>
                                  {jfEpisForFunction.length > 0 && (
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
                                      ({jfEpisForFunction.map((jfe: any) => `${jfe.quantity}x ${jfe.epi?.name || 'EPI'} (€${(jfe.epi?.default_cost || 0).toFixed(0)})`).join(', ')})
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Transporte */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-medium text-slate-600 dark:text-slate-350">
                              <Checkbox
                                checked={item.includes_transport}
                                onCheckedChange={(c) => updateItem(idx, { 
                                  includes_transport: !!c, 
                                  custom_transport_rate: c ? (item.custom_transport_rate ?? globalTransportRate ?? 0) : null 
                                })}
                                className="h-3.5 w-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                              />
                              <span>{t('comercial.stepItems.labelTransport', { defaultValue: 'Transporte:' })}</span>
                            </label>
                            <div className="relative flex items-center">
                              <Input
                                type="number"
                                step="0.01"
                                disabled={!item.includes_transport}
                                value={item.custom_transport_rate !== undefined && item.custom_transport_rate !== null ? item.custom_transport_rate : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  updateItem(idx, { custom_transport_rate: val });
                                }}
                                placeholder="0"
                                className="h-7 w-20 text-xs font-mono text-right pr-6 pl-1 border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-900 dark:text-slate-100"
                              />
                              <span className="absolute right-2 text-[10px] text-slate-400 font-mono">€</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center align-top pt-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
