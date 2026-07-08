import type { Client } from '@/features/master-data/clients/types';
import type { ClientSite } from '@/features/master-data/client-sites/types';

export interface Lead {
  id: string;
  empresa_id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  notes?: string;
  tax_id?: string;
  legal_name?: string;
  country_id?: string;
  region_id?: string;
  province?: string;
  city?: string;
  postal_code?: string;
  address_line?: string;
  billing_email?: string;
  payment_term_id?: string;
  client_id?: string;
  sector?: string;
  cargo?: string;
  servicio_producto?: string;
  origen_lead?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Estimacion {
  id: string;
  empresa_id: string;
  codigo: string;
  client_id?: string;
  lead_id?: string;
  client_site_id?: string;
  country_id?: string;
  estimation_type: 'new_allocation' | 'expansion' | 'other';
  contact_name?: string;
  contact_email?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  validity_date?: string;
  payment_terms?: string;
  payment_term_id?: string;
  general_notes?: string;
  document_language?: 'pt' | 'es' | 'en' | 'it' | 'fr';
  status: 'draft' | 'review' | 'sent' | 'signed' | 'approved' | 'rejected' | 'expired' | 'superseded' | 'cancelled';
  is_approved_by_manager?: boolean;
  current_version_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relations mapped by React Query / Supabase
  client?: Client;
  lead?: Lead;
  client_site?: ClientSite;
  country?: { id: string; name: string };
  current_version?: EstimacionVersion;
  pedido?: { id: string; codigo: string; commercial_status: string; operational_status: string } | null;
  solicitud?: { id: string; codigo: string; status: string } | null;

  // Working schedule and additional revenues properties
  work_lunes?: boolean;
  work_martes?: boolean;
  work_miercoles?: boolean;
  work_jueves?: boolean;
  work_viernes?: boolean;
  work_sabado?: boolean;
  work_domingo?: boolean;
  hours_weekday?: number;
  hours_lunes?: number;
  hours_martes?: number;
  hours_miercoles?: number;
  hours_jueves?: number;
  hours_viernes?: number;
  hours_sabado?: number;
  hours_domingo?: number;
  additional_revenues?: AdditionalRevenueItem[];
}

export interface AdditionalRevenueItem {
  id: string;
  description: string;
  amount: number;
}

export interface EstimacionVersion {
  id: string;
  empresa_id: string;
  estimacion_id: string;
  version_number: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  total_estimated_cost: number;
  total_estimated_revenue: number;
  estimated_margin_percent: number;
  notes?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations mapped by React Query
  items?: EstimacionItem[];
  costs?: EstimacionCost[];
}

export interface EstimacionItem {
  id: string;
  empresa_id: string;
  estimacion_version_id: string;
  job_function_id: string;
  quantity: number;
  planned_hours_per_day: number;
  planned_days_per_week: number;
  total_hours: number;
  includes_accommodation: boolean;
  includes_transport: boolean;
  includes_ppe: boolean;
  base_cost_hour: number;
  recommended_sell_rate: number;
  minimum_sell_rate: number;
  sell_rate_hour: number;
  margin_percent: number;
  risk_level?: string;
  notes?: string;
  ss_regime?: 'none' | 'local' | 'destacado';
  custom_lodging_rate?: number;
  custom_epi_rate?: number;
  custom_transport_rate?: number;
  created_at: string;
  updated_at: string;
  
  // Relations mapped by React Query
  job_function?: {
    id: string;
    code: string;
    title: string;
    name?: string;
  };
}

export interface EstimacionCost {
  id: string;
  empresa_id: string;
  estimacion_version_id: string;
  cost_category: string;
  description?: string;
  amount: number;
  is_rechargeable: boolean;
  markup_percent: number;
  created_at: string;
  updated_at: string;
}

export interface EstimacionCompletaPayload {
  empresa_id: string;
  client_id: string;
  client_site_id: string;
  solicitud_type: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  payment_terms?: string;
  status: string;
  total_estimated_cost: number;
  total_estimated_revenue: number;
  estimated_margin_percent: number;
  items: Array<{
    job_function_id: string;
    quantity: number;
    planned_hours_per_day: number;
    planned_days_per_week: number;
    total_hours: number;
    includes_accommodation: boolean;
    includes_transport: boolean;
    includes_ppe: boolean;
    base_cost_hour: number;
    recommended_sell_rate: number;
    minimum_sell_rate: number;
    sell_rate_hour: number;
    margin_percent: number;
    risk_level?: string;
    notes?: string;
    ss_regime?: 'none' | 'local' | 'destacado';
    custom_lodging_rate?: number;
  }>;
  costs?: Array<{
    cost_category: string;
    description?: string;
    amount: number;
    is_rechargeable: boolean;
    markup_percent: number;
  }>;
}
