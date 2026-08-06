const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc";
const supabaseUrl = "https://pyahcgorkvwfwmlzspnv.supabase.co";

async function run() {
  const activeEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco UUID
  const activeEmpresaName = 'Stocco';

  console.log('1. Querying contracts...');
  const res1 = await fetch(`${supabaseUrl}/rest/v1/contracts?select=worker_id&empresa_id=eq.${activeEmpresaId}`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Accept-Profile': 'core_personal' }
  });
  const contracts = await res1.json();
  console.log(`Contracts count: ${contracts.length}`);

  console.log('2. Querying worker_assignments...');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/worker_assignments?select=worker_id&empresa_id=eq.${activeEmpresaId}`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Accept-Profile': 'core_personal' }
  });
  const assignments = await res2.json();
  console.log(`Assignments count: ${assignments.length}`);

  console.log('3. Querying vw_worker_allocations...');
  const res3 = await fetch(`${supabaseUrl}/rest/v1/vw_worker_allocations?select=cod_colab&contratante=ilike.${activeEmpresaName}`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Accept-Profile': 'core_personal' }
  });
  const allocations = await res3.json();
  console.log(`Allocations count: ${allocations.length}`);

  const contractWorkerIds = contracts?.map(c => c.worker_id) || [];
  const assignmentWorkerIds = assignments?.map(a => a.worker_id) || [];
  const workerIds = Array.from(new Set([...contractWorkerIds, ...assignmentWorkerIds].filter(Boolean)));
  const allocatedCodes = Array.from(new Set(allocations?.map(a => a.cod_colab).filter(Boolean)));

  console.log(`Unique workerIds: ${workerIds.length}`);
  console.log(`Unique allocatedCodes: ${allocatedCodes.length}`);
  console.log(`Does allocatedCodes contain 'E1816'?: ${allocatedCodes.includes('E1816')}`);

  console.log('4. Querying workers matching IDs or Codes...');
  
  const idInClause = `id.in.(${workerIds.join(',')})`;
  const codeInClause = `cod_colab.in.(${allocatedCodes.join(',')})`;
  const orFilter = `${idInClause},${codeInClause}`;
  
  const url = `${supabaseUrl}/rest/v1/workers?select=id,nome,cod_colab,status_trabajador&or=(${encodeURIComponent(orFilter)})&order=nome.asc`;
  
  const res4 = await fetch(url, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Accept-Profile': 'core_personal' }
  });
  const workers = await res4.json();
  console.log(`Total workers returned: ${workers.length}`);
  
  const rafael = workers.find(w => w.nome.includes('RAFAEL ALEJANDRO'));
  console.log('Rafael found in final list?:', rafael);

  // Let's check all Rafaels
  const allRafaels = workers.filter(w => w.nome.toUpperCase().includes('RAFAEL'));
  console.log('All Rafaels returned:', allRafaels);
}

run();
