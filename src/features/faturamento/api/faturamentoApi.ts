import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import { getHoursControlWorkers } from '@/features/workers/api/workersApi';
import { createClient } from '@supabase/supabase-js';

// Helper to query Supabase tables in small batches to prevent URL/HTTP gateway size limits (e.g. 414 Request-URI Too Large)
async function fetchInChunks<T>(
  ids: string[],
  chunkSize: number,
  fetchFn: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkResults = await fetchFn(chunk);
    results.push(...chunkResults);
  }
  return results;
}

// Helper to query all rows of a Supabase table by paginating via .range() to bypass PostgREST's default 1000 row limit
export async function fetchAllPages<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const allData: T[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await queryFn(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return allData;
}

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '') as string;

export const publicSupabase = createClient(
  supabaseUrl || 'https://pyahcgorkvwfwmlzspnv.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

export interface HoraTrabalhada {
  id: string;
  worker_id: string;
  client_id: string;
  data_trabalho: string;
  hora_inicio: string;
  hora_fim: string;
  horas_totais: number;
  status: string;
  extraction_confidence: number | null;
  worker?: {
    nombrecompleto: string;
  };
  client?: {
    nombre_comercial: string;
  };
}

export interface Fatura {
  id: string;
  client_id: string;
  status: string;
  data_emissao: string;
  magic_link_token: string;
  ajustes_json?: any | null;
  fatura_numero?: string | null;
  atcud?: string | null;
  client?: {
    nombre_comercial: string;
    codigo?: string | null;
    paymentTermName?: string | null;
    paymentTermDays?: number | null;
    address_line?: string | null;
    postal_code?: string | null;
    city?: string | null;
    province?: string | null;
    tax_id?: string | null;
  };
  empresa?: {
    nome: string;
    taxId: string;
    addressLine?: string | null;
    postalCode?: string | null;
    city?: string | null;
    province?: string | null;
    email?: string | null;
    phone?: string | null;
    iban?: string | null;
    invoiceSeries?: string | null;
    nextInvoiceNumber?: number | null;
    atcudPrefix?: string | null;
    capitalSocial?: string | null;
    conservatoria?: string | null;
    matricula?: string | null;
    certifiedSoftwareText?: string | null;
    invoiceLogoUrl?: string | null;
  } | null;
}

export interface ClientBillingSummary {
  clientId: string;
  clientName: string;
  clientLegalName?: string | null;
  clientCodigo?: string | null;
  empresaNome: string;
  empresaId: string;
  empresaInvoiceSeries?: string | null;
  empresaNextInvoiceNumber?: number | null;
  empresaAtcudPrefix?: string | null;
  empresaCapitalSocial?: string | null;
  empresaConservatoria?: string | null;
  empresaMatricula?: string | null;
  empresaCertifiedSoftwareText?: string | null;
  empresaInvoiceLogoUrl?: string | null;
  empresaAddressLine?: string | null;
  empresaPostalCode?: string | null;
  empresaCity?: string | null;
  empresaProvince?: string | null;
  empresaTaxId?: string | null;
  empresaEmail?: string | null;
  empresaPhone?: string | null;
  empresaIban?: string | null;
  empresaBankDetails?: string | null;

  clientAddressLine?: string | null;
  clientPostalCode?: string | null;
  clientCity?: string | null;
  clientProvince?: string | null;
  clientCountryName?: string | null;

  faturaNumero?: string | null;
  activeFaturaId?: string | null;
  atcud?: string | null;

  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  totalHoras: number;
  totalValor: number;
  statusBilling: 'waiting_validation' | 'ready' | 'invoiced_pending' | 'invoiced_approved' | 'invoiced_disputed';
  magicLinkToken: string | null;
  dataEmissaoFatura?: string | null;
  ajustesJson?: any | null;
  totalWorkers: number;
  validatedWorkers: number;
  paymentTermName?: string | null;
  paymentTermDays?: number | null;
  billingEmail?: string | null;
  clientEmail?: string | null;
  viesApplicable?: boolean;
  viesStatus?: string | null;
  viesValid?: boolean;
  viesLastCheckedAt?: string | null;
  taxId?: string | null;
  countryId?: string | null;
  obras: Array<{
    id: string | null;
    name: string;
    totalHoras: number;
    totalValor: number;
    horasIds: string[];
  }>;
  workers: Array<{
    workerId: string;
    workerName: string;
    codColab: string;
    perfil: string;
    tarifa: number;
    totalHoras: number;
    totalValor: number;
    totalHorasMes?: number;
    totalValorMes?: number;
    isValidated: boolean;
    isBilled: boolean;
    funcaoId?: string;
    workerStatus?: string | null;
    dataBaixa?: string | null;
    observacoes?: string | null;
    isException?: boolean;
    horasDiarias: Record<string, {
      id?: string;
      horas_totais: number;
      tarifa_faturada: number;
      data_trabalho: string;
      funcao_id?: string;
      obra?: string | null;
      fatura_id?: string | null;
    }>;
  }>;
  clientHours?: any[];
}

export async function getHorasPendentesFaturamento(
  empresaId?: string | null,
  periodYear?: number,
  periodMonth?: number
): Promise<ClientBillingSummary[]> {
  try {
    if (!empresaId || !periodYear || !periodMonth) return [];

    // 1. Fetch active company info
    const { data: empresaData } = await supabase
      .schema('core_common')
      .from('empresas')
      .select(`
        nome, address_line, postal_code, city, province, tax_id, email, phone, iban, bank_details,
        invoice_series, next_invoice_number, atcud_prefix, capital_social, conservatoria, matricula, certified_software_text, invoice_logo_url
      `)
      .eq('id', empresaId)
      .single();
    
    const empresaNome = empresaData?.nome || 'Não Informada';
    const empresaAddressLine = empresaData?.address_line || null;
    const empresaPostalCode = empresaData?.postal_code || null;
    const empresaCity = empresaData?.city || null;
    const empresaProvince = empresaData?.province || null;
    const empresaTaxId = empresaData?.tax_id || null;
    const empresaEmail = empresaData?.email || null;
    const empresaPhone = empresaData?.phone || null;
    const empresaIban = empresaData?.iban || null;
    const empresaBankDetails = empresaData?.bank_details || null;
    const empresaInvoiceSeries = empresaData?.invoice_series || null;
    const empresaNextInvoiceNumber = empresaData?.next_invoice_number || null;
    const empresaAtcudPrefix = empresaData?.atcud_prefix || null;
    const empresaCapitalSocial = empresaData?.capital_social || null;
    const empresaConservatoria = empresaData?.conservatoria || null;
    const empresaMatricula = empresaData?.matricula || null;
    const empresaCertifiedSoftwareText = empresaData?.certified_software_text || null;
    const empresaInvoiceLogoUrl = empresaData?.invoice_logo_url || null;

    // 2. Fetch active workers for the period (moved up)
    const activeWorkers = await getHoursControlWorkers({
      empresaId,
      periodYear,
      periodMonth
    });

    // 3. Fetch all clients globally
    const { data: clientsData, error: clientsError } = await supabase
      .schema('core_common')
      .from('clients')
      .select(`
        id, trade_name, legal_name, codigo, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id,
        address_line, postal_code, city, province,
        countries (
          name
        ),
        client_company_settings (
          empresa_id,
          payment_term_id,
          status,
          billing_cycle_start_day        )
      `)
      .range(0, 9999);

    if (clientsError) throw mapSupabaseError(clientsError);

    const mappedClientsData = (clientsData || []).map((c: any) => {
      const settings = c.client_company_settings?.find((s: any) => s.empresa_id === empresaId);
      return {
        ...c,
        empresa_id: settings?.empresa_id || null,
        payment_term_id: settings?.payment_term_id || null,
        status: settings?.status || 'active',
        billing_cycle_start_day: settings?.billing_cycle_start_day || 1
      };
    });

    // Fetch all payment terms metadata
    const { data: ptData } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .select('id, name, days');
    const ptMap = new Map((ptData || []).map(pt => [pt.id, pt]));

    // 4. Ensure all unique clients of the active workers exist in core_common.clients for this company
    const clientsList = [...mappedClientsData];
    const uniqueClientNames = Array.from(new Set(activeWorkers.map(w => w.cliente_nombre).filter(Boolean)));

    const normalizeName = (n?: string | null) => {
      if (!n) return '';
      return n
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/(s[alr]u?|lda|unipessoal|su)$/g, '');
    };

    for (const name of uniqueClientNames) {
      const exists = clientsList.some(c => {
        if (c.empresa_id !== empresaId) return false;
        const normC = normalizeName(c.trade_name);
        const normN = normalizeName(name);
        return normC === normN || (normC.length > 3 && normN.includes(normC)) || (normN.length > 3 && normC.includes(normN));
      });
      if (!exists) {
        console.log(`Auto-creating missing client in core_common.clients: ${name}`);
        const { data: newClient, error: insertError } = await supabase
          .schema('core_common')
          .from('clients')
          .insert({
            trade_name: name,
            legal_name: name,
            vies_applicable: true
          })
          .select('id, trade_name, legal_name, codigo, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id')
          .single();

        if (insertError) {
          console.error(`Error auto-creating client ${name}:`, insertError);
        } else if (newClient) {
          const { error: settingsError } = await supabase
            .schema('core_common')
            .from('client_company_settings')
            .insert({
              client_id: newClient.id,
              empresa_id: empresaId,
              status: 'active'
            });

          if (settingsError) {
              console.error(`Error auto-creating client settings for ${name}:`, settingsError);
          }

          clientsList.push({
            ...newClient,
            empresa_id: empresaId,
            status: 'active',
            payment_term_id: null,
            billing_cycle_start_day: 1
          });
        }
      }
    }

    if (clientsList.length === 0) return [];

    // Filter candidate clients that belong to the current company or match active workers
    const candidateClients = clientsList.filter(c => {
      if (c.empresa_id === empresaId) return true;
      const normC = normalizeName(c.trade_name);
      return uniqueClientNames.some(name => {
        const normN = normalizeName(name);
        return normC === normN || (normC.length > 3 && normN.includes(normC)) || (normN.length > 3 && normC.includes(normN));
      });
    });
    const candidateClientIds = candidateClients.map(c => c.id);

    // 4. Fetch validation status of sheet records (worker_hours)
    // We query worker_hours in chunks for the active workers only to optimize query size and avoid truncation
    let workerHoursList: any[] = [];
    const activeWorkerIds = activeWorkers.map(w => w.id);
    if (activeWorkerIds.length > 0) {
      workerHoursList = await fetchInChunks(activeWorkerIds, 30, async (chunk) => {
        const { data: whData, error: whError } = await supabase
          .schema('core_personal')
          .from('worker_hours')
          .select('worker_id, status, observacoes')
          .in('worker_id', chunk)
          .eq('period_year', periodYear)
          .eq('period_month', periodMonth);
        if (whError) throw mapSupabaseError(whError);
        return whData || [];
      });
    }
    const workerHoursMap = new Map(workerHoursList.map(wh => [wh.worker_id, { status: wh.status, observacoes: wh.observacoes }]));

    // Helper to get exact dynamic date range for a given client billing cycle start day
    const getClientDateRange = (startDay: number, year: number, month: number) => {
      if (startDay === 1) {
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
      } else {
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear = year - 1;
        }
        const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        // The cycle ends on the day before the start day of the current faturamento month
        const end = `${year}-${String(month).padStart(2, '0')}-${String(startDay - 1).padStart(2, '0')}`;
        return { start, end };
      }
    };

    // 5. Fetch validated hours in core_finance.horas_trabalhadas for a 2-month span to support custom cycles (e.g. 25-to-25)
    let prevYear = periodYear;
    let prevMonth = periodMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = periodYear - 1;
    }
    const startDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

    // We query hours only for the candidate client IDs of this company to avoid Supabase's default 1,000 limit truncation
    let horasTrabalhadasList: any[] = [];
    if (candidateClientIds.length > 0) {
      horasTrabalhadasList = await fetchInChunks(candidateClientIds, 30, async (chunk) => {
        return fetchAllPages(async (from, to) => {
          return supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('*')
            .in('client_id', chunk)
            .gte('data_trabalho', startDateStr)
            .lte('data_trabalho', endDateStr)
            .range(from, to);
        });
      });
    };

    // Fetch unknown workers (workers with hours but not in activeWorkers)
    const unknownWorkerIds = Array.from(new Set(
      horasTrabalhadasList
        .map(h => h.worker_id)
        .filter(id => id && !activeWorkers.some(w => w.id === id))
    ));

    let unknownWorkers: any[] = [];
    if (unknownWorkerIds.length > 0) {
      const { data: uwData } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, status_trabajador, data_baixa, funcion, cod_colab, contracts(empresa_id)')
        .in('id', unknownWorkerIds);
      unknownWorkers = (uwData || []).map((w: any) => ({
        ...w,
        empresa_id: w.contracts?.find((c: any) => c.empresa_id === empresaId)?.empresa_id || null
      }));
    }
    const unknownWorkersMap = new Map(unknownWorkers.map(w => [w.id, w]));

    const belongsToCompany = (wId: string) => {
      if (activeWorkers.some(w => w.id === wId)) return true;
      const uw = unknownWorkersMap.get(wId);
      return uw ? uw.empresa_id === empresaId : false;
    };

    // Filter hours to keep those belonging to the company's workers AND falling within their client's custom cycle
    const hoursList = horasTrabalhadasList.filter(h => {
      if (!belongsToCompany(h.worker_id)) return false;
      const client = clientsList.find(c => c.id === h.client_id);
      if (!client) return false;
      const cycleStartDay = client.billing_cycle_start_day || 1;
      const { start: clientStart, end: clientEnd } = getClientDateRange(cycleStartDay, periodYear, periodMonth);
      return h.data_trabalho >= clientStart && h.data_trabalho <= clientEnd;
    });

    // 6. Filter clients to only keep relevant ones for active workers and actual hours (only for the current company)
    const relevantClients = clientsList.filter(client => {
      if (client.empresa_id !== empresaId) return false;
      const clientNameLower = client.trade_name?.trim().toLowerCase();
      const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
      const hasHours = hoursList.some(h => h.client_id === client.id);
      const isActuallyActive = hasWorkers || hasHours;

      // Only filter out by status if they don't have actual hours or workers
      if (client.status !== 'active' && !isActuallyActive) return false;

      return isActuallyActive;
    });
    const relevantClientIds = relevantClients.map(c => c.id);

    // 7. Fetch client sites only for relevant clients in batches to avoid header/URL size limit errors
    let clientSites: any[] = [];
    if (relevantClientIds.length > 0) {
      clientSites = await fetchInChunks(relevantClientIds, 30, async (chunk) => {
        const { data: csData, error: csError } = await supabase
          .schema('core_common')
          .from('client_sites')
          .select('id, name')
          .in('client_id', chunk);
        if (csError) throw mapSupabaseError(csError);
        return csData || [];
      });
    }
    const clientSitesMap = new Map(clientSites.map(s => [s.id, s.name]));

    // 8. Fetch existing faturas
    const faturaIds = Array.from(new Set(hoursList.map(h => h.fatura_id).filter(Boolean)));
    let faturasList: any[] = [];
    if (faturaIds.length > 0) {
      const { data: fatData } = await supabase
        .schema('core_finance')
        .from('faturas')
        .select('id, client_id, status, magic_link_token, data_emissao, ajustes_json, fatura_numero, atcud')
        .in('id', faturaIds);
      faturasList = fatData || [];
    }
    const faturasMap = new Map(faturasList.map(f => [f.id, f]));

    // 9. Fetch job functions for profile names
    const funcaoIds = Array.from(new Set(hoursList.map(h => h.funcao_id).filter(Boolean)));
    const workerFuncaoIds = activeWorkers.map(w => w.funcao_id).filter(Boolean);
    const allFuncaoIds = Array.from(new Set([...funcaoIds, ...workerFuncaoIds]));

    let jobFunctions: any[] = [];
    if (allFuncaoIds.length > 0) {
      const { data: jfData } = await supabase
        .schema('core_comercial')
        .from('job_functions')
        .select('id, name')
        .in('id', allFuncaoIds);
      jobFunctions = jfData || [];
    }
    const jobFunctionsMap = new Map(jobFunctions.map(j => [j.id, j.name]));

    // Fetch custom worker exception tariffs for relevant clients
    let workerExceptions: any[] = [];
    if (relevantClientIds.length > 0) {
      const { data: excData } = await supabase
        .schema('core_common')
        .from('client_worker_tariffs')
        .select('client_id, worker_id, client_site_id, valor_tarifa')
        .in('client_id', relevantClientIds);
      workerExceptions = excData || [];
    }

    // 10. Construct summarizing list
    const clientSummaries: ClientBillingSummary[] = [];

    for (const client of relevantClients) {
      // Find workers assigned to this client (case-insensitive trade_name match)
      const clientNameLower = client.trade_name?.trim().toLowerCase();
      const clientWorkers = activeWorkers.filter(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);

      // If the client has no workers and no hours registered, skip it
      const clientHours = hoursList.filter(h => h.client_id === client.id);
      if (clientWorkers.length === 0 && clientHours.length === 0) continue;

      // Calculate Obras totals for the client based on active session hours
      const unbilledHours = clientHours.filter(h => !h.fatura_id);
      
      let activeSessionHours: any[] = [];
      let activeFatura: any = null;

      if (unbilledHours.length > 0) {
        activeSessionHours = unbilledHours;
      } else {
        const clientFaturas = Array.from(faturasMap.values()).filter(f => f.client_id === client.id);
        const pendingFaturas = clientFaturas.filter(f => f.status === 'pending_client_approval' || f.status === 'disputed');
        
        if (pendingFaturas.length > 0) {
          const latestPending = pendingFaturas.sort((a, b) => b.id.localeCompare(a.id))[0];
          activeFatura = latestPending;
          activeSessionHours = clientHours.filter(h => h.fatura_id === latestPending.id);
        } else if (clientFaturas.length > 0) {
          const latestFinalized = clientFaturas.sort((a, b) => b.id.localeCompare(a.id))[0];
          activeFatura = latestFinalized;
          activeSessionHours = clientHours.filter(h => h.fatura_id === latestFinalized.id);
        } else {
          activeSessionHours = [];
        }
      }

      const obrasMap = new Map<string | null, { id: string | null; name: string; totalHoras: number; totalValor: number; horasIds: string[] }>();
      
      activeSessionHours.forEach(h => {
        const oId = h.obra_id || null;
        if (!obrasMap.has(oId)) {
          const siteName = oId ? (clientSitesMap.get(oId) || 'Obra Desconhecida') : 'Sem Obra';
          obrasMap.set(oId, {
            id: oId,
            name: siteName,
            totalHoras: 0,
            totalValor: 0,
            horasIds: []
          });
        }
        const entry = obrasMap.get(oId)!;
        entry.totalHoras += Number(h.horas_totais || 0);
        entry.totalValor += Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0);
        if (h.id) {
          entry.horasIds.push(h.id);
        }
      });

      const obrasSummary = Array.from(obrasMap.values()).sort((a, b) => {
        if (a.id === null) return 1; // "Sem Obra" goes last
        if (b.id === null) return -1;
        return a.name.localeCompare(b.name);
      });

      let totalHoras = 0;
      let totalValor = 0;
      let validatedWorkersCount = 0;

      // Group hours by worker
      const hoursByWorker = new Map<string, any[]>();
      clientHours.forEach(h => {
        if (!hoursByWorker.has(h.worker_id)) {
          hoursByWorker.set(h.worker_id, []);
        }
        hoursByWorker.get(h.worker_id)!.push(h);
      });

      // Group active session hours by worker
      const activeHoursByWorker = new Map<string, any[]>();
      activeSessionHours.forEach(h => {
        if (!activeHoursByWorker.has(h.worker_id)) {
          activeHoursByWorker.set(h.worker_id, []);
        }
        activeHoursByWorker.get(h.worker_id)!.push(h);
      });

      // Build workers summary list
      const workersSummary = [];
      const resolvedWorkerIds = new Set<string>();
      
      for (const w of clientWorkers) {
        resolvedWorkerIds.add(w.id);
        const whObj = workerHoursMap.get(w.id);
        const whStatus = whObj?.status;
        const isValidated = whStatus === 'validado';
        const observacoes = whObj?.observacoes || null;

        if (isValidated) {
          validatedWorkersCount++;
        }

        const wHours = hoursByWorker.get(w.id) || [];
        const wActiveHours = activeHoursByWorker.get(w.id) || [];

        const wTotalHoras = wActiveHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValor = wActiveHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

        const wTotalHorasMes = wHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValorMes = wHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

        totalHoras += wTotalHoras;
        totalValor += wTotalValor;

        const horasDiarias: Record<string, any> = {};
        wHours.forEach(h => {
          const dateOnly = h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho;
          horasDiarias[dateOnly] = h;
        });

        // Determine job function profile name
        const hourlyFuncaoId = wHours.find(h => h.funcao_id)?.funcao_id;
        const perfilName = jobFunctionsMap.get(hourlyFuncaoId || w.funcao_id || '') || w.funcao || 'Não Definido';

        // Find tariff from hours, or default to mock
        const sampleHour = wHours[0];
        const tarifa = sampleHour ? Number(sampleHour.tarifa_faturada || 0) : (w.funcao?.toLowerCase().includes('soldador') ? 25.50 : (w.funcao?.toLowerCase().includes('tubero') ? 28.00 : 27.00));

        // Check if there is an active custom exception configuration for this worker
        const hourlyObraId = wHours[0]?.obra_id || null;
        const hasException = workerExceptions.some(e => 
          e.client_id === client.id && 
          e.worker_id === w.id && 
          (e.client_site_id === hourlyObraId || e.client_site_id === null)
        );

        const isBilled = wHours.length === 0 || wHours.every(h => h.fatura_id !== null);

        workersSummary.push({
          workerId: w.id,
          workerName: w.nome || 'Trabalhador Desconhecido',
          codColab: w.cod_colab || 'N/A',
          perfil: perfilName,
          tarifa,
          totalHoras: wTotalHoras,
          totalValor: wTotalValor,
          totalHorasMes: wTotalHorasMes,
          totalValorMes: wTotalValorMes,
          isValidated,
          isBilled,
          funcaoId: hourlyFuncaoId || w.funcao_id,
          workerStatus: w.status_trabajador || 'Ativo',
          dataBaixa: w.data_baixa || null,
          observacoes,
          isException: hasException,
          horasDiarias
        });
      }

      // Add any workers who have hours in core_finance but were not returned in getHoursControlWorkers (just in case)
      for (const [wId, wHours] of hoursByWorker.entries()) {
        if (resolvedWorkerIds.has(wId)) continue;

        const sampleHour = wHours[0];
        
        // Resolve worker from activeWorkers or unknownWorkersMap
        const activeW = activeWorkers.find(w => w.id === wId);
        const uw = activeW || unknownWorkersMap.get(wId);
        const wName = uw?.nome || 'Trabalhador Desconhecido';
        const wCodColab = uw?.cod_colab || 'N/A';
        const wStatus = uw?.status_trabajador || 'Ativo';
        const wDataBaixa = uw?.data_baixa || null;
        const wFuncaoId = sampleHour.funcao_id || null;

        const wActiveHours = activeHoursByWorker.get(wId) || [];
        const wTotalHoras = wActiveHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValor = wActiveHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

        const wTotalHorasMes = wHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValorMes = wHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

        totalHoras += wTotalHoras;
        totalValor += wTotalValor;

        const horasDiarias: Record<string, any> = {};
        wHours.forEach(h => {
          const dateOnly = h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho;
          horasDiarias[dateOnly] = h;
        });

        const tariff = sampleHour ? Number(sampleHour.tarifa_faturada || 0) : 27.00;

        const hasException = workerExceptions.some(e => 
          e.client_id === client.id && 
          e.worker_id === wId && 
          (e.client_site_id === sampleHour.obra_id || e.client_site_id === null)
        );

        const isBilled = wHours.length === 0 || wHours.every(h => h.fatura_id !== null);

        workersSummary.push({
          workerId: wId,
          workerName: wName,
          codColab: wCodColab,
          perfil: jobFunctionsMap.get(wFuncaoId || '') || uw?.funcion || 'Não Definido',
          tarifa: tariff,
          totalHoras: wTotalHoras,
          totalValor: wTotalValor,
          totalHorasMes: wTotalHorasMes,
          totalValorMes: wTotalValorMes,
          isValidated: true,
          isBilled,
          workerStatus: wStatus,
          dataBaixa: wDataBaixa,
          observacoes: null,
          funcaoId: wFuncaoId,
          isException: hasException,
          horasDiarias
        });
        
        validatedWorkersCount++;
      }

      // Calculate unbilled and billed counts
      const unbilledWorkersList = workersSummary.filter(w => !w.isBilled);
      const totalUnbilled = unbilledWorkersList.length;
      const validatedUnbilled = unbilledWorkersList.filter(w => w.isValidated).length;

      // Check if there are any unbilled hours or if we have workers with no hours recorded yet
      const hasPendingHours = clientHours.some(h => !h.fatura_id);
      const hasPendingWorkers = clientWorkers.length > 0 && clientHours.length === 0;
      const hasUnbilled = hasPendingHours || hasPendingWorkers || totalUnbilled > 0;

      let statusBilling: ClientBillingSummary['statusBilling'] = 'waiting_validation';
      let magicLinkToken: string | null = null;
      let dataEmissaoFatura: string | null = null;
      let ajustesJson: any | null = null;
      let faturaNumero: string | null = null;
      let faturaAtcud: string | null = null;

      if (activeFatura) {
        magicLinkToken = activeFatura.magic_link_token;
        dataEmissaoFatura = activeFatura.data_emissao || null;
        ajustesJson = activeFatura.ajustes_json || null;
        faturaNumero = activeFatura.fatura_numero || null;
        faturaAtcud = activeFatura.atcud || null;
        if (activeFatura.status === 'pending_client_approval') {
          statusBilling = 'invoiced_pending';
        } else if (activeFatura.status === 'approved' || activeFatura.status === 'invoice_sent') {
          statusBilling = 'invoiced_approved';
        } else if (activeFatura.status === 'disputed') {
          statusBilling = 'invoiced_disputed';
        }
      }

      if (hasUnbilled && (!activeFatura || activeFatura.status === 'approved' || activeFatura.status === 'invoice_sent' || activeFatura.status === 'invoiced')) {
        // Active billing session: there are unbilled hours/workers
        if (totalUnbilled > 0 && validatedUnbilled === totalUnbilled) {
          statusBilling = 'ready';
        } else {
          statusBilling = 'waiting_validation';
        }
      }

      const termName = client.payment_terms || (client.payment_term_id ? ptMap.get(client.payment_term_id)?.name : null) || 'N/A';
      const termDays = (client.payment_term_id ? ptMap.get(client.payment_term_id)?.days : null) ?? null;

      clientSummaries.push({
        clientId: client.id,
        clientName: client.trade_name || client.legal_name || 'Cliente Desconhecido',
        clientLegalName: client.legal_name || client.trade_name || 'Cliente Desconhecido',
        clientCodigo: client.codigo || null,
        empresaNome,
        empresaId: empresaId || '',
        empresaInvoiceSeries,
        empresaNextInvoiceNumber,
        empresaAtcudPrefix,
        empresaCapitalSocial,
        empresaConservatoria,
        empresaMatricula,
        empresaCertifiedSoftwareText,
        empresaInvoiceLogoUrl,
        empresaAddressLine,
        empresaPostalCode,
        empresaCity,
        empresaProvince,
        empresaTaxId,
        empresaEmail,
        empresaPhone,
        empresaIban,
        empresaBankDetails,
        clientAddressLine: client.address_line || null,
        clientPostalCode: client.postal_code || null,
        clientCity: client.city || null,
        clientProvince: client.province || null,
        clientCountryName: client.countries ? (Array.isArray(client.countries) ? client.countries[0]?.name : (client.countries as any).name) : null,
        faturaNumero: faturaNumero,
        activeFaturaId: activeFatura ? activeFatura.id : null,
        atcud: faturaAtcud,
        year: periodYear,
        month: periodMonth - 1, // 0-indexed
        totalHoras,
        totalValor,
        statusBilling,
        magicLinkToken,
        dataEmissaoFatura,
        ajustesJson,
        totalWorkers: hasUnbilled ? totalUnbilled : workersSummary.length,
        validatedWorkers: hasUnbilled ? validatedUnbilled : workersSummary.length,
        paymentTermName: termName,
        paymentTermDays: termDays,
        billingEmail: client.billing_email || null,
        clientEmail: client.email || null,
        viesApplicable: client.vies_applicable || false,
        viesStatus: client.vies_status || 'not_checked',
        viesValid: client.vies_valid || false,
        viesLastCheckedAt: client.vies_last_checked_at || null,
        taxId: client.tax_id || null,
        countryId: client.country_id || null,
        billingCycleStartDay: client.billing_cycle_start_day || 1,
        obras: obrasSummary,
        workers: workersSummary,
        clientHours: activeSessionHours
      });
    }

    return clientSummaries;
  } catch (error: any) {
    console.error('Erro no getHorasPendentesFaturamento:', error);
    return [];
  }
}

