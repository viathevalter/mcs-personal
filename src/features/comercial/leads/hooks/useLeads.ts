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
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateLead() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .insert({
          ...payload,
          empresa_id: selectedEmpresaId,
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
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>> }) => {
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

  return {
    createLead: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLead: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLead: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
