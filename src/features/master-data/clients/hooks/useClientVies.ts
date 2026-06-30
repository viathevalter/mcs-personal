import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api/clientsApi';

export function useClientViesHistory(clientId: string) {
  return useQuery({
    queryKey: ['client-vies-history', clientId],
    queryFn: () => clientsApi.getClientViesHistory(clientId),
    enabled: !!clientId,
  });
}

export function useCheckVies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, countryCode, vatNumber, triggerSource }: { clientId: string; countryCode: string; vatNumber: string; triggerSource?: string }) => {
      return clientsApi.checkVies(clientId, countryCode, vatNumber, triggerSource);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-vies-history', variables.clientId] });
    },
  });
}
