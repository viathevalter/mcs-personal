import type {  PlaybookStep  } from '../../types/models';

export const initialPlaybookSteps: PlaybookStep[] = [
  // PB-1: Acidente
  { id: 'pbs-1', playbook_id: 'pb-1', step_order: 1, task_template_id: 'tpl-1', active: true }, // Emitir relatorio (Segurança)
  { id: 'pbs-2', playbook_id: 'pb-1', step_order: 2, task_template_id: 'tpl-2', active: true }, // Notificar seguradora (RH)
  { id: 'pbs-3', playbook_id: 'pb-1', step_order: 3, task_template_id: 'tpl-3', active: true }, // Avaliar retorno (Ops)

  // PB-2: Falta
  { id: 'pbs-4', playbook_id: 'pb-2', step_order: 1, task_template_id: 'tpl-4', active: true }, // Contactar (RH)
  { id: 'pbs-5', playbook_id: 'pb-2', step_order: 2, task_template_id: 'tpl-5', active: true }, // Substituto (Ops)
  { id: 'pbs-6', playbook_id: 'pb-2', step_order: 3, task_template_id: 'tpl-6', active: true }, // Informar cliente (Comercial)
];
