import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api/clientsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { PaymentTerm } from '../types';

export function usePaymentTerms() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['payment_terms', selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return clientsApi.getPaymentTerms(selectedEmpresaId);
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutatePaymentTerm() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: Omit<PaymentTerm, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return clientsApi.createPaymentTerm(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_terms', selectedEmpresaId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<PaymentTerm, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>> }) => {
      return clientsApi.updatePaymentTerm(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_terms', selectedEmpresaId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deletePaymentTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_terms', selectedEmpresaId] });
    },
  });

  return {
    createPaymentTerm: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePaymentTerm: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePaymentTerm: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
