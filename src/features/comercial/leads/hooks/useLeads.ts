import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Lead } from '../../estimaciones/types';

export function useLeads() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['leads', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      let allLeads: Lead[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .eq('empresa_id', selectedEmpresaId)
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
    enabled: !!selectedEmpresaId,
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
      queryClient.invalidateQueries({ queryKey: ['leads', selectedEmpresaId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>> & { empresa_id?: string } }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedEmpresaId] });
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
      queryClient.invalidateQueries({ queryKey: ['leads', selectedEmpresaId] });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (payloads: Array<Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'> & { empresa_id?: string }>) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const items = payloads.map(p => ({
        ...p,
        empresa_id: p.empresa_id || selectedEmpresaId
      }));

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .insert(items)
        .select();

      if (error) throw error;
      return data as Lead[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', selectedEmpresaId] });
    },
  });

  return {
    createLead: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createLeadsBatch: createBatchMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    updateLead: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLead: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
