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
        nome, address_line, postal_code, city, province, tax_id, email, phone, iban,
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
        id, trade_name, codigo, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id,
        address_line, postal_code, city, province,
        countries (
          name
        ),
        client_company_settings (
          empresa_id,
          payment_term_id,
          status
        )
      `);

    if (clientsError) throw mapSupabaseError(clientsError);

    const mappedClientsData = (clientsData || []).map((c: any) => {
      const settings = c.client_company_settings?.find((s: any) => s.empresa_id === empresaId);
      return {
        ...c,
        empresa_id: settings?.empresa_id || null,
        payment_term_id: settings?.payment_term_id || null,
        status: settings?.status || 'active'
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
          .select('id, trade_name, codigo, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id')
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
            payment_term_id: null
          });
        }
      }
    }

    if (clientsList.length === 0) return [];
    const clientIds = clientsList.map(c => c.id);

    // 4. Fetch validation status of sheet records (worker_hours)
    // We filter only by period to avoid HTTP Header Overflow errors with large arrays of worker IDs (e.g., 600+)
    const { data: whData, error: whError } = await supabase
      .schema('core_personal')
      .from('worker_hours')
      .select('worker_id, status, observacoes')
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth);

    if (whError) throw mapSupabaseError(whError);
    const workerHoursList = whData || [];
    const workerHoursMap = new Map(workerHoursList.map(wh => [wh.worker_id, { status: wh.status, observacoes: wh.observacoes }]));

    // 5. Fetch validated hours in core_finance.horas_trabalhadas for the period
    const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

    // Note: We do not filter by clientIds here because that list has 2000+ IDs and would exceed URL size limits
    const { data: horasTrabalhadas, error: htError } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .select('*')
      .gte('data_trabalho', startDateStr)
      .lte('data_trabalho', endDateStr);

    if (htError) throw mapSupabaseError(htError);
    const horasTrabalhadasList = horasTrabalhadas || [];

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

    // Filter hours to only keep those belonging to the company's workers
    const hoursList = horasTrabalhadasList.filter(h => belongsToCompany(h.worker_id));

    // 6. Filter clients to only keep relevant ones for active workers and actual hours (only for the current company)
    const relevantClients = clientsList.filter(client => {
      if (client.empresa_id !== empresaId) return false;
      const clientNameLower = client.trade_name?.trim().toLowerCase();
      const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
      const hasHours = hoursList.some(h => h.client_id === client.id);
      return hasWorkers || hasHours;
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
        .select('id, status, magic_link_token, data_emissao, ajustes_json, fatura_numero, atcud')
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

      // Calculate Obras totals for the client
      const obrasMap = new Map<string | null, { id: string | null; name: string; totalHoras: number; totalValor: number; horasIds: string[] }>();
      
      clientHours.forEach(h => {
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
        const wTotalHoras = wHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValor = wHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

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

        // Check if there is an active custom exception configuration for this worker (either specific to the site or global)
        const hourlyObraId = wHours[0]?.obra_id || null;
        const hasException = workerExceptions.some(e => 
          e.client_id === client.id && 
          e.worker_id === w.id && 
          (e.client_site_id === hourlyObraId || e.client_site_id === null)
        );

        workersSummary.push({
          workerId: w.id,
          workerName: w.nome || 'Trabalhador Desconhecido',
          codColab: w.cod_colab || 'N/A',
          perfil: perfilName,
          tarifa,
          totalHoras: wTotalHoras,
          totalValor: wTotalValor,
          isValidated,
          isBilled: wHours.length > 0 && wHours.every(h => h.fatura_id !== null),
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
        
        // Resolve worker from unknownWorkersMap
        const uw = unknownWorkersMap.get(wId);
        const wName = uw?.nome || 'Trabalhador Desconhecido';
        const wCodColab = uw?.cod_colab || 'N/A';
        const wStatus = uw?.status_trabajador || 'Ativo';
        const wDataBaixa = uw?.data_baixa || null;
        const wFuncaoId = sampleHour.funcao_id || null;

        const wTotalHoras = wHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
        const wTotalValor = wHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

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

        workersSummary.push({
          workerId: wId,
          workerName: wName,
          codColab: wCodColab,
          perfil: jobFunctionsMap.get(wFuncaoId || '') || uw?.funcion || 'Não Definido',
          tarifa: tariff,
          totalHoras: wTotalHoras,
          totalValor: wTotalValor,
          isValidated: true,
          isBilled: wHours.length > 0 && wHours.every(h => h.fatura_id !== null),
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

      const latestFaturaId = clientHours.find(h => h.fatura_id)?.fatura_id;
      if (latestFaturaId) {
        const fatura = faturasMap.get(latestFaturaId);
        if (fatura) {
          magicLinkToken = fatura.magic_link_token;
          dataEmissaoFatura = fatura.data_emissao || null;
          ajustesJson = fatura.ajustes_json || null;
          faturaNumero = fatura.fatura_numero || null;
          faturaAtcud = fatura.atcud || null;
          if (fatura.status === 'pending_client_approval') {
            statusBilling = 'invoiced_pending';
          } else if (fatura.status === 'approved') {
            statusBilling = 'invoiced_approved';
          } else if (fatura.status === 'disputed') {
            statusBilling = 'invoiced_disputed';
          }
        }
      }

      if (!magicLinkToken) {
        const existingFaturaForClient = Array.from(faturasMap.values()).find(f => f.client_id === client.id);
        if (existingFaturaForClient) {
          magicLinkToken = existingFaturaForClient.magic_link_token;
          dataEmissaoFatura = existingFaturaForClient.data_emissao || null;
          ajustesJson = existingFaturaForClient.ajustes_json || null;
          faturaNumero = existingFaturaForClient.fatura_numero || null;
          faturaAtcud = existingFaturaForClient.atcud || null;
        }
      }

      if (hasUnbilled) {
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
        clientName: client.trade_name || 'Cliente Desconhecido',
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
        obras: obrasSummary,
        workers: workersSummary
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
    const { error: updateError } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .update({ 
        status: 'pending_client_approval',
        fatura_id: fatura.id 
      })
      .in('id', horasIds);

    if (updateError) throw mapSupabaseError(updateError);
  }

  return token;
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

export async function getFaturasTracking(empresaId?: string | null): Promise<any[]> {
  try {
    // 1. Resolve fatura IDs belonging to the company if empresaId is provided
    let faturaIdsFiltered: string[] = [];
    if (empresaId) {
      // Get workers from contracts
      const { data: contractsData } = await supabase
        .schema('core_personal')
        .from('contracts')
        .select('worker_id')
        .eq('empresa_id', empresaId);

      // Get workers from assignments
      const { data: assignmentsData } = await supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select('worker_id')
        .eq('empresa_id', empresaId);

      const workerIds = Array.from(new Set([
        ...(contractsData || []).map(c => c.worker_id),
        ...(assignmentsData || []).map(a => a.worker_id)
      ])).filter(Boolean) as string[];
      if (workerIds.length === 0) return [];

      // Get all unique fatura_ids referenced in horas_trabalhadas for these workers
      const { data: htData } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('fatura_id')
        .in('worker_id', workerIds)
        .not('fatura_id', 'is', null);

      faturaIdsFiltered = Array.from(new Set((htData || []).map(h => h.fatura_id).filter(Boolean))) as string[];
      if (faturaIdsFiltered.length === 0) return [];
    }

    // 2. Fetch faturas
    let query = supabase
      .schema('core_finance')
      .from('faturas')
      .select('*')
      .order('created_at', { ascending: false });

    if (empresaId && faturaIdsFiltered.length > 0) {
      query = query.in('id', faturaIdsFiltered);
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
        .select('id, codigo, trade_name, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id')
        .in('id', clientIds);
      if (clientsError) console.error('Erro ao buscar clientes para tracking:', clientsError);
      else clients = clientsData || [];
    }
    const clientsMap = new Map(clients.map(c => [c.id, c]));

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
      const { data: horas, error: horasError } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('fatura_id, horas_totais, tarifa_faturada')
        .in('fatura_id', faturaIds);
      
      if (horasError) console.error('Erro ao buscar horas para tracking:', horasError);
      else hoursSums = horas || [];
    }

    const hoursMap = new Map<string, number>();
    const valueMap = new Map<string, number>();
    hoursSums.forEach(h => {
      if (h.fatura_id) {
        const currentHours = hoursMap.get(h.fatura_id) || 0;
        hoursMap.set(h.fatura_id, currentHours + Number(h.horas_totais || 0));

        const currentValue = valueMap.get(h.fatura_id) || 0;
        const itemValue = Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0);
        valueMap.set(h.fatura_id, currentValue + itemValue);
      }
    });

    return faturas.map(f => {
      const client = clientsMap.get(f.client_id);
      const termName = client ? (client.payment_terms || (client.payment_term_id ? ptMap.get(client.payment_term_id)?.name : null) || 'N/A') : 'N/A';
      const termDays = client ? ((client.payment_term_id ? ptMap.get(client.payment_term_id)?.days : null) ?? null) : null;

      return {
        ...f,
        client: client ? { 
          nombre_comercial: client.trade_name,
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
          countryId: client.country_id || null
        } : undefined,
        total_horas: hoursMap.get(f.id) || 0,
        total_valor: valueMap.get(f.id) || 0
      };
    });
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
    disputed_hours: proposedHours || null,
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

export async function processarContestacaoFatura(
  faturaId: string,
  aceitar: boolean,
  proposedHours?: any
): Promise<void> {
  if (aceitar && proposedHours) {
    // 1. Iterate over proposed hours and update horas_trabalhadas
    for (const workerId of Object.keys(proposedHours)) {
      const dates = proposedHours[workerId];
      for (const dateKey of Object.keys(dates)) {
        const newHours = Number(dates[dateKey]);
        
        // Update the row for this fatura_id, worker_id, data_trabalho
        const { error } = await supabase
          .schema('core_finance')
          .from('horas_trabalhadas')
          .update({ horas_totais: newHours })
          .eq('fatura_id', faturaId)
          .eq('worker_id', workerId)
          .eq('data_trabalho', dateKey);
        
        if (error) console.error(`Erro ao atualizar hora do trabalhador ${workerId} no dia ${dateKey}:`, error);
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


