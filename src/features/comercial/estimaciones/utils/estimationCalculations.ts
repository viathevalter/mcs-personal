export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    // Use local noon (12:00) to avoid UTC midnight and DST boundary shifts
    const d = new Date(year, month, day, 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(dateStr);
  if (isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0, 0);
}

export function countWeekdays(startDateStr: string | null | undefined, endDateStr: string | null | undefined): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end || start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function countTotalDays(startDateStr: string | null | undefined, endDateStr: string | null | undefined): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end || start > end) return 0;

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diffDays);
}

export function getWeekdayCountBreakdown(startDateStr: string | null | undefined, endDateStr: string | null | undefined) {
  const breakdown = {
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
    sabado: 0,
    domingo: 0,
  };
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end || start > end) return breakdown;

  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 1) breakdown.lunes++;
    else if (day === 2) breakdown.martes++;
    else if (day === 3) breakdown.miercoles++;
    else if (day === 4) breakdown.jueves++;
    else if (day === 5) breakdown.viernes++;
    else if (day === 6) breakdown.sabado++;
    else if (day === 0) breakdown.domingo++;
    cur.setDate(cur.getDate() + 1);
  }
  return breakdown;
}

export function calculateWorkerHoursPerPeriod({
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
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  if (!start || !end || start > end) {
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
    return Number((weeklyHours * 4).toFixed(2));
  }

  let totalHours = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 1 && work_lunes !== false) totalHours += Number(hours_lunes ?? hours_weekday ?? 8.0);
    else if (day === 2 && work_martes !== false) totalHours += Number(hours_martes ?? hours_weekday ?? 8.0);
    else if (day === 3 && work_miercoles !== false) totalHours += Number(hours_miercoles ?? hours_weekday ?? 8.0);
    else if (day === 4 && work_jueves !== false) totalHours += Number(hours_jueves ?? hours_weekday ?? 8.0);
    else if (day === 5 && work_viernes !== false) totalHours += Number(hours_viernes ?? hours_weekday ?? 8.0);
    else if (day === 6 && work_sabado) totalHours += Number(hours_sabado ?? 0.0);
    else if (day === 0 && work_domingo) totalHours += Number(hours_domingo ?? 0.0);

    cur.setDate(cur.getDate() + 1);
  }
  return Number(totalHours.toFixed(2));
}

export function getBaseLodgingRate(countryId: string, regionId: string | null | undefined, lodgingRates: any[]): number {
  if (regionId) {
    const regBase = lodgingRates.find(
      (r) =>
        r.country_id === countryId &&
        r.region_id === regionId &&
        !r.start_date &&
        !r.end_date
    );
    if (regBase) return Number(regBase.rate_per_day);
  }
  const countryBase = lodgingRates.find(
    (r) =>
      r.country_id === countryId &&
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
    const regSeasonal = lodgingRates.find(
      (r) =>
        r.country_id === countryId &&
        r.region_id === regionId &&
        r.start_date &&
        r.end_date &&
        dayStr >= r.start_date &&
        dayStr <= r.end_date
    );
    if (regSeasonal) return Number(regSeasonal.rate_per_day);

    const regBase = lodgingRates.find(
      (r) =>
        r.country_id === countryId &&
        r.region_id === regionId &&
        !r.start_date &&
        !r.end_date
    );
    if (regBase) return Number(regBase.rate_per_day);
  }

  const countrySeasonal = lodgingRates.find(
    (r) =>
      r.country_id === countryId &&
      !r.region_id &&
      r.start_date &&
      r.end_date &&
      dayStr >= r.start_date &&
      dayStr <= r.end_date
  );
  if (countrySeasonal) return Number(countrySeasonal.rate_per_day);

  const countryBase = lodgingRates.find(
    (r) =>
      r.country_id === countryId &&
      !r.region_id &&
      !r.start_date &&
      !r.end_date
  );
  return countryBase ? Number(countryBase.rate_per_day) : 0;
}

