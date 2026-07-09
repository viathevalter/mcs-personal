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

export function useClientTariffs(clientId: string) {
  return useQuery({
    queryKey: ['clientTariffs', clientId],
    queryFn: () => clientsApi.getClientTariffs(clientId),
    enabled: !!clientId,
  });
}

export function useClientWorkerTariffs(clientId: string) {
  return useQuery({
    queryKey: ['clientWorkerTariffs', clientId],
    queryFn: () => clientsApi.getClientWorkerTariffs(clientId),
    enabled: !!clientId,
  });
}

export function useMutateClientTariffs(clientId: string) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const saveTariffMutation = useMutation({
    mutationFn: ({ clientSiteId, jobFunctionId, valorTarifa }: { clientSiteId: string | null; jobFunctionId: string; valorTarifa: number }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.saveClientTariff(selectedEmpresaId, clientId, clientSiteId, jobFunctionId, valorTarifa);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTariffs', clientId] });
    },
  });

  const deleteTariffMutation = useMutation({
    mutationFn: ({ clientSiteId, jobFunctionId }: { clientSiteId: string | null; jobFunctionId: string }) => {
      return clientsApi.deleteClientTariff(clientId, clientSiteId, jobFunctionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientTariffs', clientId] });
    },
  });

  const saveWorkerTariffMutation = useMutation({
    mutationFn: ({ clientSiteId, workerId, valorTarifa }: { clientSiteId: string | null; workerId: string; valorTarifa: number }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.saveClientWorkerTariff(selectedEmpresaId, clientId, clientSiteId, workerId, valorTarifa);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientWorkerTariffs', clientId] });
    },
  });

  const deleteWorkerTariffMutation = useMutation({
    mutationFn: (id: string) => {
      return clientsApi.deleteClientWorkerTariff(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientWorkerTariffs', clientId] });
    },
  });

  return {
    saveTariff: saveTariffMutation.mutateAsync,
    isSavingTariff: saveTariffMutation.isPending,
    
    deleteTariff: deleteTariffMutation.mutateAsync,
    isDeletingTariff: deleteTariffMutation.isPending,

    saveWorkerTariff: saveWorkerTariffMutation.mutateAsync,
    isSavingWorkerTariff: saveWorkerTariffMutation.isPending,

    deleteWorkerTariff: deleteWorkerTariffMutation.mutateAsync,
    isDeletingWorkerTariff: deleteWorkerTariffMutation.isPending,
  };
}
