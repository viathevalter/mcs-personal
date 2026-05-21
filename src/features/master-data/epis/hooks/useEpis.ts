import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { episApi } from '../api/episApi';
import type { CreateEpiDTO, UpdateEpiDTO } from '../types';

export function useEpis() {
  return useQuery({
    queryKey: ['epis'],
    queryFn: () => episApi.getEpis(),
  });
}

export function useMutateEpi() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateEpiDTO & { empresa_id: string }) => episApi.createEpi(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epis'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEpiDTO }) => episApi.updateEpi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epis'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => episApi.deleteEpi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epis'] }),
  });

  return {
    createEpi: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateEpi: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteEpi: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