export async function solicitarAprovacaoCliente(
  clientId: string, 
  horasIds: string[],
  ajustes?: any,
  customToken?: string,
  empresaId?: string
): Promise<string> {
  const token = customToken || crypto.randomUUID();

  let faturaNumero: string | null = null;
  let atcud: string | null = null;

  if (customToken) {
    const { data: existingFat } = await supabase
      .schema('core_finance')
      .from('faturas')
      .select('id, magic_link_token')
      .eq('magic_link_token', customToken)
      .maybeSingle();

    if (existingFat) {
      const { error: updErr } = await supabase
        .schema('core_finance')
        .from('faturas')
        .update({
          ajustes_json: ajustes || null,
          data_emissao: ajustes?.data_emissao || new Date().toISOString().split('T')[0]
        })
        .eq('id', existingFat.id);

      if (updErr) throw mapSupabaseError(updErr);
      return customToken;
    }
  }

  if (empresaId) {
    // 1. Fetch active company numbering info
    const { data: empresa } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('invoice_series, next_invoice_number, atcud_prefix')
      .eq('id', empresaId)
      .single();

    if (empresa) {
      const series = empresa.invoice_series || '1';
      const number = empresa.next_invoice_number || 1;
      const year = new Date().getFullYear();
      
      faturaNumero = `Factura nº${series} ${year}/${number}`;
      if (empresa.atcud_prefix) {
        atcud = `${empresa.atcud_prefix}-${number}`;
      }

      // 2. Increment next_invoice_number
      await supabase
        .schema('core_common')
        .from('empresas')
        .update({ next_invoice_number: number + 1 })
        .eq('id', empresaId);
    }
  }

  // Cria a fatura com status pending_client_approval
  const { data: fatura, error: faturaError } = await supabase
    .schema('core_finance')
    .from('faturas')
    .insert({
      client_id: clientId,
      empresa_id: empresaId || null,
      status: 'pending_client_approval',
      magic_link_token: token,
      data_emissao: ajustes?.data_emissao || new Date().toISOString().split('T')[0],
      ajustes_json: ajustes || null,
      fatura_numero: faturaNumero,
      atcud: atcud
    })
    .select('id, magic_link_token')
    .single();

  if (faturaError) throw mapSupabaseError(faturaError);

  // Atualiza as horas para apontar para a fatura criada e altera o status
  if (fatura && horasIds.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < horasIds.length; i += CHUNK_SIZE) {
      const chunk = horasIds.slice(i, i + CHUNK_SIZE);
      const { error: updateError } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .update({ 
          status: 'pending_client_approval',
          fatura_id: fatura.id 
        })
        .in('id', chunk);

      if (updateError) throw mapSupabaseError(updateError);
    }
  }

  return token;
}

