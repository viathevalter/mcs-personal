
export interface Department {
  id: string;
  name: string;
  active: boolean;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_email: string;
  role: 'leader' | 'member';
  active: boolean;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  default_department_id: string;
  default_sla_days: number;
  default_sla_unit?: 'hours' | 'days'; // New field
  active: boolean;
}

export interface Playbook {
  id: string;
  name: string;
  incident_type: string;
  description?: string;
  active: boolean;
  version: number;
}

export interface PlaybookStep {
  id: string;
  playbook_id: string;
  step_order: number;
  task_template_id: string;
  override_title?: string;
  override_department_id?: string;
  override_sla_days?: number;
  override_sla_unit?: 'hours' | 'days'; // New field
  active: boolean;
}

// --- UNIVERSAL CONTEXT MODEL ---

export type ContextSystem = 'sharepoint' | 'supabase';

export interface ContextLink {
  system: ContextSystem;
  table: string; // 'sp_pedidos', 'sp_workers', etc.
  sp_id?: number;
  id?: string;
  ref?: string; // Human readable ID (Ex: PED-100)
  label?: string; // Human readable Name (Ex: João Silva)
}

export interface IncidentContext {
  origin: ContextLink; // The trigger entity
  company?: { name?: string; sp_id?: number };
  client?: { name?: string; sp_id?: number; link?: ContextLink; email?: string; phone?: string; };
  pedido?: { ref?: string; sp_id?: number; link?: ContextLink };
  worker?: { name?: string; sp_id?: number; link?: ContextLink; email?: string; phone?: string; };
  obra?: { name?: string; sp_id?: number; link?: ContextLink };
  extra?: Record<string, any>;
}

export type OriginType = 'manual' | 'reemplazo' | 'reubicacion' | 'pedido' | 'presupuesto' | 'acidente' | 'colaborador';

export interface Incident {
  id: string;
  incident_type: string; // 'Acidente', 'Falta', 'Reemplazo', 'Task' (Quick Task)
  playbook_id?: string;
  title: string;
  description?: string;
  status: 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Fechado';
  prioridade?: 'Baixa' | 'Media' | 'Alta' | 'Critica'; // Legacy support
  impacto?: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';

  // New Universal Context
  context: IncidentContext;
  origin_type: OriginType;

  created_at: string;
  updated_at: string;
  data_fechamento?: string;

  criado_por_nome?: string;

  // Deprecated flat fields (kept for compatibility, derived from context in UI)
  cliente?: string;
  empresa?: string;
  comercial?: string;
  origem_tipo?: string; // Legacy string
  origem_codigo?: string; // Legacy string
}

export interface IncidentTask {
  id: string;
  incident_id: string;
  step_order: number;
  title: string;
  department_id: string;
  sla_days: number;
  due_at: string; // ISO Date (Deadline)
  scheduled_for?: string; // ISO Date (Plano de Início/Agendado Para)
  status: 'Pendente' | 'Em Andamento' | 'Concluida';
  assigned_to?: string; // email
  evidence?: string;
  created_at: string;
  created_by?: string; // UUID from auth.users

  // New Time Tracking Fields
  started_at?: string;         // Quando passou para 'Em Andamento'
  completed_at?: string;       // Quando passou para 'Concluida'
  last_status_change_at?: string;
}

export interface Notification {
  id: string;
  user_email: string;
  type: 'task_assigned' | 'task_overdue' | 'incident_update' | 'system';
  title: string;
  message: string;
  entity_type: 'task' | 'incident';
  entity_id: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  created_at: string;
  read_at?: string; // If null/undefined, it is unread
}

// --- COMMISSIONS MODELS ---

export interface CommissionSettings {
  id: number;
  comissao_base: number;
  bonus_novo_cliente: number;
  carencia_dias: number;
  updated_at: string;
}

export type CommissionType = 'contratacao' | 'bonus_cliente_novo' | 'desconto_reemplazo';
export type CommissionAdjustmentType = 'pagamento' | 'ajuste_positivo' | 'ajuste_negativo';

export interface CommissionGenerated {
  id: string; // 'hire_123', 'bonus_123', 'desc_123'
  vendedor_nome: string;
  vendedor_email: string;
  codpedido: string;
  nome_colab: string;
  cliente_nombre: string;
  tipo: CommissionType;
  valor: number;
  data_referencia: string;
  mes_referencia: string; // 'YYYY-MM'
}

export interface CommissionLancamento {
  id: string;
  vendedor_email: string;
  vendedor_nome: string;
  tipo: CommissionAdjustmentType;
  mes_referencia: string; // 'YYYY-MM'
  valor: number;
  referencia_id?: string; // Links to CommissionGenerated.id if it's a payment
  descricao?: string;
  created_at: string;
  created_by?: string;
}
