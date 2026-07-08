import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Custom helper function matching the updated faturamentoApi.ts logic
async function runSimulation() {
  const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
  const periodYear = 2026;
  const periodMonth = 6;

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

    if (rpcError) throw rpcError;
    console.log(`Active workers count: ${activeWorkers?.length}`);

    // 3. Fetch all clients globally (simulating RLS but for anon we expect 1, for auth we expect all)
    // Here we run as anon, so we will get the anon subset
    const { data: clientsData, error: clientsError } = await supabase
      .schema('core_common')
      .from('clients')
      .select('id, trade_name, empresa_id, codigo, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id');

    if (clientsError) throw clientsError;
    console.log(`Clients data count: ${clientsData?.length}`);

    // Fetch all payment terms metadata
    const { data: ptData } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .select('id, name, days');
    const ptMap = new Map((ptData || []).map(pt => [pt.id, pt]));

    // Ensure all unique clients of the active workers exist in core_common.clients
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
        const normC = normalizeName(c.trade_name);
        const normN = normalizeName(name);
        return normC === normN || (normC.length > 3 && normN.includes(normC)) || (normN.length > 3 && normC.includes(normN));
      });
      if (!exists) {
        console.log(`Missing client in clientsList (not found/created): ${name}`);
      }
    }

    // 4. Fetch validation status of sheet records (worker_hours)
    const { data: whData, error: whError } = await supabase
      .schema('core_personal')
      .from('worker_hours')
      .select('worker_id, status, observacoes')
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth);

    if (whError) throw whError;
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

    if (htError) throw htError;
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
    console.log(`Hours list count (filtered to company workers): ${hoursList.length}`);

    // 6. Filter clients to only keep relevant ones for active workers and actual hours
    const relevantClients = clientsList.filter(client => {
      const clientNameLower = client.trade_name?.trim().toLowerCase();
      const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
      const hasHours = hoursList.some(h => h.client_id === client.id);
      return hasWorkers || hasHours;
    });
    console.log(`Relevant clients count: ${relevantClients.length}`);

    console.log("SIMULATION SUCCESSFUL - NO RUNTIME ERRORS!");

  } catch (e) {
    console.error("SIMULATION CRASHED:", e);
  }
}

runSimulation();