export function calculateEffectiveLodgingRate({
  countryId,
  regionId,
  startDateStr,
  endDateStr,
  lodgingRates,
}: {
  countryId: string;
  regionId: string | null | undefined;
  startDateStr: string | null | undefined;
  endDateStr: string | null | undefined;
  lodgingRates: any[];
}): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  if (!start || !end || start > end) {
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

export function recalculateEstimationPayload({
  data,
  currentItems,
  includesZentralcom,
  spainProvinces = [],
  sites = [],
  countries = [],
  lodgingRates = [],
  taxParams = [],
  jobFunctions = [],
  jobFunctionEpis = [],
  t,
}: {
  data: any;
  currentItems?: any[];
  includesZentralcom?: boolean;
  spainProvinces?: any[];
  sites?: any[];
  countries?: any[];
  lodgingRates?: any[];
  taxParams?: any[];
  jobFunctions?: any[];
  jobFunctionEpis?: any[];
  t?: any;
}) {
  const itemsToCalc = currentItems ?? data.items ?? [];
  const brokerActive = includesZentralcom !== undefined ? includesZentralcom : !!data.includes_zentralcom;

  let postalCode = '';
  if (data.lead_id) {
    postalCode = data.postal_code || '';
  } else if (data.client_site_id) {
    const site = sites.find((s: any) => s.id === data.client_site_id);
    postalCode = site?.postal_code || '';
  }
  const prefix = postalCode.trim().substring(0, 2);
  const prov = prefix ? spainProvinces.find((p: any) => p.codigo === prefix) : undefined;

  const selectedSite = sites.find((s: any) => s.id === data.client_site_id);
  const regionId = selectedSite?.region_id;

  const defaultLodgingRate = calculateEffectiveLodgingRate({
    countryId: data.country_id,
    regionId,
    startDateStr: data.expected_start_date,
    endDateStr: data.expected_end_date,
    lodgingRates,
  });

  const portugalCountry = countries.find((c: any) => c.iso2 === 'PT');
  const ptTaxParam = portugalCountry ? taxParams.find((tp: any) => tp.country_id === portugalCountry.id) : null;

  let ssRate = 0.23;
  if (ptTaxParam) {
    ssRate = ptTaxParam.ss_use_total
      ? (Number(ptTaxParam.ss_employer_rate) + Number(ptTaxParam.ss_employee_rate)) / 100
      : Number(ptTaxParam.ss_employer_rate) / 100;
  }

  const destTaxParam = taxParams.find((tp: any) => tp.country_id === data.country_id);
  const ssDestacadoBase = destTaxParam ? Number(destTaxParam.destacado_base_salary) : 920.0;

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

  const activeDaysPerWeek =
    [data.work_lunes, data.work_martes, data.work_miercoles, data.work_jueves, data.work_viernes].filter(
      (d) => d !== false
    ).length +
    (data.work_sabado ? 1 : 0) +
    (data.work_domingo ? 1 : 0);

  const updatedItems = itemsToCalc.map((item: any) => {
    const total_hours = Number((Number(item.quantity || 0) * hoursPerEmployee).toFixed(2));

    const regime = item.ss_regime || 'local';
    let cssh = 0;
    if (regime === 'local') {
      cssh = Number(item.base_cost_hour) * ssRate;
    } else if (regime === 'destacado' && hoursPerEmployee > 0) {
      const projectMonths = totalDays > 0 ? totalDays / 30 : 1;
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
      planned_days_per_week: activeDaysPerWeek,
    };
  });

  const autoCosts: any[] = [];

  // 1. Lodging
  let totalHousingAmount = 0;
  const housingDetails: string[] = [];
  updatedItems.forEach((item: any) => {
    if (item.includes_accommodation && totalDays > 0) {
      const lodgingRate =
        item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null
          ? Number(item.custom_lodging_rate)
          : defaultLodgingRate;

      const itemHousingAmount = Number(item.quantity || 0) * lodgingRate * totalDays;
      totalHousingAmount += itemHousingAmount;

      const jfObj = jobFunctions.find((jf: any) => jf.id === item.job_function_id);
      const funcName = jfObj?.name || jfObj?.title || 'Perfil';
      housingDetails.push(`${item.quantity}x ${funcName} (€${lodgingRate}/dia)`);
    }
  });

  if (totalHousingAmount > 0) {
    autoCosts.push({
      id: 'auto-housing',
      cost_category: 'housing',
      description: t
        ? t('comercial.costs.autoHousing', {
            days: totalDays,
            details: housingDetails.join(', '),
            defaultValue: `Alojamento Automático (${totalDays} dias: ${housingDetails.join(', ')})`,
          })
        : `Alojamento Automático (${totalDays} dias: ${housingDetails.join(', ')})`,
      amount: Number(totalHousingAmount.toFixed(2)),
      is_rechargeable: false,
      markup_percent: 0,
      is_auto: true,
    });
  }

  // 2. EPIs
  let totalEpiAmount = 0;
  const epiDetails: string[] = [];
  updatedItems.forEach((item: any) => {
    if (item.includes_ppe && totalDays > 0) {
      const defaultRate = prov ? Number(prov.coste_envio) : 10;
      const epiRate =
        item.custom_epi_rate !== undefined && item.custom_epi_rate !== null
          ? Number(item.custom_epi_rate)
          : defaultRate;
      const blocks = Math.max(1, Math.ceil(totalDays / 30));

      const jfEpisForFunction = jobFunctionEpis.filter((jfe: any) => jfe.job_function_id === item.job_function_id);
      const materialsCost = jfEpisForFunction.reduce((sum: number, jfe: any) => {
        const defaultCost =
          jfe.epi?.default_cost !== null && jfe.epi?.default_cost !== undefined ? Number(jfe.epi.default_cost) : 0;
        return sum + Number(jfe.quantity) * defaultCost;
      }, 0);

      const itemEpiShipping = Number(item.quantity || 0) * epiRate * blocks;
      const itemEpiMaterials = Number(item.quantity || 0) * materialsCost;
      const itemEpiAmount = itemEpiShipping + itemEpiMaterials;
      totalEpiAmount += itemEpiAmount;

      const jfObj = jobFunctions.find((jf: any) => jf.id === item.job_function_id);
      const funcName = jfObj?.name || jfObj?.title || 'Perfil';
      const matText = materialsCost > 0 ? ` + €${materialsCost.toFixed(2)} mat.` : '';
      epiDetails.push(`${item.quantity}x ${funcName} (€${epiRate.toFixed(2)}/envio, ${blocks} blc${matText})`);
    }
  });

  if (totalEpiAmount > 0) {
    autoCosts.push({
      id: 'auto-epi',
      cost_category: 'epi',
      description: t
        ? t('comercial.costs.autoEpi', {
            details: epiDetails.join(', '),
            defaultValue: `EPIs Automático (${epiDetails.join(', ')})`,
          })
        : `EPIs Automático (${epiDetails.join(', ')})`,
      amount: Number(totalEpiAmount.toFixed(2)),
      is_rechargeable: false,
      markup_percent: 0,
      is_auto: true,
    });
  }

  // 3. Transport
  let totalTransportAmount = 0;
  const transportDetails: string[] = [];
  updatedItems.forEach((item: any) => {
    if (item.includes_transport) {
      const transportRate =
        item.custom_transport_rate !== undefined && item.custom_transport_rate !== null
          ? Number(item.custom_transport_rate)
          : 0;
      const itemTransportAmount = Number(item.quantity || 0) * transportRate;
      totalTransportAmount += itemTransportAmount;

      const jfObj = jobFunctions.find((jf: any) => jf.id === item.job_function_id);
      const funcName = jfObj?.name || jfObj?.title || 'Perfil';
      transportDetails.push(`${item.quantity}x ${funcName} (€${transportRate.toFixed(2)}/pessoa)`);
    }
  });

  if (totalTransportAmount > 0) {
    autoCosts.push({
      id: 'auto-transport',
      cost_category: 'transport',
      description: t
        ? t('comercial.costs.autoTransport', {
            details: transportDetails.join(', '),
            defaultValue: `Transporte Automático (${transportDetails.join(', ')})`,
          })
        : `Transporte Automático (${transportDetails.join(', ')})`,
      amount: Number(totalTransportAmount.toFixed(2)),
      is_rechargeable: false,
      markup_percent: 0,
      is_auto: true,
    });
  }

  // 4. Broker fee
  if (brokerActive) {
    const totalQty = updatedItems.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
    const totalHoursSum = updatedItems.reduce((acc: number, item: any) => acc + Number(item.total_hours || 0), 0);

    let brokerAmount = totalHoursSum * 2 + totalQty * 20;
    if (data.estimation_type === 'new_allocation') {
      brokerAmount += 30;
    }

    if (brokerAmount > 0) {
      autoCosts.push({
        id: 'auto-zentralcom',
        cost_category: 'other',
        description: t
          ? t('comercial.costs.autoBroker', {
              hours: totalHoursSum,
              people: totalQty,
              extra:
                data.estimation_type === 'new_allocation'
                  ? t('comercial.costs.brokerFlatFee', { defaultValue: ' + €30 taxa fixa' })
                  : '',
              defaultValue: `Comissão Broker (${totalHoursSum}h x €2 + ${totalQty} pessoas x €20${
                data.estimation_type === 'new_allocation' ? ' + €30 taxa fixa' : ''
              })`,
            })
          : `Comissão Broker (${totalHoursSum}h x €2 + ${totalQty} pessoas x €20${
              data.estimation_type === 'new_allocation' ? ' + €30 taxa fixa' : ''
            })`,
        amount: Number(brokerAmount.toFixed(2)),
        is_rechargeable: false,
        markup_percent: 0,
        is_auto: true,
      });
    }
  }

  // 5. Social Security
  let totalSsAmount = 0;
  const ssDetails: string[] = [];
  updatedItems.forEach((item: any) => {
    const itemSs = (item.ss_cost_hour || 0) * Number(item.total_hours || 0);
    if (itemSs > 0) {
      totalSsAmount += itemSs;
      const jfObj = jobFunctions.find((jf: any) => jf.id === item.job_function_id);
      const funcName = jfObj?.name || jfObj?.title || 'Perfil';
      ssDetails.push(`${item.quantity}x ${funcName} (€${(item.ss_cost_hour || 0).toFixed(2)}/h)`);
    }
  });

  if (totalSsAmount > 0) {
    autoCosts.push({
      id: 'auto-ss',
      cost_category: 'social_security',
      description: t
        ? t('comercial.costs.autoSS', {
            details: ssDetails.join(', '),
            defaultValue: `Segurança Social Estimada (${ssDetails.join(', ')})`,
          })
        : `Segurança Social Estimada (${ssDetails.join(', ')})`,
      amount: Number(totalSsAmount.toFixed(2)),
      is_rechargeable: false,
      markup_percent: 0,
      is_auto: true,
    });
  }

  const manualCosts = (data.costs || []).filter((c: any) => !c.is_auto);
  const allCosts = [...manualCosts, ...autoCosts];

  let totalCost = 0;
  let totalRevenue = 0;

  updatedItems.forEach((item: any) => {
    const cssh = item.ss_cost_hour || 0;
    const effective_cost = Number(item.base_cost_hour) + cssh;
    totalCost += effective_cost * Number(item.total_hours);
    totalRevenue += Number(item.sell_rate_hour) * Number(item.total_hours);
  });

  const additionalRevenuesSum = (data.additional_revenues || []).reduce(
    (sum: number, r: any) => sum + Number(r.amount || 0),
    0
  );
  totalRevenue += additionalRevenuesSum;

  allCosts.forEach((c: any) => {
    if (c.cost_category === 'social_security') {
      return;
    }
    totalCost += Number(c.amount);
    if (c.is_rechargeable) {
      totalRevenue += Number(c.amount) * (1 + Number(c.markup_percent) / 100);
    }
  });

  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return {
    items: updatedItems,
    costs: allCosts,
    total_estimated_cost: Number(totalCost.toFixed(2)),
    total_estimated_revenue: Number(totalRevenue.toFixed(2)),
    estimated_margin_percent: Number(margin.toFixed(2)),
  };
}
