import type {  IncidentTask  } from '../../types/models';

export const initialIncidentTasks: IncidentTask[] = [
  // Incidente 1 (Falta)
  { 
    id: 'it-1', 
    incident_id: 'inc-1', 
    step_order: 1, 
    title: 'Contactar colaborador', 
    department_id: 'dept-2', 
    sla_days: 1, 
    due_at: new Date(Date.now() - 86400000).toISOString(), 
    status: 'Concluida', 
    evidence: 'Email enviado', 
    created_at: new Date(Date.now() - 172800000).toISOString(),
    started_at: new Date(Date.now() - 100000000).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    last_status_change_at: new Date(Date.now() - 86400000).toISOString()
  },
  { 
    id: 'it-2', 
    incident_id: 'inc-1', 
    step_order: 2, 
    title: 'Notificar cliente', 
    department_id: 'dept-3', 
    sla_days: 1, 
    due_at: new Date().toISOString(), 
    status: 'Pendente', 
    created_at: new Date().toISOString() 
  },

  // Incidente 2 (EPI)
  { 
    id: 'it-3', 
    incident_id: 'inc-2', 
    step_order: 1, 
    title: 'Verificar estoque de EPIs', 
    department_id: 'dept-5', 
    sla_days: 2, 
    due_at: new Date(Date.now() + 86400000).toISOString(), 
    status: 'Em Andamento', 
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    assigned_to: 'demo@mastercorp.local'
  },

  // Incidente 3 (Qualidade - Crítico)
  { 
    id: 'it-4', 
    incident_id: 'inc-3', 
    step_order: 1, 
    title: 'Apurar motivo do atraso com equipe', 
    department_id: 'dept-1', 
    sla_days: 0, 
    due_at: new Date(Date.now() + 3600000 * 4).toISOString(), 
    status: 'Pendente', 
    created_at: new Date().toISOString(),
    assigned_to: 'demo@mastercorp.local'
  },
  { 
    id: 'it-5', 
    incident_id: 'inc-3', 
    step_order: 2, 
    title: 'Enviar pedido de desculpas formal', 
    department_id: 'dept-3', 
    sla_days: 1, 
    due_at: new Date(Date.now() + 86400000).toISOString(), 
    status: 'Pendente', 
    created_at: new Date().toISOString() 
  },

  // Incidente 4 (Acidente - Resolvido)
  { 
    id: 'it-6', 
    incident_id: 'inc-4', 
    step_order: 1, 
    title: 'Emitir relatório de incidente', 
    department_id: 'dept-4', 
    sla_days: 1, 
    due_at: new Date(Date.now() - 86400000 * 9).toISOString(), 
    status: 'Concluida', 
    evidence: 'Relatório #554 anexo',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 9).toISOString()
  },
  { 
    id: 'it-7', 
    incident_id: 'inc-4', 
    step_order: 2, 
    title: 'Notificar seguradora', 
    department_id: 'dept-2', 
    sla_days: 2, 
    due_at: new Date(Date.now() - 86400000 * 8).toISOString(), 
    status: 'Concluida', 
    evidence: 'Email enviado para Allianz',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 8).toISOString()
  }
];
