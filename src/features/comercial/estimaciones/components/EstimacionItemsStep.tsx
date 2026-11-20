import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, HelpCircle, Building, Shield, Truck, DollarSign, AlertTriangle, RefreshCw, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useJobFunctions, useAllJobFunctionRates, useAllJobFunctionEpis } from '../hooks/useJobFunctions';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useSpainProvinces } from '../hooks/useSpainProvinces';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useCountries } from '@/features/master-data/locations/hooks/useLocations';
import { useLodgingRates } from '../hooks/useLodgingRates';
import { useCountryTaxParameters } from '../hooks/useCountryTaxParameters';
import { useClientTariffs } from '@/features/master-data/clients/hooks/useClients';
import {
  countWeekdays,
  countTotalDays,
  calculateWorkerHoursPerPeriod,
  calculateEffectiveLodgingRate,
  recalculateEstimationPayload,
} from '../utils/estimationCalculations';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
  settings?: any;
}

export function EstimacionItemsStep({ data, onChange, settings }: Props) {
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
  const { data: jobFunctions = [], isLoading: isLoadingJobFunctions } = useJobFunctions();
  const { data: rateRefs = [] } = useAllJobFunctionRates();
  const { data: jobFunctionEpis = [], isLoading: isLoadingJobFunctionEpis } = useAllJobFunctionEpis();
  const { data: spainProvinces = [], isLoading: isLoadingProvinces } = useSpainProvinces();
  const { data: sites = [], isLoading: isLoadingSites } = useClientSites(data.client_id || undefined);
  const { data: countries = [], isLoading: isLoadingCountries } = useCountries();
  const { data: lodgingRates = [], isLoading: isLoadingLodgingRates } = useLodgingRates();
  const { data: taxParams = [], isLoading: isLoadingTaxParams } = useCountryTaxParameters();
  const { data: clientTariffs = [] } = useClientTariffs(data.client_id);

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
  const [newSsRegime, setNewSsRegime] = useState<'none' | 'local' | 'destacado'>('destacado');

  // Atualizar regime de Seg. Social padrão quando o país selecionado muda
  useEffect(() => {
    if (countries.length > 0 && data.country_id) {
      const selectedCountry = countries.find((c: any) => c.id === data.country_id);
      if (selectedCountry) {
        if (selectedCountry.iso2 === 'PT') {
          setNewSsRegime('local');
        } else {
          setNewSsRegime('destacado');
        }
      }
    }
  }, [data.country_id, countries]);

  // Atualizar taxas globais com a província ou diária padrão do país quando carregar
  useEffect(() => {
    if (province) {
      if (globalLodgingRate === null) setGlobalLodgingRate(Number(province.valor_dia));
      if (globalEpiRate === null) setGlobalEpiRate(Number(province.coste_envio));
    } else if (defaultLodgingRate > 0) {
      if (globalLodgingRate === null) setGlobalLodgingRate(defaultLodgingRate);
    }
  }, [province, defaultLodgingRate, globalLodgingRate]);

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
      custom_lodging_rate: checked ? (item.custom_lodging_rate ?? globalLodgingRate ?? (province ? Number(province.valor_dia) : defaultLodgingRate)) : null
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
      
      // Procurar tarifa acordada do cliente (específica da obra ou global)
      let clientRate = null;
      if (data.client_id && clientTariffs && clientTariffs.length > 0) {
        if (data.client_site_id) {
          const siteTariff = clientTariffs.find(
            (t: any) => t.job_function_id === val && t.client_site_id === data.client_site_id
          );
          if (siteTariff) clientRate = Number(siteTariff.valor_tarifa);
        }
        if (clientRate === null) {
          const globalTariff = clientTariffs.find(
            (t: any) => t.job_function_id === val && (!t.client_site_id || t.client_site_id === 'global')
          );
          if (globalTariff) clientRate = Number(globalTariff.valor_tarifa);
        }
      }

      const standardRate = clientRate !== null ? clientRate : Number(rateToUse.recommended_sell_rate_hour);
      
      // Se for Preço Fechado (fixed_price), aplicar tarifa de preço fechado da tabela ou markup percentual
      if (data.pricing_model === 'fixed_price') {
        const fixedMarkup = Number(settings?.fixed_price_markup_percent ?? 80);
        const fixedRefRate = rateToUse.fixed_price_sell_rate_hour 
          ? Number(rateToUse.fixed_price_sell_rate_hour)
          : Number((standardRate * (1 + fixedMarkup / 100)).toFixed(2));
        setNewSellRate(fixedRefRate);
      } else {
        setNewSellRate(standardRate);
      }
    } else {
      setNewBaseCost(0);
      setNewSellRate(0);
    }
  };

  const handleReapplyCountryRates = () => {
    let count = 0;
    const isFixed = data.pricing_model === 'fixed_price';
    const fixedMarkup = Number(settings?.fixed_price_markup_percent ?? 80);

    const updatedItems = (data.items || []).map((item: any) => {
      const jfRates = rateRefs.filter((r: any) => r.job_function_id === item.job_function_id);
      const rateToUse = jfRates.find((r: any) => r.country_id === data.country_id && r.empresa_id === selectedEmpresaId)
        || jfRates.find((r: any) => r.country_id === data.country_id)
        || jfRates.find((r: any) => (r.country_id === null || !r.country_id) && r.empresa_id === selectedEmpresaId)
        || jfRates.find((r: any) => r.country_id === null || !r.country_id);

      if (rateToUse) {
        count++;
        const standardRate = Number(rateToUse.recommended_sell_rate_hour);
        const effectiveSellRate = isFixed
          ? (rateToUse.fixed_price_sell_rate_hour ? Number(rateToUse.fixed_price_sell_rate_hour) : Number((standardRate * (1 + fixedMarkup / 100)).toFixed(2)))
          : standardRate;

        return {
          ...item,
          base_cost_hour: Number(rateToUse.base_cost_hour),
          sell_rate_hour: effectiveSellRate,
          recommended_sell_rate: standardRate
        };
      }
      return item;
    });

    const result = recalculateTotals(updatedItems, globalBroker, province);
    onChange({
      items: updatedItems,
      ...result
    });
    toast.success(`Tarifas (${isFixed ? 'Preço Fechado' : 'Tabela Oficial'}) atualizadas em ${count} itens!`);
  };

  const recalculateTotals = (currentItems: any[], includesZentralcom: boolean, _prov?: any) => {
    return recalculateEstimationPayload({
      data,
      currentItems,
      includesZentralcom,
      spainProvinces,
      sites,
      countries,
      lodgingRates,
      taxParams,
      jobFunctions,
      jobFunctionEpis,
      t,
    });
  };

  const allLoaded =
    !isLoadingProvinces &&
    (!data.client_id || !isLoadingSites) &&
    !isLoadingCountries &&
    !isLoadingLodgingRates &&
    !isLoadingTaxParams &&
    !isLoadingJobFunctions &&
    !isLoadingJobFunctionEpis;
  
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

    const lodgingRate = globalAlojamento ? (globalLodgingRate ?? (province ? Number(province.valor_dia) : defaultLodgingRate)) : null;
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

    // Limpar form (preserva o regime de seguridade social selecionado para os próximos perfis)
    setNewJobFunctionId('');
    setNewQuantity(1);
    setNewBaseCost(0);
    setNewSellRate(0);
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

  // Referências de Tarifas Comparativas para a Função Selecionada
  const selectedFunctionTariffRefs = useMemo(() => {
    if (!newJobFunctionId) return null;

    const jfRates = rateRefs.filter((r: any) => r.job_function_id === newJobFunctionId);

    // 1. Tarifa Acordada no Cadastro do Cliente
    let clientRate: number | null = null;
    let clientSiteName: string | null = null;
    if (data.client_id && clientTariffs && clientTariffs.length > 0) {
      if (data.client_site_id) {
        const siteTariff = clientTariffs.find(
          (t: any) => t.job_function_id === newJobFunctionId && t.client_site_id === data.client_site_id
        );
        if (siteTariff) {
          clientRate = Number(siteTariff.valor_tarifa);
          const currentSite = sites.find((s: any) => s.id === data.client_site_id);
          clientSiteName = currentSite?.name || 'Obra Específica';
        }
      }
      if (clientRate === null) {
        const globalTariff = clientTariffs.find(
          (t: any) => t.job_function_id === newJobFunctionId && (!t.client_site_id || t.client_site_id === 'global')
        );
        if (globalTariff) {
          clientRate = Number(globalTariff.valor_tarifa);
          clientSiteName = 'Tabela Geral do Cliente';
        }
      }
    }

    // 2. Tarifa Oficial da Tabela do País da Proposta (Espanha, e futuramente Itália, França, etc.)
    const countryObj = countries.find((c: any) => c.id === data.country_id);
    const countryName = countryObj?.name || 'País';
    let countryRateRef = null;
    if (data.country_id) {
      countryRateRef = jfRates.find((r: any) => r.country_id === data.country_id && r.empresa_id === selectedEmpresaId)
        || jfRates.find((r: any) => r.country_id === data.country_id);
    }

    // 3. Tarifa Oficial da Tabela Global
    const globalRateRef = jfRates.find((r: any) => (r.country_id === null || !r.country_id) && r.empresa_id === selectedEmpresaId)
      || jfRates.find((r: any) => r.country_id === null || !r.country_id);

    const fixedMarkupPercent = Number(settings?.fixed_price_markup_percent ?? 80);
    const countryFixedRate = countryRateRef?.fixed_price_sell_rate_hour 
      ? Number(countryRateRef.fixed_price_sell_rate_hour) 
      : (countryRateRef?.recommended_sell_rate_hour 
          ? Number((Number(countryRateRef.recommended_sell_rate_hour) * (1 + fixedMarkupPercent / 100)).toFixed(2)) 
          : null);

    return {
      clientRate,
      clientSiteName,
      countryRate: countryRateRef ? Number(countryRateRef.recommended_sell_rate_hour) : null,
      countryMinRate: countryRateRef ? Number(countryRateRef.minimum_sell_rate_hour) : null,
      countryFixedRate,
      fixedMarkupPercent,
      countryCost: countryRateRef ? Number(countryRateRef.base_cost_hour) : null,
      countryName,
      hasCountryTable: !!countryRateRef,
      globalRate: globalRateRef ? Number(globalRateRef.recommended_sell_rate_hour) : null,
      globalMinRate: globalRateRef ? Number(globalRateRef.minimum_sell_rate_hour) : null,
      globalCost: globalRateRef ? Number(globalRateRef.base_cost_hour) : null,
      hasGlobalTable: !!globalRateRef
    };
  }, [newJobFunctionId, rateRefs, data.country_id, data.client_id, data.client_site_id, clientTariffs, countries, sites, selectedEmpresaId, settings]);

  const isBelowOfficialCountryRate = useMemo(() => {
    if (!selectedFunctionTariffRefs?.countryRate || newSellRate <= 0) return false;
    return newSellRate < selectedFunctionTariffRefs.countryRate;
  }, [selectedFunctionTariffRefs, newSellRate]);

  // Backward compatibility alias
  const matchedClientTariff = selectedFunctionTariffRefs?.clientRate ?? null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {t('comercial.stepItems.title', { defaultValue: 'Perfis Profissionais e Serviços' })}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('comercial.stepItems.subtitle', { defaultValue: 'Adicione os perfis, configure taxas locais e controle a margem comercial.' })}
          </p>
        </div>
        {data.items?.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReapplyCountryRates}
            className="h-7 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 shadow-sm"
            title="Atualiza todos os perfis inseridos com as tarifas oficiais deste país"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{t('comercial.stepItems.reapplyRates', { defaultValue: 'Reaplicar Tarifas do País' })}</span>
          </Button>
        )}
      </div>

      {/* Resumo da Localidade e Datas Compacto */}
      <div className="py-2 px-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Duração:</span>
          {data.expected_start_date && data.expected_end_date ? (
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              {totalDays} {t('comercial.stepGeneral.calendarDays', { defaultValue: 'dias corridos' })} ({formattedWeeks} {t('comercial.stepGeneral.weeks', { defaultValue: 'sem.' })})
            </span>
          ) : (
            <span className="text-amber-600 font-medium italic">Datas não definidas</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Local / CP:</span>
          <span className="font-semibold text-slate-900 dark:text-white font-mono">
            {postalCode || selectedSite?.name || 'Não informado'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Região / Taxas:</span>
          {province ? (
            <span className="font-semibold text-slate-900 dark:text-white">
              {province.provincia} (Aloj: €{province.valor_dia}/dia | EPI: €{province.coste_envio})
            </span>
          ) : (
            <span className="text-muted-foreground italic">Padrão Nacional</span>
          )}
        </div>
      </div>

      {/* Parâmetros Globais Padrão Compactos */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('comercial.stepItems.globalParams', { defaultValue: 'Parâmetros Globais de Proposta' })}
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl">
          {/* Alojamento */}
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-blue-500" /> {t('comercial.stepItems.accommodation', { defaultValue: 'Alojamento' })}
              </Label>
              <Switch checked={globalAlojamento} onCheckedChange={handleGlobalAlojamentoChange} />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="0.01"
                  disabled={!globalAlojamento}
                  value={globalLodgingRate ?? ''}
                  onChange={(e) => handleGlobalLodgingRateChange(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="0.00"
                  className="h-7 font-mono text-xs pr-5"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-mono">€/d</span>
              </div>
              {globalAlojamento && (
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  €{housingTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* EPI */}
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" /> {t('comercial.stepItems.epiShipping', { defaultValue: 'EPIs' })}
              </Label>
              <Switch checked={globalEpi} onCheckedChange={handleGlobalEpiChange} />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="0.01"
                  disabled={!globalEpi}
                  value={globalEpiRate ?? ''}
                  onChange={(e) => handleGlobalEpiRateChange(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="0.00"
                  className="h-7 font-mono text-xs pr-5"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-mono">€/b</span>
              </div>
              {globalEpi && (
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  €{epiTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Transporte */}
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-amber-500" /> {t('comercial.stepItems.transport', { defaultValue: 'Transporte' })}
              </Label>
              <Switch checked={globalTransport} onCheckedChange={handleGlobalTransportChange} />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="0.01"
                  disabled={!globalTransport}
                  value={globalTransportRate}
                  onChange={(e) => handleGlobalTransportRateChange(Number(e.target.value))}
                  placeholder="0.00"
                  className="h-7 font-mono text-xs pr-5"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-mono">€/p</span>
              </div>
              {globalTransport && (
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  €{transportTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Broker */}
          <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-purple-500" /> {t('comercial.stepItems.brokerFee', { defaultValue: 'Comissão Broker' })}
              </Label>
              <Switch checked={globalBroker} onCheckedChange={handleGlobalBrokerChange} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                €2/h + €20/pessoa
              </span>
              {globalBroker && (
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  €{brokerTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Inclusão de Perfil Profissional */}
      <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {t('comercial.stepItems.addProfile', { defaultValue: 'Incluir Perfil Profissional' })}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          {/* Função / Perfil */}
          <div className="space-y-1 md:col-span-3">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('comercial.stepItems.profileLabel', { defaultValue: 'Função / Perfil' })}
            </Label>
            <Select value={newJobFunctionId} onValueChange={handleJobFunctionChange}>
              <SelectTrigger className="h-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder={t('comercial.stepItems.selectProfilePlaceholder', { defaultValue: 'Selecione a Função' })} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {jobFunctions.map((jf: any) => (
                  <SelectItem key={jf.id} value={jf.id} className="text-xs">{jf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('comercial.stepItems.quantityLabel', { defaultValue: 'Qtd' })}
            </Label>
            <Input
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="h-8 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-center"
            />
          </div>

          {/* Custo Base Hora */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('comercial.stepItems.baseCostLabel', { defaultValue: 'Custo Base/h (€)' })}
            </Label>
            <div className="relative flex items-center">
              <Input
                type="number"
                step="0.01"
                value={newBaseCost || ''}
                onChange={(e) => setNewBaseCost(Number(e.target.value))}
                placeholder="0.00"
                className="h-8 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-right pr-6"
              />
              <span className="absolute right-2 text-xs text-slate-400 font-mono">€</span>
            </div>
          </div>

          {/* Tarifa Venda */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('comercial.stepItems.sellRateLabel', { defaultValue: 'Tarifa Venda/h (€)' })}
            </Label>
            <div className="relative flex items-center">
              <Input
                type="number"
                step="0.01"
                value={newSellRate || ''}
                onChange={(e) => setNewSellRate(Number(e.target.value))}
                placeholder="0.00"
                className="h-8 font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-right pr-6"
              />
              <span className="absolute right-2 text-xs text-slate-400 font-mono">€</span>
            </div>
          </div>

          {/* Seguridade Social */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('comercial.stepItems.ssRegimeLabel', { defaultValue: 'Seg. Social (Regime)' })}
            </Label>
            <Select value={newSsRegime} onValueChange={(val: any) => setNewSsRegime(val)}>
              <SelectTrigger className="h-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <SelectValue placeholder={t('comercial.stepItems.selectRegimePlaceholder', { defaultValue: 'Selecione o Regime' })} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
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
              className="w-full h-8 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold shadow-sm transition-all duration-200 text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" /> {t('comercial.stepItems.btnAdd', { defaultValue: 'Adicionar' })}
            </Button>
          </div>
        </div>

        {/* Painel Comparativo e Inteligência de Tarifas da Função Selecionada */}
        {selectedFunctionTariffRefs && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-850 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span>Referências de Tarifa:</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Tarifa Acordada do Cliente */}
                {selectedFunctionTariffRefs.clientRate !== null ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 py-1 px-2.5 rounded-lg text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                      Acordada no Cliente:
                    </span>
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                      € {selectedFunctionTariffRefs.clientRate.toFixed(2)}/h
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewSellRate(selectedFunctionTariffRefs.clientRate!)}
                      className="h-5 px-1.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      Usar
                    </Button>
                  </div>
                ) : data.client_id ? (
                  <div className="text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border text-slate-500">
                    Sem tarifa acordada neste cliente
                  </div>
                ) : null}

                {/* 2. Tarifa Tabela do País */}
                {selectedFunctionTariffRefs.hasCountryTable && (
                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800/80 py-1 px-2.5 rounded-lg text-xs">
                    <span className="text-blue-800 dark:text-blue-300 font-semibold">
                      Tabela {selectedFunctionTariffRefs.countryName}:
                    </span>
                    <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
                      € {selectedFunctionTariffRefs.countryRate?.toFixed(2)}/h
                    </span>
                    {selectedFunctionTariffRefs.countryCost && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        (Custo: €{selectedFunctionTariffRefs.countryCost.toFixed(2)})
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedFunctionTariffRefs.countryRate) setNewSellRate(selectedFunctionTariffRefs.countryRate);
                        if (selectedFunctionTariffRefs.countryCost) setNewBaseCost(selectedFunctionTariffRefs.countryCost);
                      }}
                      className="h-5 px-1.5 text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      Usar
                    </Button>
                  </div>
                )}

                {/* 3. Tarifa Tabela Global */}
                {selectedFunctionTariffRefs.hasGlobalTable && (
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1 px-2.5 rounded-lg text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      Tabela Global:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      € {selectedFunctionTariffRefs.globalRate?.toFixed(2)}/h
                    </span>
                    {selectedFunctionTariffRefs.globalCost && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (Custo: €{selectedFunctionTariffRefs.globalCost.toFixed(2)})
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedFunctionTariffRefs.globalRate) setNewSellRate(selectedFunctionTariffRefs.globalRate);
                        if (selectedFunctionTariffRefs.globalCost) setNewBaseCost(selectedFunctionTariffRefs.globalCost);
                      }}
                      className="h-5 px-1.5 text-[10px] font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      Usar
                    </Button>
                  </div>
                )}

                {/* 4. Tarifa Preço Fechado Sugerida */}
                {selectedFunctionTariffRefs.countryFixedRate !== null && (
                  <div className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs border ${
                    data.pricing_model === 'fixed_price'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/80 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    <span className="font-semibold">
                      Preço Fechado (+{selectedFunctionTariffRefs.fixedMarkupPercent}%):
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      € {selectedFunctionTariffRefs.countryFixedRate.toFixed(2)}/h
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedFunctionTariffRefs.countryFixedRate) setNewSellRate(selectedFunctionTariffRefs.countryFixedRate);
                        if (selectedFunctionTariffRefs.countryCost) setNewBaseCost(selectedFunctionTariffRefs.countryCost);
                      }}
                      className="h-5 px-1.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      Usar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso quando a tarifa está abaixo da tabela oficial do país */}
            {isBelowOfficialCountryRate && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 p-2 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Atenção à Margem:</strong> Tarifa proposta (€ {newSellRate.toFixed(2)}/h) está <strong>abaixo da tabela oficial de {selectedFunctionTariffRefs.countryName} (€ {selectedFunctionTariffRefs.countryRate?.toFixed(2)}/h)</strong>. Pode exigir renegociação com o cliente ou aprovação gerencial na Mesa de Aprovações.
                  </span>
                </div>
                {selectedFunctionTariffRefs.countryRate && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setNewSellRate(selectedFunctionTariffRefs.countryRate!)}
                    className="h-6 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 ml-auto"
                  >
                    Ajustar para Tabela (€ {selectedFunctionTariffRefs.countryRate.toFixed(2)})
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banner de Preço Fechado */}
      {data.pricing_model === 'fixed_price' && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
          <div className="flex items-start sm:items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="font-bold">Modalidade Preço Fechado Ativa:</strong> As tarifas e margens desta tabela são exclusivamente de controle interno. Na proposta e contrato gerados para o cliente, <strong>as tarifas por hora serão ocultadas</strong>, exibindo unicamente o <strong>Valor Global Fechado de € {(data.total_estimated_revenue || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>.
            </div>
          </div>
          <span className="shrink-0 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-sm self-start sm:self-auto">
            Valor Global: € {(data.total_estimated_revenue || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

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

                  let itemClientTariff = null;
                  if (data.client_id && clientTariffs && clientTariffs.length > 0) {
                    if (data.client_site_id) {
                      const siteTariff = clientTariffs.find(
                        (t: any) => t.job_function_id === item.job_function_id && t.client_site_id === data.client_site_id
                      );
                      if (siteTariff) itemClientTariff = Number(siteTariff.valor_tarifa);
                    }
                    if (itemClientTariff === null) {
                      const globalTariff = clientTariffs.find(
                        (t: any) => t.job_function_id === item.job_function_id && (!t.client_site_id || t.client_site_id === 'global')
                      );
                      if (globalTariff) itemClientTariff = Number(globalTariff.valor_tarifa);
                    }
                  }

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
                        {itemClientTariff !== null ? (
                          <div className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 pl-0.5 leading-normal max-w-[110px]">
                            {Number(item.sell_rate_hour) === itemClientTariff ? (
                              <span>✓ Acordado</span>
                            ) : (
                              <span>Acordado: €{itemClientTariff.toFixed(2)}/h</span>
                            )}
                          </div>
                        ) : (
                          rateToUse && (
                            <div className="text-[9px] text-slate-400 pl-0.5 leading-normal max-w-[110px]">
                              {Number(item.base_cost_hour) === Number(rateToUse.base_cost_hour) && Number(item.sell_rate_hour) === Number(rateToUse.recommended_sell_rate_hour) ? (
                                <span className="text-blue-500 font-medium">{t('comercial.stepItems.sellRateDefault', { defaultValue: '✓ Padrão' })}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateItem(idx, {
                                      base_cost_hour: Number(rateToUse.base_cost_hour),
                                      sell_rate_hour: Number(rateToUse.recommended_sell_rate_hour),
                                      recommended_sell_rate: Number(rateToUse.recommended_sell_rate_hour)
                                    });
                                    toast.success(`Tarifa padrão (€${Number(rateToUse.recommended_sell_rate_hour).toFixed(2)}/h) aplicada!`);
                                  }}
                                  className="text-left text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block font-medium"
                                  title="Clique para aplicar a tarifa e custo padrão deste país"
                                >
                                  {t('comercial.stepItems.sellRateStandard', { rate: Number(rateToUse.recommended_sell_rate_hour).toFixed(1), defaultValue: 'Padrão Venda: €{{rate}}/h' })}
                                </button>
                              )}
                            </div>
                          )
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
                                  custom_lodging_rate: c ? (item.custom_lodging_rate ?? globalLodgingRate ?? (province ? Number(province.valor_dia) : defaultLodgingRate)) : null 
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
