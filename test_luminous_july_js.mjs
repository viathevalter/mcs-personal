import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJuly() {
  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // Luminous
  const periodYear = 2026;
  const periodMonth = 7; // Julho

  try {
    // 1. Fetch active company name
    const { data: empresaData } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('nome')
      .eq('id', empresaId)
      .single();
    const empresaNome = empresaData?.nome || 'Não Informada';

    // 2. Fetch active workers for the period
    const { data: activeWorkers, error: rpcError } = await supabase
      .schema('core_personal')
      .rpc('get_hours_control_workers', {
        p_empresa_id: empresaId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_contratante: null,
        p_cliente_nombre: null
      });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw rpcError;
    }
    console.log(`Active workers: ${activeWorkers?.length}`);

    // 3. Fetch all clients globally
    const { data: clientsData, error: clientsError } = await supabase
      .schema('core_common')
      .from('clients')
      .select('id, trade_name, empresa_id, codigo, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id');

    if (clientsError) {
      console.error("Clients query error:", clientsError);
      throw clientsError;
    }
    console.log(`Total clients fetched: ${clientsData?.length}`);

    // Fetch all payment terms metadata
    const { data: ptData } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .select('id, name, days');
    const ptMap = new Map((ptData || []).map(pt => [pt.id, pt]));

    // 4. Ensure all unique clients of the active workers exist in core_common.clients
    const clientsList = [...(clientsData || [])];
    const uniqueClientNames = Array.from(new Set(activeWorkers.map(w => w.cliente_nombre).filter(Boolean)));

    const normalizeName = (n) => {
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
        console.log(`Auto-creating client: ${name}`);
      }
    }

    // 4. Fetch validation status of sheet records (worker_hours)
    const { data: whData, error: whError } = await supabase
      .schema('core_personal')
      .from('worker_hours')
      .select('worker_id, status, observacoes')
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth);

    if (whError) {
      console.error("worker_hours error:", whError);
      throw whError;
    }
    const workerHoursList = whData || [];
    const workerHoursMap = new Map(workerHoursList.map(wh => [wh.worker_id, { status: wh.status, observacoes: wh.observacoes }]));

    // 5. Fetch validated hours in core_finance.horas_trabalhadas for the period
    const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

    const { data: horasTrabalhadas, error: htError } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .select('*')
      .gte('data_trabalho', startDateStr)
      .lte('data_trabalho', endDateStr);

    if (htError) {
      console.error("horas_trabalhadas error:", htError);
      throw htError;
    }
    const horasTrabalhadasList = horasTrabalhadas || [];
    console.log(`horasTrabalhadasList count: ${horasTrabalhadasList.length}`);

    // Fetch unknown workers (workers with hours but not in activeWorkers)
    const unknownWorkerIds = Array.from(new Set(
      horasTrabalhadasList
        .map(h => h.worker_id)
        .filter(id => id && !activeWorkers.some(w => w.id === id))
    ));

    let unknownWorkers = [];
    if (unknownWorkerIds.length > 0) {
      const { data: uwData } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, empresa_id, status_trabajador, data_baixa, funcion, cod_colab')
        .in('id', unknownWorkerIds);
      unknownWorkers = uwData || [];
    }
    const unknownWorkersMap = new Map(unknownWorkers.map(w => [w.id, w]));

    const belongsToCompany = (wId) => {
      if (activeWorkers.some(w => w.id === wId)) return true;
      const uw = unknownWorkersMap.get(wId);
      return uw ? uw.empresa_id === empresaId : false;
    };

    // Filter hours to only keep those belonging to the company's workers
    const hoursList = horasTrabalhadasList.filter(h => belongsToCompany(h.worker_id));
    console.log(`hoursList count: ${hoursList.length}`);

    // 6. Filter clients to only keep relevant ones for active workers and actual hours (only for the current company)
    const relevantClients = clientsList.filter(client => {
      if (client.empresa_id !== empresaId) return false;
      const clientNameLower = client.trade_name?.trim().toLowerCase();
      const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
      const hasHours = hoursList.some(h => h.client_id === client.id);
      return hasWorkers || hasHours;
    });
    console.log(`relevantClients count: ${relevantClients.length}`);

    const relevantClientIds = relevantClients.map(c => c.id);

    // 7. Fetch client sites only for relevant clients to avoid header overflow
    let clientSites = [];
    if (relevantClientIds.length > 0) {
      const { data: csData, error: csError } = await supabase
        .schema('core_common')
        .from('client_sites')
        .select('id, name')
        .in('client_id', relevantClientIds);
      if (csError) {
        console.error("client_sites error:", csError);
        throw csError;
      }
      clientSites = csData || [];
    }
    const clientSitesMap = new Map(clientSites.map(s => [s.id, s.name]));

    // 8. Fetch existing faturas
    const faturaIds = Array.from(new Set(hoursList.map(h => h.fatura_id).filter(Boolean)));
    let faturasList = [];
    if (faturaIds.length > 0) {
      const { data: fatData, error: fatError } = await supabase
        .schema('core_finance')
        .from('faturas')
        .select('id, status, magic_link_token, data_emissao, ajustes_json')
        .in('id', faturaIds);
      if (fatError) {
        console.error("faturas error:", fatError);
        throw fatError;
      }
      faturasList = fatData || [];
    }
    const faturasMap = new Map(faturasList.map(f => [f.id, f]));

    // 9. Fetch job functions for profile names
    const funcaoIds = Array.from(new Set(hoursList.map(h => h.funcao_id).filter(Boolean)));
    const workerFuncaoIds = activeWorkers.map(w => w.funcao_id).filter(Boolean);
    const allFuncaoIds = Array.from(new Set([...funcaoIds, ...workerFuncaoIds]));

    let jobFunctions = [];
    if (allFuncaoIds.length > 0) {
      const { data: jfData, error: jfError } = await supabase
        .schema('core_comercial')
        .from('job_functions')
        .select('id, name')
        .in('id', allFuncaoIds);
      if (jfError) {
        console.error("job_functions error:", jfError);
        throw jfError;
      }
      jobFunctions = jfData || [];
    }
    const jobFunctionsMap = new Map(jobFunctions.map(j => [j.id, j.name]));

    console.log("Successfully completed JS simulation for Luminous July!");

  } catch (e) {
    console.error("Crash during Luminous July simulation:", e);
  }
}

testJuly();
