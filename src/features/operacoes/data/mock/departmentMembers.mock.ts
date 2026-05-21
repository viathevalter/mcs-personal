import type {  DepartmentMember  } from '../../types/models';

export const initialDepartmentMembers: DepartmentMember[] = [
  // Operações (dept-1): Usuário Demo é o Líder
  { id: 'dm-1', department_id: 'dept-1', user_email: 'demo@mastercorp.local', role: 'leader', active: true },
  
  // RH (dept-2): Gestor RH é Líder
  { id: 'dm-2', department_id: 'dept-2', user_email: 'rh@mastercorp.local', role: 'leader', active: true },
  
  // Comercial (dept-3): Ana Silva é Líder
  { id: 'dm-3', department_id: 'dept-3', user_email: 'ana.silva@mastercorp.local', role: 'leader', active: true },
  
  // Segurança (dept-4): Técnico Segurança é membro (sem líder definido para teste de 'sem atribuição')
  { id: 'dm-4', department_id: 'dept-4', user_email: 'seguranca@mastercorp.local', role: 'member', active: true }
];