export async function cancelarFatura(faturaId: string): Promise<void> {
  // 1. Reset horas_trabalhadas pointing to this fatura back to validado and fatura_id = null
  const { error: horasError } = await supabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .update({ 
      status: 'validado',
      fatura_id: null 
    })
    .eq('fatura_id', faturaId);

  if (horasError) throw mapSupabaseError(horasError);

  // 2. Handle associated accounts receivable entries (contas_receber)
  try {
    const { error: deleteCobroError } = await supabase
      .from('contas_receber')
      .delete()
      .eq('fatura_id', faturaId);
      
    if (deleteCobroError) {
      console.warn('Could not delete contas_receber, disassociating instead:', deleteCobroError);
      await supabase
        .from('contas_receber')
        .update({ fatura_id: null })
        .eq('fatura_id', faturaId);
    }
  } catch (err) {
    console.error('Failed to delete contas_receber on cancel, attempting update instead:', err);
    await supabase
      .from('contas_receber')
      .update({ fatura_id: null })
      .eq('fatura_id', faturaId);
  }

  // 3. Delete the fatura row
  const { error: faturaError } = await supabase
    .schema('core_finance')
    .from('faturas')
    .delete()
    .eq('id', faturaId);

  if (faturaError) throw mapSupabaseError(faturaError);
}

