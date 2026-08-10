export type JobStatus = 'pending' | 'processing' | 'completed' | 'paused' | 'failed';
export type ResultStatus = 'raw' | 'enriched' | 'imported' | 'discarded';

export interface LeadProspectingJob {
  id: string;
  empresa_id: string;
  title: string;
  keywords: string;
  location: string;
  target_count: number;
  processed_count: number;
  found_emails_count: number;
  status: JobStatus;
  delay_seconds: number;
  api_key_override?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface LeadProspectingResult {
  id: string;
  job_id: string;
  empresa_id: string;
  company_name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  confidence_score?: number | null;
  status: ResultStatus;
  imported_lead_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIsaSearchPayload {
  keywords: string;
  location: string;
  targetCount: number;
  apiKey?: string;
}
