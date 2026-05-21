import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empresasApi } from '../api/empresasApi';
import type { CreateEmpresaDTO, UpdateEmpresaDTO } from '../types';

export function useEmpresasList() {
  return useQuery({
    queryKey: ['empresas_list'],
    queryFn: () => empresasApi.getEmpresas(),
  });
}

export function useMutateEmpresa() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateEmpresaDTO) => empresasApi.createEmpresa(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas_list'] });
      // Also invalidate the shared empresas query
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmpresaDTO }) => {
      return empresasApi.updateEmpresa(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas_list'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    },
  });

  return {
    createEmpresa: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateEmpresa: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
