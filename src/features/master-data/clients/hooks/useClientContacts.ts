import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api/clientsApi';
import type { ClientContact } from '../types';

export function useClientContacts(clientId: string) {
  return useQuery({
    queryKey: ['client_contacts', clientId],
    queryFn: () => {
      if (!clientId) return Promise.resolve([]);
      return clientsApi.getClientContacts(clientId);
    },
    enabled: !!clientId,
  });
}

export function useMutateClientContact(clientId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: Omit<ClientContact, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
      return clientsApi.createClientContact(clientId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_contacts', clientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<ClientContact, 'id' | 'client_id' | 'created_at' | 'updated_at'>> }) => {
      return clientsApi.updateClientContact(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_contacts', clientId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deleteClientContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_contacts', clientId] });
    },
  });

  return {
    createContact: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateContact: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteContact: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
