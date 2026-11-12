import { checkWorkerInativoRH, type Alocacao } from '@/features/logistica/services/logisticsService';
import type { PedidoSummaryMetrics, PedidoWorkerEntry, PedidoWorkerHousing } from '../types';

function normalizeName(s?: string | null): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildHousingLookupMaps(alocacoes: Alocacao[]) {
  const byWorkerId = new Map<string, Alocacao>();
  const byCode = new Map<string, Alocacao>();
  const byName = new Map<string, Alocacao>();

  (alocacoes || [])
    .filter(a => a.status !== 'Checkout')
    .forEach(a => {
      if (a.worker_id && !byWorkerId.has(a.worker_id)) {
        byWorkerId.set(a.worker_id, a);
      }
      if (a.codigo_colab && a.codigo_colab !== 'E-XXXX' && a.codigo_colab.toUpperCase() !== 'NO') {
        const key = a.codigo_colab.toUpperCase().trim();
        if (!byCode.has(key)) byCode.set(key, a);
      }
      if (a.worker_nome) {
        const norm = normalizeName(a.worker_nome);
        if (norm && !byName.has(norm)) byName.set(norm, a);
      }
    });

  const findHousing = (workerId?: string, codColab?: string, nome?: string): PedidoWorkerHousing | null => {
    const codeKey = codColab ? String(codColab).toUpperCase().trim() : '';
    const nameKey = normalizeName(nome);
    const aloc =
      (workerId ? byWorkerId.get(workerId) : undefined) ||
      (codeKey && codeKey !== 'E-XXXX' ? byCode.get(codeKey) : undefined) ||
      (nameKey ? byName.get(nameKey) : undefined);

    if (!aloc) return null;

    return {
      alocacao_id: aloc.id,
      alojamento_id: aloc.alojamento_id || aloc.alojamento?.id,
      alojamento_codigo: aloc.alojamento_codigo || aloc.alojamento?.codigo,
      alojamento_nome: aloc.alojamento_nome || aloc.alojamento?.nome || 'Alojamento',
      cama_identificador: aloc.cama_identificador,
      municipio: aloc.municipio || aloc.alojamento?.municipio,
      endereco: aloc.endereco || aloc.alojamento?.endereco,
      data_checkin: aloc.data_checkin || aloc.data_inicio,
      data_checkout_prevista: aloc.data_checkout_prevista || aloc.data_fim,
      status: aloc.status,
      tipo_alojamento: aloc.tipo_alojamento,
      custo_alojamento: aloc.custo_alojamento,
    };
  };

  return { findHousing };
}