export async function getFaturaByToken(token: string): Promise<{ fatura: Fatura, horas: HoraTrabalhada[] }> {
  const { data, error } = await publicSupabase.rpc('get_fatura_portal_data', { p_token: token });
  
  if (error) throw mapSupabaseError(error);
  if (!data) throw new Error('Fatura não encontrada');

  const fatura = data.fatura;
  const horas = data.horas || [];
  const workers = data.workers || [];
  const jobFunctions = data.job_functions || [];

  const jobFunctionsMap = new Map((jobFunctions as any[]).map(j => [j.id, j.name]));
  const workersMap = new Map((workers as any[]).map(w => [w.id, w]));

  const horasMapeadas = (horas as any[]).map(h => {
    const worker = workersMap.get(h.worker_id);
    const hourlyPerfil = jobFunctionsMap.get(h.funcao_id || '');
    return {
      ...h,
      worker: worker ? { 
        nombrecompleto: worker.nome,
        codColab: worker.cod_colab,
        perfil: hourlyPerfil || worker.funcion || 'Não Definido'
      } : undefined
    };
  });

  return {
    fatura: fatura as Fatura,
    horas: horasMapeadas as HoraTrabalhada[]
  };
}

export function normalizeDisputedHours(disputedObj: any): Record<string, Record<string, number>> {
  if (!disputedObj || typeof disputedObj !== 'object') return {};
  const normalized: Record<string, Record<string, number>> = {};

  Object.keys(disputedObj).forEach(workerId => {
    const dates = disputedObj[workerId] || {};
    if (!normalized[workerId]) normalized[workerId] = {};

    Object.keys(dates).forEach(rawDate => {
      let cleanDate = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : '';
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = String(parseInt(parts[1])).padStart(2, '0');
        const d = String(parseInt(parts[2])).padStart(2, '0');
        cleanDate = `${y}-${m}-${d}`;
      }
      if (cleanDate) {
        normalized[workerId][cleanDate] = Number(dates[rawDate] || 0);
      }
    });
  });

  return normalized;
}

