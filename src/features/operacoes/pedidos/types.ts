export interface Pedido {
  id: string;
  empresa_id: string;
  codigo: string;
  source_estimacion_id?: string;
  source_estimacion_version_id?: string;
  client_id: string;
  client_site_id: string;
  order_type: 'new_allocation' | 'expansion' | 'direct';
  commercial_status: 'draft' | 'active' | 'suspended' | 'cancelled' | 'completed';
  operational_status: 'pending_operations' | 'partially_fulfilled' | 'fulfilled';
  commercial_owner_id?: string;
  responsible_id?: string;
  approved_at?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  total_cost_snapshot?: number;
  total_revenue_snapshot?: number;
  margin_percent_snapshot?: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos manuais (core_common)
  client?: any;
  client_site?: any;
}

export interface PedidoItem {
  id: string;
  empresa_id: string;
  pedido_id: string;
  source_estimacion_item_id?: string;
  job_function_id: string;
  job_function_name_snapshot?: string;
  description_snapshot?: string;
  risk_level_snapshot?: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  planned_hours_per_day?: number;
  planned_days_per_week?: number;
  planned_total_hours?: number;
  sell_rate_hour_snapshot?: number;
  base_cost_hour_snapshot?: number;
  margin_percent_snapshot?: number;
  includes_accommodation_snapshot: boolean;
  includes_transport_snapshot: boolean;
  includes_ppe_snapshot: boolean;
  ss_regime?: 'none' | 'local' | 'destacado';
  custom_lodging_rate?: number;
  item_status: 'pending_fulfillment' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
  created_at: string;
  updated_at: string;
  job_function?: { name: string };
}

export interface SolicitudOperativa {
  id: string;
  empresa_id: string;
  codigo: string;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  pedido_id?: string;
  pedido_item_id?: string;
  tipo: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  client_id?: string;
  client_site_id?: string;
  department?: string;
  due_date?: string;
  requester_id: string;
  responsible_id?: string;
  created_at: string;
  updated_at: string;

  requester?: { raw_user_meta_data: { full_name?: string } };
  responsible?: { raw_user_meta_data: { full_name?: string } };
}

export interface SolicitudTarea {
  id: string;
  solicitud_id: string;
  department: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  dependent_on_task_id?: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;

  assignee?: { raw_user_meta_data: { full_name?: string } };
  dependent_on_task?: { title: string };
}
