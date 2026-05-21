import type {  Incident  } from '../../types/models';

export const initialIncidents: Incident[] = [
  {
    id: 'inc-1',
    incident_type: 'Falta',
    title: 'Ausência injustificada - João Silva',
    description: 'Não compareceu ao turno da manhã.',
    status: 'Aberto',
    impacto: 'Alto',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    criado_por_nome: 'Gestor de Obra',
    playbook_id: 'pb-2',

    // New Universal Context
    origin_type: 'colaborador',
    context: {
      origin: { system: 'sharepoint', table: 'sp_workers', sp_id: 2001, label: 'João Silva' },
      worker: { name: 'João Silva', sp_id: 2001 },
      client: { name: 'Stocco' },
      company: { name: 'Kotrik Rosas' },
      extra: { comercial: 'Ana Silva' }
    },

    // Deprecated Fields populated for fallback
    cliente: 'Stocco',
    empresa: 'Kotrik Rosas',
    comercial: 'Ana Silva',
    origem_tipo: 'Colaborador',
    origem_codigo: 'FUNC-102'
  },
  {
    id: 'inc-2',
    incident_type: 'Segurança',
    title: 'EPI Danificado - Obra B',
    status: 'Em Andamento',
    impacto: 'Médio',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),

    origin_type: 'pedido',
    context: {
      origin: { system: 'sharepoint', table: 'sp_pedidos', sp_id: 501, ref: 'PED-2023-055' },
      pedido: { ref: 'PED-2023-055', sp_id: 501 },
      client: { name: 'Wiseowe' },
      company: { name: 'KR Industrial' },
      extra: { comercial: 'Carlos Mendes' }
    },

    cliente: 'Wiseowe',
    empresa: 'KR Industrial',
    comercial: 'Carlos Mendes',
    origem_tipo: 'Pedido',
    origem_codigo: 'PED-202355'
  },
  {
    id: 'inc-3',
    incident_type: 'Qualidade',
    title: 'Reclamação de Cliente - Atraso na Entrega',
    description: 'Cliente reportou que equipe de soldadores chegou com 2h de atraso.',
    status: 'Aberto',
    impacto: 'Crítico',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    criado_por_nome: 'Ana Silva',

    origin_type: 'manual', // Client email is manual in this context
    context: {
      origin: { system: 'supabase', table: 'email_inbox', id: 'email-442', label: 'Email Cliente' },
      client: { name: 'Luminous' },
      company: { name: 'Kotrik Rosas' },
      extra: { comercial: 'Ana Silva' }
    },

    cliente: 'Luminous',
    empresa: 'Kotrik Rosas',
    comercial: 'Ana Silva',
    origem_tipo: 'Cliente',
    origem_codigo: 'EMAIL-442',
  },
  {
    id: 'inc-4',
    incident_type: 'Acidente',
    title: 'Queda de Nível - Armazém 4',
    description: 'Colaborador tropeçou em material mal alocado.',
    status: 'Resolvido',
    impacto: 'Alto',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    data_fechamento: new Date(Date.now() - 86400000 * 5).toISOString(),
    criado_por_nome: 'Técnico Segurança',
    playbook_id: 'pb-1',

    origin_type: 'manual',
    context: {
      origin: { system: 'supabase', table: 'manual', label: 'Manual Report' },
      client: { name: 'Triangulo' },
      company: { name: 'KR Industrial' },
      extra: { comercial: 'Bruno Dias' }
    },

    cliente: 'Triangulo',
    empresa: 'KR Industrial',
    comercial: 'Bruno Dias',
    origem_tipo: 'Manual'
  }
];