export function deepMergeDisputedHours(existing: any, modified: any): Record<string, Record<string, number>> {
  const merged: Record<string, Record<string, number>> = {};
  
  if (existing && typeof existing === 'object') {
    Object.keys(existing).forEach(wId => {
      merged[wId] = { ...(existing[wId] || {}) };
    });
  }

  if (modified && typeof modified === 'object') {
    Object.keys(modified).forEach(wId => {
      if (!merged[wId]) merged[wId] = {};
      Object.keys(modified[wId] || {}).forEach(dateKey => {
        merged[wId][dateKey] = Number(modified[wId][dateKey]);
      });
    });
  }

  return normalizeDisputedHours(merged);
}

export function getDisputedHourValue(disputedObj: any, wId: string, rawDateKey: string, defaultVal: number): number {
  if (!disputedObj || !disputedObj[wId]) return defaultVal;
  const wObj = disputedObj[wId];

  const cleanKey = rawDateKey ? (rawDateKey.includes('T') ? rawDateKey.split('T')[0] : rawDateKey) : '';
  if (wObj[cleanKey] !== undefined) return Number(wObj[cleanKey]);
  if (wObj[rawDateKey] !== undefined) return Number(wObj[rawDateKey]);

  const cleanParts = cleanKey.split('-');
  if (cleanParts.length === 3) {
    const y = cleanParts[0];
    const m = String(parseInt(cleanParts[1])).padStart(2, '0');
    const d = String(parseInt(cleanParts[2])).padStart(2, '0');
    const normalizedKey = `${y}-${m}-${d}`;
    if (wObj[normalizedKey] !== undefined) return Number(wObj[normalizedKey]);

    const unpaddedKey = `${y}-${parseInt(cleanParts[1])}-${parseInt(cleanParts[2])}`;
    if (wObj[unpaddedKey] !== undefined) return Number(wObj[unpaddedKey]);
  }

  return defaultVal;
}

