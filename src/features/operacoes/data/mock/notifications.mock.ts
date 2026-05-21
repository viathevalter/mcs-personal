import type {  Notification  } from '../../types/models';

export const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    user_email: 'demo@mastercorp.local',
    type: 'task_assigned',
    title: 'Nova Tarefa Atribuída',
    message: 'Você foi designado para "Verificar estoque de EPIs".',
    entity_type: 'task',
    entity_id: 'it-3',
    severity: 'info',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h ago
  },
  {
    id: 'notif-2',
    user_email: 'demo@mastercorp.local',
    type: 'incident_update',
    title: 'Incidência Crítica',
    message: 'Nova incidência de Qualidade reportada pelo Cliente Galp.',
    entity_type: 'incident',
    entity_id: 'inc-3',
    severity: 'danger',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(), // 5h ago
    read_at: new Date().toISOString()
  }
];
