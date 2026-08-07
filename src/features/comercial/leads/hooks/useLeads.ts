import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Lead } from '../../estimaciones/types';

export function useLeads() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['leads', 'global', selectedEmpresaId],
    queryFn: async () => {
      let allLeads: Lead[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .order('id', { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (data && data.length > 0) {
          allLeads = [...allLeads, ...data];
          from += 1000;
          to += 1000;
          if (data.length < 1000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return allLeads;
    },
  });
}

export function useMutateLead() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'> & { empresa_id?: string }) => {
      const targetEmpresaId = payload.empresa_id || selectedEmpresaId;
      if (!targetEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .insert({
          ...payload,
          empresa_id: targetEmpresaId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const createLeadsBatch = async (leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('leads')
      .insert(leads)
      .select();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    return data as Lead[];
  };

  return {
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    deleteLead: deleteMutation.mutateAsync,
    createLeadsBatch,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
