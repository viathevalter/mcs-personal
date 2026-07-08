import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

// We simulate the logic inside getHorasPendentesFaturamento
async function run() {
  const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
  const periodYear = 2026;
  const periodMonth = 6; // Junho

  try {
    console.log(`Running simulation for company=${empresaId}, year=${periodYear}, month=${periodMonth}`);
    
    // 1. Fetch active company name
    const { data: empresaData } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('nome')
      .eq('id', empresaId)
      .single();
    const empresaNome = empresaData?.nome || 'Não Informada';
    console.log(`- Company name: ${empresaNome}`);

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
    console.log(`- Active workers found: ${activeWorkers?.length}`);

    // 3. Fetch all clients globally
    const { data: clientsData, error: clientsError } = await supabase
      .schema('core_common')
      .from('clients')
      .select('id, trade_name, empresa_id, codigo, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id');

    if (clientsError) throw clientsError;
    console.log(`- Global clients: ${clientsData?.length}`);

    // Fetch all payment terms metadata
    const { data: ptData } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .select('id, name, days');
    const ptMap = new Map((ptData || []).map(pt => [pt.id, pt]));

    // Ensure all unique clients of the active workers exist in core_common.clients
    const clientsList = [...(clientsData || [])];
    const uniqueClientNames = Array.from(new Set((activeWorkers || []).map(w => w.cliente_nombre).filter(Boolean)));
    console.log(`- Unique client names of active workers:`, uniqueClientNames);

    if (clientsList.length === 0) {
      console.log("No clients in database.");
      return;
    }
    const clientIds = clientsList.map(c => c.id);

    // Fetch all client sites for mapping names
    let clientSites = [];
    if (clientIds.length > 0) {
      const { data: csData } = await supabase
        .schema('core_common')
        .from('client_sites')
        .select('id, name')
        .in('client_id', clientIds);
      clientSites = csData || [];
    }
    const clientSitesMap = new Map(clientSites.map(s => [s.id, s.name]));
    console.log(`- Client sites found: ${clientSites.length}`);

    // 4. Fetch validation status of sheet records (worker_hours)
    const { data: whData, error: whError } = await supabase
      .schema('core_personal')
      .from('worker_hours')
      .select('worker_id, status, observacoes')
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth);

    if (whError) throw whError;
    const workerHoursList = whData || [];
    console.log(`- Worker hours records found: ${workerHoursList.length}`);

    // 5. Fetch validated hours in core_finance.horas_trabalhadas for the period
    const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${new Date(periodYear, periodMonth, 0).getDate()}`;

    const { data: horasTrabalhadas, error: htError } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .select('*')
      .in('client_id', clientIds)
      .gte('data_trabalho', startDateStr)
      .lte('data_trabalho', endDateStr);

    if (htError) throw htError;
    const horasTrabalhadasList = horasTrabalhadas || [];
    console.log(`- horas_trabalhadas rows found: ${horasTrabalhadasList.length}`);

    // 6. Fetch existing faturas
    const faturaIds = Array.from(new Set(horasTrabalhadasList.map(h => h.fatura_id).filter(Boolean)));
    console.log(`- Referenced fatura IDs:`, faturaIds);

    let faturasList = [];
    if (faturaIds.length > 0) {
      const { data: fatData } = await supabase
        .schema('core_finance')
        .from('faturas')
        .select('id, status, magic_link_token, data_emissao, ajustes_json')
        .in('id', faturaIds);
      faturasList = fatData || [];
    }
    console.log(`- Faturas found: ${faturasList.length}`);

    console.log("SUCCESS: Simulation finished without throwing errors!");
  } catch (e) {
    console.error("SIMULATION FAILED WITH ERROR:", e);
  }
}

run();