export function resolvePedidoSummaryMap(params: {
  pedidoIds: string[];
  items: any[];
  jobsMap: Map<string, string>;
  assignments: any[];
  targets?: any[];
  extraWorkersMap?: Map<string, any>;
  alocacoesLogistica: Alocacao[];
}): Record<string, PedidoSummaryMetrics> {
  const {
    pedidoIds,
    items,
    jobsMap,
    assignments,
    targets = [],
    extraWorkersMap = new Map(),
    alocacoesLogistica,
  } = params;

  const { findHousing } = buildHousingLookupMaps(alocacoesLogistica);
  const todayIso = new Date().toISOString().split('T')[0];

  // Map assignments by ID for replacement lookup
  const assignmentById = new Map<string, any>();
  const replacementBySourceAssignmentId = new Map<string, any>();
  (assignments || []).forEach(a => {
    if (a.id) assignmentById.set(a.id, a);
    if (a.replacement_of_assignment_id && a.status !== 'cancelled') {
      replacementBySourceAssignmentId.set(a.replacement_of_assignment_id, a);
    }
  });

  // Map targets by source_assignment_id and source_pedido_id
  const targetBySourceAssId = new Map<string, any>();
  const targetsByPedidoId = new Map<string, any[]>();
  (targets || []).forEach(t => {
    const sol = Array.isArray(t.solicitud) ? t.solicitud[0] : t.solicitud;
    if (sol?.status === 'cancelled' || t.status === 'cancelled') return;

    if (t.source_assignment_id) {
      targetBySourceAssId.set(t.source_assignment_id, { ...t, solicitud: sol });
    }
    const pId = t.source_pedido_id || sol?.pedido_id;
    if (pId) {
      if (!targetsByPedidoId.has(pId)) targetsByPedidoId.set(pId, []);
      targetsByPedidoId.get(pId)!.push({ ...t, solicitud: sol });
    }
  });

  // Group items by pedido_id
  const itemsByPedido = new Map<string, any[]>();
  (items || []).forEach(item => {
    if (item.status === 'cancelled') return;
    if (!itemsByPedido.has(item.pedido_id)) itemsByPedido.set(item.pedido_id, []);
    itemsByPedido.get(item.pedido_id)!.push(item);
  });

  // Group assignments by pedido_id
  const assignmentsByPedido = new Map<string, any[]>();
  (assignments || []).forEach(ass => {
    if (!ass.pedido_id) return;
    if (!assignmentsByPedido.has(ass.pedido_id)) assignmentsByPedido.set(ass.pedido_id, []);
    assignmentsByPedido.get(ass.pedido_id)!.push(ass);
  });

  const result: Record<string, PedidoSummaryMetrics> = {};

  for (const pedidoId of pedidoIds) {
    const pedItems = itemsByPedido.get(pedidoId) || [];
    const pedAssignments = assignmentsByPedido.get(pedidoId) || [];
    const pedTargets = targetsByPedidoId.get(pedidoId) || [];

    let requested = 0;
    let fulfilled = 0;
    let includesHousing = false;
    const profiles: string[] = [];
    const itemHousingMap = new Map<string, boolean>();

    pedItems.forEach(it => {
      const req = Number(it.quantity_requested) || 0;
      const ful = Number(it.quantity_fulfilled) || 0;
      requested += req;
      fulfilled += ful;
      const hasHous = Boolean(it.includes_housing ?? it.includes_accommodation_snapshot);
      if (hasHous) includesHousing = true;
      itemHousingMap.set(it.id, hasHous);

      const fnName = it.job_function?.name || jobsMap.get(it.job_function_id) || it.job_function_name_snapshot || 'Perfil';
      profiles.push(`${req}x ${fnName}`);
    });

    const workersList: PedidoWorkerEntry[] = [];
    const seenWorkerAssignmentKeys = new Set<string>();

    for (const ass of pedAssignments) {
      const rawW = Array.isArray(ass.worker) ? ass.worker[0] : (ass.worker || extraWorkersMap.get(ass.worker_id) || {});
      const workerId = rawW.id || ass.worker_id || ass.id;
      const codColab = rawW.cod_colab || 'S/C';
      const nome = rawW.nome || 'Trabalhador';
      const funcao =
        ass.job_function_name_snapshot ||
        jobsMap.get(ass.job_function_id) ||
        rawW.funcion ||
        'Operador';

      const st = String(ass.status || 'active').toLowerCase();
      const rhCheck = checkWorkerInativoRH(rawW.status_trabajador, rawW.status_seguridad);
      const linkedTarget = targetBySourceAssId.get(ass.id) || pedTargets.find(t => t.source_worker_id === workerId);
      const replacedAss = ass.replacement_of_assignment_id ? assignmentById.get(ass.replacement_of_assignment_id) : null;
      const replacedWorkerObj = replacedAss ? (Array.isArray(replacedAss.worker) ? replacedAss.worker[0] : replacedAss.worker) : null;
      const replacedByAss = replacementBySourceAssignmentId.get(ass.id);
      const replacedByWorkerObj = replacedByAss ? (Array.isArray(replacedByAss.worker) ? replacedByAss.worker[0] : replacedByAss.worker) : null;

      let movement_type: 'active' | 'entering' | 'exiting' | 'exited' = 'active';
      let movement_label = 'Em Obra / Ativo';

      const startStr = String(ass.planned_start_date || ass.start_date || '').split('T')[0];

      if (['replaced', 'relocated', 'terminated', 'completed', 'cancelled'].includes(st)) {
        movement_type = 'exited';
        if (st === 'replaced') movement_label = 'Substituído (Reemplazo)';
        else if (st === 'relocated') movement_label = 'Realocado (Reubicación)';
        else if (st === 'cancelled') movement_label = 'Desistência / Cancelado';
        else if (st === 'terminated') movement_label = 'Baixa / Desligado';
        else movement_label = 'Finalizado';
      } else if (rhCheck.isInativo) {
        movement_type = 'exited';
        movement_label = 'Baixa RH / Inativo';
      } else if (linkedTarget && ['replace', 'offboard', 'relocate', 'withdrawal'].includes(linkedTarget.action_type)) {
        if (linkedTarget.status === 'completed' || replacedByAss) {
          movement_type = 'exited';
          movement_label = linkedTarget.action_type === 'replace' ? 'Substituído' : 'Saída Concluída';
        } else {
          movement_type = 'exiting';
          movement_label = linkedTarget.action_type === 'replace' ? 'Saindo (Em Reemplazo)' : 'Saindo (Aviso Baixa)';
        }
      } else if (st === 'planned' || (startStr && startStr > todayIso) || String(rawW.status_trabajador || '').toUpperCase().includes('PEND')) {
        movement_type = 'entering';
        movement_label = replacedWorkerObj ? 'Entrando (Substituto)' : 'Entrando / Mobilização';
      } else if (replacedWorkerObj) {
        movement_type = 'active';
        movement_label = 'Ativo (Entrou em Reemplazo)';
      }

      const housing = findHousing(workerId, codColab, nome);
      const itemRequiresHousing = ass.pedido_item_id ? (itemHousingMap.get(ass.pedido_item_id) ?? includesHousing) : includesHousing;

      seenWorkerAssignmentKeys.add(`${workerId}:${ass.id}`);
      seenWorkerAssignmentKeys.add(`worker:${workerId}`);

      workersList.push({
        assignment_id: ass.id,
        worker_id: workerId,
        cod_colab: codColab,
        nome,
        nif: rawW.nif,
        dni: rawW.dni,
        pasaporte: rawW.pasaporte,
        movil: rawW.movil,
        email: rawW.email,
        funcao,
        pedido_item_id: ass.pedido_item_id,
        status: st,
        movement_type,
        movement_label,
        planned_start_date: ass.planned_start_date,
        start_date: ass.start_date,
        end_date: ass.end_date || rawW.data_baixa,
        tarifa_acordada: ass.tarifa_acordada ? Number(ass.tarifa_acordada) : null,
        camiseta: rawW.camiseta,
        pantalones: rawW.pantalones,
        licencia_conducir: rawW.licencia_conducir,
        status_trabajador: rawW.status_trabajador,
        status_seguridad: rawW.status_seguridad,
        data_baixa: rawW.data_baixa || ass.end_date,
        notes: ass.notes,
        replacement_of_assignment_id: ass.replacement_of_assignment_id,
        replaced_worker_name: replacedWorkerObj?.nome || null,
        replaced_by_worker_name: replacedByWorkerObj?.nome || null,
        solicitud_codigo: linkedTarget?.solicitud?.codigo || null,
        solicitud_tipo: linkedTarget?.solicitud?.tipo || linkedTarget?.action_type || null,
        exit_reason: linkedTarget?.reason || ass.notes || null,
        housing,
        requires_housing: itemRequiresHousing,
      });
    }

    // Also include workers from solicitud_targets for this pedido who weren't already in pedAssignments
    for (const t of pedTargets) {
      if (t.source_worker_id && !seenWorkerAssignmentKeys.has(`worker:${t.source_worker_id}`)) {
        const w = extraWorkersMap.get(t.source_worker_id) || {};
        if (!w.nome && !t.source_worker_id) continue;
        seenWorkerAssignmentKeys.add(`worker:${t.source_worker_id}`);

        const codColab = w.cod_colab || 'S/C';
        const nome = w.nome || 'Trabalhador';
        const isCompleted = t.status === 'completed';
        const movement_type: 'exiting' | 'exited' = isCompleted ? 'exited' : 'exiting';
        const movement_label =
          t.action_type === 'replace'
            ? isCompleted
              ? 'Substituído (Reemplazo)'
              : 'Saindo (Reemplazo Pendente)'
            : t.action_type === 'relocate'
            ? 'Realocado (Reubicación)'
            : t.action_type === 'withdrawal'
            ? 'Desistência'
            : isCompleted
            ? 'Baixa / Desligado'
            : 'Saindo (Baixa em Curso)';

        const targetWorkerObj = t.target_worker_id ? extraWorkersMap.get(t.target_worker_id) : null;

        workersList.push({
          assignment_id: t.source_assignment_id || `target-${t.id}`,
          worker_id: t.source_worker_id,
          cod_colab: codColab,
          nome,
          nif: w.nif,
          movil: w.movil,
          funcao: t.target_job_function_name || w.funcion || 'Operador',
          pedido_item_id: t.source_pedido_item_id,
          status: isCompleted ? 'terminated' : 'active',
          movement_type,
          movement_label,
          start_date: null,
          end_date: w.data_baixa || t.solicitud?.due_date || null,
          status_trabajador: w.status_trabajador,
          status_seguridad: w.status_seguridad,
          data_baixa: w.data_baixa,
          replaced_by_worker_name: targetWorkerObj?.nome || null,
          solicitud_codigo: t.solicitud?.codigo || null,
          solicitud_tipo: t.solicitud?.tipo || t.action_type || null,
          exit_reason: t.reason || t.notes || null,
          housing: findHousing(t.source_worker_id, codColab, nome),
          requires_housing: includesHousing,
        });
      }
    }

    // Sort workers: active & entering first, then exiting, then exited
    const orderRank: Record<string, number> = {
      entering: 1,
      active: 2,
      exiting: 3,
      exited: 4,
    };
    workersList.sort((a, b) => {
      const rA = orderRank[a.movement_type] || 9;
      const rB = orderRank[b.movement_type] || 9;
      if (rA !== rB) return rA - rB;
      return a.nome.localeCompare(b.nome);
    });

    const activeWorkers = workersList.filter(w => w.movement_type === 'active');
    const enteringWorkers = workersList.filter(w => w.movement_type === 'entering');
    const exitingWorkers = workersList.filter(w => w.movement_type === 'exiting');
    const exitedWorkers = workersList.filter(w => w.movement_type === 'exited');

    const currentTeam = workersList.filter(w => w.movement_type !== 'exited');
    const housedWorkers = currentTeam.filter(w => Boolean(w.housing));
    const pendingHousing = currentTeam.filter(w => !w.housing && w.requires_housing !== false);

    // Aggregate unique alojamentos used by this pedido's workers
    const alojMap = new Map<string, { id: string; codigo?: string; nome: string; municipio?: string; endereco?: string; workersCount: number }>();
    currentTeam.forEach(w => {
      if (w.housing) {
        const key = w.housing.alojamento_id || w.housing.alojamento_codigo || w.housing.alojamento_nome;
        const existing = alojMap.get(key);
        if (existing) {
          existing.workersCount += 1;
        } else {
          alojMap.set(key, {
            id: key,
            codigo: w.housing.alojamento_codigo,
            nome: w.housing.alojamento_nome,
            municipio: w.housing.municipio,
            endereco: w.housing.endereco,
            workersCount: 1,
          });
        }
      }
    });

    result[pedidoId] = {
      requested,
      fulfilled,
      profiles,
      includesHousing,
      activeWorkersCount: activeWorkers.length,
      enteringWorkersCount: enteringWorkers.length,
      exitingWorkersCount: exitingWorkers.length,
      exitedWorkersCount: exitedWorkers.length,
      housedWorkersCount: housedWorkers.length,
      pendingHousingCount: includesHousing ? pendingHousing.length : 0,
      alojamentos: Array.from(alojMap.values()),
      workers: workersList,
    };
  }

  return result;
}