export async function getFaturasTracking(empresaId?: string | null): Promise<any[]> {
  try {
    let query = supabase
      .schema('core_finance')
      .from('faturas')
      .select('*')
      .order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data: faturas, error: faturasError } = await query;

    if (faturasError) throw mapSupabaseError(faturasError);
    if (!faturas || faturas.length === 0) return [];

    // 3. Fetch clients
    const clientIds = Array.from(new Set(faturas.map(f => f.client_id).filter(Boolean)));
    let clients: any[] = [];
    if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .schema('core_common')
          .from('clients')
          .select(`
            id, codigo, trade_name, legal_name, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id,
            address_line, postal_code, city, province,
            client_company_settings (
              empresa_id,
              payment_term_id,
              status
            )
          `)
          .in('id', clientIds);
        if (clientsError) console.error('Erro ao buscar clientes para tracking:', clientsError);
        else clients = clientsData || [];
      }
      const clientsMap = new Map(clients.map(c => {
        const settings = c.client_company_settings?.find((s: any) => !empresaId || s.empresa_id === empresaId);
        return [c.id, {
          ...c,
          payment_term_id: settings?.payment_term_id || null,
          status: settings?.status || 'active'
        }];
      }));
  
      // Fetch all payment terms metadata
      const { data: ptData } = await supabase
        .schema('core_common')
        .from('payment_terms')
        .select('id, name, days');
      const ptMap = new Map((ptData || []).map(pt => [pt.id, pt]));
  
      // 4. Fetch hours totals and tariff for each fatura
      const faturaIds = faturas.map(f => f.id);
      let hoursSums: any[] = [];
      if (faturaIds.length > 0) {
        hoursSums = await fetchInChunks(faturaIds, 30, async (chunk) => {
          return fetchAllPages(async (from, to) => {
            return supabase
              .schema('core_finance')
              .from('horas_trabalhadas')
              .select('fatura_id, worker_id, data_trabalho, horas_totais, tarifa_faturada')
              .in('fatura_id', chunk)
              .range(from, to);
          });
        });
      }
  
      const hoursMap = new Map<string, number>();
      const valueMap = new Map<string, number>();
      const baseValueMap = new Map<string, number>();

      faturas.forEach(f => {
        const faturaHours = hoursSums.filter(h => h.fatura_id === f.id);
        const disputedObj = f.ajustes_json?.disputed_hours || {};
        
        let totHoras = 0;
        let totValor = 0;
        const processedKeys = new Set<string>();

        // Group by worker and day to sum duplicate registry records before applying adjustments
        const groupedMap = new Map<string, { wId: string; dateKey: string; hours: number; rate: number }>();
        faturaHours.forEach(h => {
          const wId = h.worker_id;
          if (!wId) return;
          const dateKey = h.data_trabalho ? (h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho) : '';
          const key = `${wId}_${dateKey}`;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { wId, dateKey, hours: 0, rate: Number(h.tarifa_faturada || 0) });
          }
          groupedMap.get(key)!.hours += Number(h.horas_totais || 0);
        });

        groupedMap.forEach((gVal, key) => {
          processedKeys.add(key);
          const hoursVal = getDisputedHourValue(disputedObj, gVal.wId, gVal.dateKey, gVal.hours);
          totHoras += hoursVal;
          totValor += hoursVal * gVal.rate;
        });

        // Also check any newly added dates in disputedObj not yet in hoursSums
        Object.keys(disputedObj).forEach(wId => {
          const dates = disputedObj[wId] || {};
          const sample = faturaHours.find(h => h.worker_id === wId);
          const rate = Number(sample?.tarifa_faturada || 0);

          Object.keys(dates).forEach(dateKey => {
            const key = `${wId}_${dateKey}`;
            if (!processedKeys.has(key)) {
              const hoursVal = Number(dates[dateKey] || 0);
              if (hoursVal > 0) {
                totHoras += hoursVal;
                totValor += hoursVal * rate;
              }
            }
          });
        });

        const reducoes = Number(f.ajustes_json?.reducoes || 0);
        const incrementos = Number(f.ajustes_json?.incrementos || 0);
        const ivaPct = Number(f.ajustes_json?.iva_pct || 0);
        const totValorFinal = (totValor + incrementos - reducoes) * (1 + ivaPct / 100);

        hoursMap.set(f.id, totHoras);
        valueMap.set(f.id, totValorFinal);
        baseValueMap.set(f.id, totValor);
      });
  
      return faturas.map(f => {
        const client = clientsMap.get(f.client_id);
        const termName = client ? ((client.payment_term_id ? ptMap.get(client.payment_term_id)?.name : null) || 'N/A') : 'N/A';
        const termDays = client ? ((client.payment_term_id ? ptMap.get(client.payment_term_id)?.days : null) ?? null) : null;
  
        const computedH = hoursMap.get(f.id);
        const computedV = valueMap.get(f.id);
        const computedBaseV = baseValueMap.get(f.id);
        const storedH = f.ajustes_json?.total_horas;
        const storedV = f.ajustes_json?.total_valor;

        const reducoes = Number(f.ajustes_json?.reducoes || 0);
        const incrementos = Number(f.ajustes_json?.incrementos || 0);
        const ivaPct = Number(f.ajustes_json?.iva_pct || 0);

        const finalH = storedH !== undefined ? storedH : ((computedH && computedH > 0) ? computedH : (f.total_horas || 0));
        const baseNetValue = ((Number(f.total_valor_base || f.total_valor || 0)) + incrementos - reducoes) * (1 + ivaPct / 100);
        const finalV = storedV !== undefined ? storedV : ((computedV && computedV > 0) ? computedV : baseNetValue);
        const finalBaseV = f.total_valor_base || f.ajustes_json?.total_valor_base || computedBaseV || f.total_valor || 0;

        return {
          ...f,
          client: client ? { 
            nombre_comercial: client.trade_name,
            legal_name: client.legal_name || client.trade_name || null,
            razon_social: client.legal_name || client.trade_name || null,
            trade_name: client.trade_name || null,
            codigo: client.codigo || null,
            paymentTermName: termName,
            paymentTermDays: termDays,
            billingEmail: client.billing_email || null,
            clientEmail: client.email || null,
            viesApplicable: client.vies_applicable || false,
            viesStatus: client.vies_status || 'not_checked',
            viesValid: client.vies_valid || false,
            viesLastCheckedAt: client.vies_last_checked_at || null,
            taxId: client.tax_id || null,
            countryId: client.country_id || null,
            address_line: client.address_line || null,
            postal_code: client.postal_code || null,
            city: client.city || null,
            province: client.province || null
          } : undefined,
          total_horas: finalH,
          total_valor: finalV,
          total_valor_base: finalBaseV
        };
      }).filter(f => f.status !== 'pending_client_approval' || (f.total_horas !== undefined && f.total_horas > 0));
  } catch (error: any) {
    console.error('Erro em getFaturasTracking:', error);
    return [];
  }
}

export async function aprovarHorasCliente(token: string, faturaId: string): Promise<void> {
  // Atualiza fatura
  const { error: faturaError } = await publicSupabase
    .schema('core_finance')
    .from('faturas')
    .update({ status: 'approved' })
    .eq('magic_link_token', token)
    .eq('id', faturaId);

  if (faturaError) throw mapSupabaseError(faturaError);

  // Atualiza horas relacionadas
  const { error: horasError } = await publicSupabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .update({ status: 'invoiced' })
    .eq('fatura_id', faturaId);

  if (horasError) throw mapSupabaseError(horasError);
}

export async function contestarHorasCliente(
  token: string, 
  faturaId: string, 
  motivo: string,
  proposedHours?: any,
  fileUrl?: string
): Promise<void> {
  // 1. Get fatura and its current adjustments
  const { data: fatura } = await publicSupabase
    .schema('core_finance')
    .from('faturas')
    .select('ajustes_json')
    .eq('id', faturaId)
    .single();

  const currentAdj = fatura?.ajustes_json || {};
  const updatedAdj = {
    ...currentAdj,
    disputed_hours: proposedHours ? normalizeDisputedHours(proposedHours) : null,
    dispute_file_url: fileUrl || null
  };

  // Atualiza fatura
  const { error: faturaError } = await publicSupabase
    .schema('core_finance')
    .from('faturas')
    .update({ 
      status: 'disputed',
      observacoes_cliente: motivo,
      ajustes_json: updatedAdj
    })
    .eq('magic_link_token', token)
    .eq('id', faturaId);

  if (faturaError) throw mapSupabaseError(faturaError);

  // Atualiza horas relacionadas
  const { error: horasError } = await publicSupabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .update({ status: 'disputed' })
    .eq('fatura_id', faturaId);

  if (horasError) throw mapSupabaseError(horasError);
}

