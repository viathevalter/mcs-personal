import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export interface KanbanStage {
  id: string;
  empresa_id: string;
  name: string;
  name_es?: string;
  color: string;
  order_index: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function useKanbanStages() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['kanban_stages', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as KanbanStage[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateKanban() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createStage = useMutation({
    mutationFn: async (payload: { name: string; name_es?: string; color?: string; order_index: number }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .insert({
          ...payload,
          empresa_id: selectedEmpresaId,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KanbanStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<KanbanStage, 'id' | 'empresa_id' | 'is_system' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as KanbanStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const moveLead = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          stage_id: stageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedStages: { id: string; order_index: number }[]) => {
      for (const item of orderedStages) {
        const { error } = await supabase
          .schema('core_comercial')
          .from('kanban_stages')
          .update({ order_index: item.order_index })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  return {
    createStage: createStage.mutateAsync,
    isCreatingStage: createStage.isPending,
    updateStage: updateStage.mutateAsync,
    isUpdatingStage: updateStage.isPending,
    deleteStage: deleteStage.mutateAsync,
    isDeletingStage: deleteStage.isPending,
    reorderStages: reorderStages.mutateAsync,
    isReorderingStages: reorderStages.isPending,
    moveLead: moveLead.mutateAsync,
    isMovingLead: moveLead.isPending,
  };
}
