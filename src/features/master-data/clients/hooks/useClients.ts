import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api/clientsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateClientDTO, UpdateClientDTO } from '../types';

export function useClients() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['clients', selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return clientsApi.getClients(selectedEmpresaId);
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateClient() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.createClient(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClientDTO }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.updateClient(selectedEmpresaId, id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.archiveClient(selectedEmpresaId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return {
    createClient: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateClient: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveClient: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
