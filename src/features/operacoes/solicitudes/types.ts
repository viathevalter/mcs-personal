export interface SolicitudOperativa {
  id: string;
  empresa_id: string;
  codigo: string;
  pedido_id?: string;
  target_assignment_id?: string;
  source_entity_id?: string;
  source_module: string;
  tipo: 'new_order' | 'replacement' | 'relocation' | 'technical_test' | 'field_trial' | 'offboarding' | 'scope_change' | 'incident' | 'order_extension' | 'order_termination' | 'order_postponement';
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  pergunta_respuesta?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SolicitudTarea {
  id: string;
  empresa_id: string;
  solicitud_id: string;
  playbook_step_id?: string;
  department_id: string;
  assigned_to?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  blocked_by_task_id?: string;
  blocking: boolean;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SolicitudTimeline {
  id: string;
  empresa_id: string;
  solicitud_id: string;
  event_type: 'playbook_started' | 'task_started' | 'task_completed' | 'task_unblocked' | 'solicitud_completed' | 'status_changed' | 'comment_added' | 'file_attached' | 'other';
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
  created_by?: string;
  created_by_user?: {
    id: string;
    email: string;
  };
}

export interface SolicitudDetail extends SolicitudOperativa {
  client?: {
    id: string;
    legal_name: string;
    trade_name: string;
    email?: string;
    phone?: string;
  };
  client_site?: {
    id: string;
    name: string;
  };
  // Dados populados no select com joins
  pedido?: {
    id: string;
    codigo: string;
    client_id: string;
    client_site_id: string;
    fecha_inicio_pedido?: string;
    fecha_fin_pedido?: string;
    status_pedido?: string;
    client?: {
      id: string;
      legal_name: string;
      trade_name: string;
      email?: string;
      phone?: string;
    };
    client_site?: {
      id: string;
      name: string;
    };
  };
  empresa?: {
    id: string;
    nome?: string;
    legal_name?: string;
    trade_name?: string;
  };
  has_postponement?: boolean;
  has_extension?: boolean;
}

export interface SolicitudTareaDetail extends SolicitudTarea {
  department?: {
    id: string;
    name: string;
  };
  assigned_user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  blocked_by_task?: {
    id: string;
    title: string;
  };
  solicitud?: {
    id: string;
    codigo: string;
    title: string;
    status: string;
    priority: string;
    due_date?: string;
    pedido_id?: string;
    tipo?: string;
    empresa?: {
      id: string;
      name: string;
    } | null;
    pedido?: {
      id: string;
      client?: {
        id: string;
        legal_name: string;
        trade_name: string;
      } | null;
    } | null;
  };
}
