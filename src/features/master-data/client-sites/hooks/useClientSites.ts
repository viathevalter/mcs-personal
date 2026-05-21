import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientSitesApi } from '../api/clientSitesApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateClientSiteDTO, UpdateClientSiteDTO } from '../types';

export function useClientSites(clientId?: string) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['clientSites', selectedEmpresaId, clientId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return clientSitesApi.getClientSites(selectedEmpresaId, clientId);
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateClientSite() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientSiteDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientSitesApi.createClientSite(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSites'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClientSiteDTO }) => {
      return clientSitesApi.updateClientSite(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSites'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => clientSitesApi.archiveClientSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSites'] });
    },
  });

  return {
    createSite: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateSite: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveSite: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
