import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { episApi } from '../api/episApi';
import type { CreateEpiDTO, UpdateEpiDTO } from '../types';

import { useEmpresa } from '@/app/providers/EmpresaProvider';

export function useEpis() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['epis', selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return episApi.getEpis(selectedEmpresaId);
    },
    enabled: !!selectedEmpresaId,
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