export async function updateFaturaAjustes(
  faturaId: string,
  adjustments: {
    incrementos?: number;
    incrementos_desc?: string;
    reducoes?: number;
    reducoes_desc?: string;
    iva_pct?: number;
    descricao_servico?: string;
    disputed_hours?: any;
    total_horas?: number;
    total_valor_base?: number;
    total_valor?: number;
  }
): Promise<void> {
  const { data: currentFat, error: fetchErr } = await supabase
    .schema('core_finance')
    .from('faturas')
    .select('ajustes_json')
    .eq('id', faturaId)
    .single();

  if (fetchErr) throw mapSupabaseError(fetchErr);

  const currentAdj = currentFat?.ajustes_json || {};
  const updatedAdj = {
    ...currentAdj,
    ...(adjustments.incrementos !== undefined && { incrementos: Number(adjustments.incrementos || 0) }),
    ...(adjustments.incrementos_desc !== undefined && { incrementos_desc: adjustments.incrementos_desc }),
    ...(adjustments.reducoes !== undefined && { reducoes: Number(adjustments.reducoes || 0) }),
    ...(adjustments.reducoes_desc !== undefined && { reducoes_desc: adjustments.reducoes_desc }),
    ...(adjustments.iva_pct !== undefined && { iva_pct: Number(adjustments.iva_pct || 0) }),
    ...(adjustments.descricao_servico !== undefined && { descricao_servico: adjustments.descricao_servico }),
    ...(adjustments.disputed_hours !== undefined && { disputed_hours: normalizeDisputedHours(adjustments.disputed_hours) }),
    ...(adjustments.total_horas !== undefined && { total_horas: adjustments.total_horas }),
    ...(adjustments.total_valor_base !== undefined && { total_valor_base: adjustments.total_valor_base }),
    ...(adjustments.total_valor !== undefined && { total_valor: adjustments.total_valor })
  };

  const { error: updErr } = await supabase
    .schema('core_finance')
    .from('faturas')
    .update({ ajustes_json: updatedAdj })
    .eq('id', faturaId);

  if (updErr) throw mapSupabaseError(updErr);
}

export async function processarContestacaoFatura(
  faturaId: string,
  aceitar: boolean,
  proposedHours?: any,
  financialAdjustments?: {
    incrementos?: number;
    incrementos_desc?: string;
    reducoes?: number;
    reducoes_desc?: string;
    iva_pct?: number;
    descricao_servico?: string;
  }
): Promise<void> {
  const normHours = proposedHours ? normalizeDisputedHours(proposedHours) : undefined;
  await updateFaturaAjustes(faturaId, {
    ...(financialAdjustments || {}),
    ...(normHours && { disputed_hours: normHours })
  });

  if (aceitar && normHours) {
    // Fetch fatura info for client_id and empresa_id fallbacks
    const { data: fatData } = await supabase
      .schema('core_finance')
      .from('faturas')
      .select('client_id, empresa_id')
      .eq('id', faturaId)
      .single();

    // 1. Iterate over proposed hours and update or insert in horas_trabalhadas
    for (const workerId of Object.keys(normHours)) {
      const dates = normHours[workerId];
      for (const rawDateKey of Object.keys(dates)) {
        const cleanDate = rawDateKey.split('T')[0];
        const newHours = Number(dates[rawDateKey]);
        
        // Check if row already exists for this fatura_id, worker_id, data_trabalho
        const { data: existingRow } = await supabase
          .schema('core_finance')
          .from('horas_trabalhadas')
          .select('id, tarifa_faturada, client_id, empresa_id, funcao_id')
          .eq('fatura_id', faturaId)
          .eq('worker_id', workerId)
          .eq('data_trabalho', cleanDate)
          .maybeSingle();

        if (existingRow) {
          if (newHours === 0) {
            const { error: delErr } = await supabase
              .schema('core_finance')
              .from('horas_trabalhadas')
              .delete()
              .eq('id', existingRow.id);
            if (delErr) console.error(`Erro ao deletar hora do trabalhador ${workerId} no dia ${cleanDate}:`, delErr);
          } else {
            const { error: updErr } = await supabase
              .schema('core_finance')
              .from('horas_trabalhadas')
              .update({ horas_totais: newHours })
              .eq('id', existingRow.id);
            if (updErr) console.error(`Erro ao atualizar hora do trabalhador ${workerId} no dia ${cleanDate}:`, updErr);
          }
        } else if (newHours > 0) {
          // Find sample row for worker in this fatura to get tariff and job function
          const { data: sampleRow } = await supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('tarifa_faturada, client_id, funcao_id')
            .eq('fatura_id', faturaId)
            .eq('worker_id', workerId)
            .not('tarifa_faturada', 'is', null)
            .gt('tarifa_faturada', 0)
            .limit(1)
            .maybeSingle();

          const { error: insErr } = await supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .insert({
              fatura_id: faturaId,
              worker_id: workerId,
              data_trabalho: cleanDate,
              horas_totais: newHours,
              client_id: sampleRow?.client_id || fatData?.client_id,
              tarifa_faturada: sampleRow?.tarifa_faturada || 0,
              funcao_id: sampleRow?.funcao_id || null,
              status: 'invoiced'
            });

          if (insErr) console.error(`Erro ao inserir nova hora para o trabalhador ${workerId} no dia ${cleanDate}:`, insErr);
        }
      }
    }
  }

  // Reset status of fatura
  const { error } = await supabase
    .schema('core_finance')
    .from('faturas')
    .update({ 
      status: aceitar ? 'approved' : 'pending_client_approval',
      // Clear client observations
      observacoes_cliente: null
    })
    .eq('id', faturaId);
     
  if (error) throw mapSupabaseError(error);

  // Update status of hours
  const { error: horasError } = await supabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .update({ status: aceitar ? 'invoiced' : 'pending_review' })
    .eq('fatura_id', faturaId);

  if (horasError) throw mapSupabaseError(horasError);
}

export async function atualizarHorasDiarias(
  horaId: string, 
  novasHoras: number,
  workerId?: string,
  clientId?: string,
  dataTrabalho?: string,
  funcaoId?: string,
  tarifaFaturada?: number
): Promise<void> {
  if (horaId) {
    if (novasHoras === 0) {
      const { error } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .delete()
        .eq('id', horaId);
      if (error) throw mapSupabaseError(error);
    } else {
      const { error } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .update({ horas_totais: novasHoras })
        .eq('id', horaId);
      if (error) throw mapSupabaseError(error);
    }
  } else if (novasHoras > 0 && workerId && clientId && dataTrabalho) {
    const { error } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .insert({
        worker_id: workerId,
        client_id: clientId,
        data_trabalho: dataTrabalho,
        horas_totais: novasHoras,
        status: 'pending_review',
        funcao_id: funcaoId || null,
        tarifa_faturada: tarifaFaturada || 27.00
      });
    if (error) throw mapSupabaseError(error);
  }
}

export async function atualizarTarifaFaturada(
  workerId: string,
  clientId: string,
  periodYear: number,
  periodMonth: number,
  novaTarifa: number
): Promise<void> {
  const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
  const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

  const { error } = await supabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .update({ tarifa_faturada: novaTarifa })
    .eq('worker_id', workerId)
    .eq('client_id', clientId)
    .gte('data_trabalho', startDateStr)
    .lte('data_trabalho', endDateStr);

  if (error) throw mapSupabaseError(error);
}

