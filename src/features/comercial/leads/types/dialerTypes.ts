import type { Lead } from '../../estimaciones/types';

export type DialerCampaignStatus = 'active' | 'paused' | 'completed' | 'archived';

export type DialerQueueStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'no_answer' 
  | 'scheduled' 
  | 'converted' 
  | 'rejected' 
  | 'skipped';

export type CallOutcome = 
  | 'answered_converted' 
  | 'answered_interested' 
  | 'answered_callback' 
  | 'answered_rejected' 
  | 'no_answer' 
  | 'busy' 
  | 'wrong_number' 
  | 'gatekeeper_blocked';

export type RejectionReason = 
  | 'has_own_team' 
  | 'no_demand' 
  | 'price_too_high' 
  | 'does_not_outsource' 
  | 'bad_contact' 
  | 'other';

export interface ObjectionItem {
  objection: string;
  response: string;
}

export interface QualifyingQuestion {
  question: string;
  goal: string;
}

export interface SalesScript {
  id: string;
  empresa_id: string;
  title: string;
  sector: string;
  pitch_opening: string;
  qualifying_questions: QualifyingQuestion[];
  objections_guide: ObjectionItem[];
  closing_pitch?: string | null;
  image_url?: string | null;
  rich_content_html?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DialerCampaign {
  id: string;
  empresa_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  script_id?: string | null;
  status: DialerCampaignStatus;
  total_leads: number;
  completed_leads: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  // Relations
  script?: SalesScript | null;
  assigned_user?: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  items_count?: {
    total: number;
    pending: number;
    converted: number;
    scheduled: number;
    rejected: number;
    no_answer: number;
  };
}

export interface DialerQueueItem {
  id: string;
  campaign_id: string;
  lead_id: string;
  assigned_to?: string | null;
  status: DialerQueueStatus;
  attempts_count: number;
  max_attempts: number;
  scheduled_for?: string | null;
  scheduled_notes?: string | null;
  sort_order: number;
  last_attempt_at?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  lead: Lead;
  campaign?: DialerCampaign;
}

export interface LeadCallLog {
  id: string;
  empresa_id: string;
  lead_id: string;
  campaign_id?: string | null;
  queue_item_id?: string | null;
  user_id?: string | null;
  outcome: CallOutcome;
  notes?: string | null;
  duration_seconds: number;
  phone_called?: string | null;
  contact_person?: string | null;
  scheduled_callback_at?: string | null;
  rejection_reason?: RejectionReason | null;
  created_at: string;
  // Relations
  user?: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  lead?: Lead;
}

export interface QuickPresupuestoItem {
  job_function_id: string;
  job_title: string;
  quantity: number;
  hours_per_day: number;
  days_per_week: number;
  sell_rate_hour: number;
  includes_accommodation: boolean;
  includes_transport: boolean;
}

export interface QuickPresupuestoPayload {
  empresa_id: string;
  lead_id: string;
  title: string;
  contact_name: string;
  contact_email: string;
  expected_start_date: string;
  work_city: string;
  items: QuickPresupuestoItem[];
  notes?: string;
}
