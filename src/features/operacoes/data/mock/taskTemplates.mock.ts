import type {  TaskTemplate  } from '../../types/models';

export const initialTaskTemplates: TaskTemplate[] = [
  { id: 'tpl-1', title: 'Emitir relatório de incidente', description: 'Preencher formulário padrão.', default_department_id: 'dept-4', default_sla_days: 1, active: true },
  { id: 'tpl-2', title: 'Notificar seguradora', description: 'Enviar e-mail para corretora.', default_department_id: 'dept-2', default_sla_days: 2, active: true },
  { id: 'tpl-3', title: 'Avaliar retorno ao trabalho', description: 'Consulta médica.', default_department_id: 'dept-1', default_sla_days: 5, active: true },
  { id: 'tpl-4', title: 'Contactar colaborador', description: 'Ligar para número de emergência.', default_department_id: 'dept-2', default_sla_days: 0, active: true },
  { id: 'tpl-5', title: 'Definir substituto', description: 'Buscar no banco de talentos.', default_department_id: 'dept-1', default_sla_days: 1, active: true },
  { id: 'tpl-6', title: 'Informar cliente', description: 'Enviar status report.', default_department_id: 'dept-3', default_sla_days: 1, active: true },
];