export async function gerarCobroDaFatura(fatura: any, empresaNome: string, customDueDate?: string, valorTotalComIva?: number): Promise<void> {
  const termDays = fatura.client?.paymentTermDays || 30;
  const emissionDate = fatura.data_emissao ? new Date(fatura.data_emissao) : new Date();
  
  let dueDate: Date;
  if (customDueDate) {
    dueDate = new Date(customDueDate);
  } else {
    dueDate = new Date(emissionDate);
    dueDate.setDate(dueDate.getDate() + termDays);
  }

  // Use the calculated total value passed from frontend, otherwise fallback to subtotal * 1.21
  const valorTotal = valorTotalComIva !== undefined ? valorTotalComIva : Number(fatura.total_valor || 0) * 1.21;

  // Query max sp_id to generate next value sequentially and avoid null violation
  const { data: maxRows } = await supabase
    .from('contas_receber')
    .select('sp_id')
    .order('sp_id', { ascending: false })
    .limit(1);

  const nextSpId = (maxRows && maxRows.length > 0 && maxRows[0].sp_id)
    ? Number(maxRows[0].sp_id) + 1
    : 3000;

  // Format period_fat (Portuguese month and year)
  const monthsPt = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const periodoFat = `${monthsPt[emissionDate.getMonth()]} ${emissionDate.getFullYear()}`;

  // Extract bank name from fatura IBAN details
  let bankName = '';
  const ibanStr = fatura.ajustes_json?.iban || '';
  if (ibanStr) {
    const lines = ibanStr.split('\n').map((l: string) => l.trim());
    for (const line of lines) {
      if (line.toLowerCase().includes('banco') || line.toLowerCase().includes('bank')) {
        bankName = line.replace(/^(banco|bank):\s*/i, '');
        break;
      }
    }
    if (!bankName && lines.length > 1) {
      bankName = lines[1];
    }
  }

  // Get current logged-in user email
  const { data: { session } } = await supabase.auth.getSession();
  const userEmail = session?.user?.email || 'Sistema';

  const dbData = {
    sp_id: nextSpId,
    empresa: empresaNome,
    cod_cliente: fatura.client?.codigo || fatura.client_id.substring(0, 8),
    cliente: fatura.client?.nombre_comercial || 'Cliente',
    obra: fatura.ajustes_json?.obra || 'SIN OBRA',
    num_doc: `FAT-${fatura.id.substring(0, 8).toUpperCase()}`,
    data_emissao: emissionDate.toISOString(),
    dt_venc: dueDate.toISOString(),
    valot_total: valorTotal.toFixed(2),
    saldo_a_pagar: valorTotal.toFixed(2),
    status: 'A vencer',
    creado: new Date().toISOString(),
    fatura_id: fatura.id,
    periodo_fat: periodoFat,
    banco: bankName || null,
    creado_por: userEmail
  };

  // 1. Insert into public.contas_receber
  const { error: insertError } = await supabase
    .from('contas_receber')
    .insert([dbData]);

  if (insertError) throw mapSupabaseError(insertError);

  // 2. Update fatura's ajustes_json with cobro_gerado: true
  const currentAjustes = fatura.ajustes_json || {};
  const updatedAjustes = {
    ...currentAjustes,
    cobro_gerado: true,
    cobro_gerado_em: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .schema('core_finance')
    .from('faturas')
    .update({ ajustes_json: updatedAjustes })
    .eq('id', fatura.id);

  if (updateError) throw mapSupabaseError(updateError);
}

export async function sincronizarTarifasFaturamento(
  clientId: string,
  periodYear: number,
  periodMonth: number
): Promise<void> {
  const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
  const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

  // 1. Fetch exceptions
  const { data: exceptions, error: excError } = await supabase
    .schema('core_common')
    .from('client_worker_tariffs')
    .select('worker_id, client_site_id, valor_tarifa')
    .eq('client_id', clientId);

  if (excError) throw mapSupabaseError(excError);
  const workerExceptions = exceptions || [];

  // 2. Fetch standard tariffs
  const { data: tariffs, error: tarError } = await supabase
    .schema('core_common')
    .from('client_tariffs')
    .select('job_function_id, client_site_id, valor_tarifa')
    .eq('client_id', clientId);

  if (tarError) throw mapSupabaseError(tarError);
  const standardTariffs = tariffs || [];

  // 3. Fetch job functions names mapping
  const { data: jobFuncs, error: jfError } = await supabase
    .schema('core_comercial')
    .from('job_functions')
    .select('id, name');

  if (jfError) throw mapSupabaseError(jfError);
  const jobFunctionsMap = new Map((jobFuncs || []).map(jf => [jf.id, jf.name]));
  const jobFunctionsByName = new Map((jobFuncs || []).map(jf => [jf.name.toUpperCase().trim(), jf.id]));

  // 4. Fetch hours
  const { data: hours, error: hrError } = await supabase
    .schema('core_finance')
    .from('horas_trabalhadas')
    .select('id, worker_id, funcao_id, obra_id, tarifa_faturada')
    .eq('client_id', clientId)
    .gte('data_trabalho', startDateStr)
    .lte('data_trabalho', endDateStr);

  if (hrError) throw mapSupabaseError(hrError);
  if (!hours || hours.length === 0) return;

  // 5. Fetch workers mapping
  const workerIds = Array.from(new Set(hours.map(h => h.worker_id).filter(Boolean)));
  let workersList: any[] = [];
  if (workerIds.length > 0) {
    const { data: wData, error: wError } = await supabase
      .schema('core_personal')
      .from('workers')
      .select('id, funcion')
      .in('id', workerIds);
    if (wError) throw mapSupabaseError(wError);
    workersList = wData || [];
  }
  const workersMap = new Map(workersList.map(w => [w.id, w.funcion]));

  // 6. Process each row
  for (const h of hours) {
    let funcId = h.funcao_id;
    const siteId = h.obra_id;
    const workerId = h.worker_id;

    // Resolve funcId if null
    if (!funcId) {
      const workerFuncion = workersMap.get(workerId);
      if (workerFuncion) {
        const matchedId = jobFunctionsByName.get(workerFuncion.toUpperCase().trim());
        if (matchedId) {
          funcId = matchedId;
          // Save funcao_id directly in DB for future loads
          await supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .update({ funcao_id: funcId })
            .eq('id', h.id);
        }
      }
    }

    const targetFuncName = jobFunctionsMap.get(funcId || '') || '';

    // Resolve tariff
    let resolvedTariff = 27.00;

    const wExcSite = workerExceptions.find(e => e.worker_id === workerId && e.client_site_id === siteId);
    if (wExcSite) {
      resolvedTariff = Number(wExcSite.valor_tarifa);
    } else {
      const wExcGlobal = workerExceptions.find(e => e.worker_id === workerId && e.client_site_id === null);
      if (wExcGlobal) {
        resolvedTariff = Number(wExcGlobal.valor_tarifa);
      } else {
        let stdSite = standardTariffs.find(t => t.job_function_id === funcId && t.client_site_id === siteId);
        if (!stdSite && !siteId) {
          // Fallback: match standard tariff for this job function on any site if siteId is null
          stdSite = standardTariffs.find(t => t.job_function_id === funcId);
        }

        if (stdSite) {
          resolvedTariff = Number(stdSite.valor_tarifa);
        } else {
          const stdGlobal = standardTariffs.find(t => t.job_function_id === funcId && t.client_site_id === null);
          if (stdGlobal) {
            resolvedTariff = Number(stdGlobal.valor_tarifa);
          } else {
            resolvedTariff = targetFuncName.toLowerCase().includes('soldador') ? 25.50 : (targetFuncName.toLowerCase().includes('tubero') ? 28.00 : 27.00);
          }
        }
      }
    }

    if (Number(h.tarifa_faturada) !== resolvedTariff) {
      const { error: updError } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .update({ tarifa_faturada: resolvedTariff })
        .eq('id', h.id);

      if (updError) throw mapSupabaseError(updError);
    }
  }
}



