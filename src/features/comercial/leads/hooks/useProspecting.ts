import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { ProspectingService, type ImportLeadOptions } from '../services/prospectingService';
import type { LeadProspectingJob, LeadProspectingResult } from '../types/prospectingTypes';

export function useProspectingJobs() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['prospecting-jobs', selectedEmpresaId],
    queryFn: async () => {
      // Query all shared prospecting jobs globally to avoid duplicate searches across companies
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadProspectingJob[];
    },
    enabled: Boolean(selectedEmpresaId),
    refetchInterval: 4000,
  });
}

export function useProspectingResults(jobId?: string | null) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['prospecting-results', jobId, selectedEmpresaId],
    queryFn: async () => {
      if (jobId && jobId !== 'all') {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('lead_prospecting_results')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(5000);
        if (error) throw error;
        return (data || []) as LeadProspectingResult[];
      }

      // Fetch all records across chunks of 1000 to bypass PostgREST max_rows = 1000 default limit
      const CHUNK_SIZE = 1000;
      let allResults: LeadProspectingResult[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore && offset < 50000) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('lead_prospecting_results')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + CHUNK_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allResults = allResults.concat(data as LeadProspectingResult[]);
          if (data.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }
      }

      return allResults;
    },
    enabled: Boolean(selectedEmpresaId),
    refetchInterval: 10000,
  });
}

export function useCreateProspectingJob() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      keywords: string;
      location: string;
      target_count: number;
      delay_seconds?: number;
      search_source?: 'google_maps' | 'linkedin' | 'web_broad';
      email_required?: boolean;
      sector_filter?: string;
      api_key_override?: string;
    }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .insert({
          empresa_id: selectedEmpresaId,
          title: payload.title,
          keywords: payload.keywords,
          location: payload.location,
          target_count: payload.target_count,
          delay_seconds: payload.delay_seconds || 3,
          search_source: payload.search_source || 'google_maps',
          email_required: payload.email_required ?? true,
          sector_filter: payload.sector_filter || null,
          api_key_override: payload.api_key_override || null,
          status: 'pending',
          processed_count: 0,
          found_emails_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LeadProspectingJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-jobs'] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed' }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data as LeadProspectingJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-jobs'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['prospecting-results'] });
    },
  });
}

export function useClearEmpresaProspectingJobs() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  return useMutation({
    mutationFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { error: err1 } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_results')
        .delete()
        .eq('empresa_id', selectedEmpresaId);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .delete()
        .eq('empresa_id', selectedEmpresaId);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['prospecting-results'] });
    },
  });
}



export function useImportResults() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  return useMutation({
    mutationFn: async (payload: { resultIds: string[]; options?: ImportLeadOptions }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return ProspectingService.importResultsToLeads(payload.resultIds, selectedEmpresaId, payload.options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-results'] });
      queryClient.invalidateQueries({ queryKey: ['prospecting-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}
