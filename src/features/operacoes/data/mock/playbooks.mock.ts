import type {  Playbook  } from '../../types/models';

export const initialPlaybooks: Playbook[] = [
  { id: 'pb-1', name: 'Processo de Acidente de Trabalho', incident_type: 'Acidente', active: true, description: 'Fluxo para acidentes leves ou graves.', version: 1 },
  { id: 'pb-2', name: 'Falta Injustificada', incident_type: 'Falta', active: true, description: 'Fluxo de notificação e substituição rápida.', version: 1 },
  { id: 'pb-3', name: 'Onboarding Urgente', incident_type: 'Geral', active: true, description: 'Entrada imediata em cliente.', version: 1 },
  { id: 'pb-4', name: 'Protocolo de Assédio', incident_type: 'RH', active: true, description: 'Fluxo confidencial de denúncia e apuração.', version: 1 }
];
