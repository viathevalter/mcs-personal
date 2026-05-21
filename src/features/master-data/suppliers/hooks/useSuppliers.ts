import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliersApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateSupplierDTO, UpdateSupplierDTO } from '../types';

export function useSuppliers() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['suppliers', selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return suppliersApi.getSuppliers(selectedEmpresaId);
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateSupplier() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateSupplierDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return suppliersApi.createSupplier(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierDTO }) => {
      return suppliersApi.updateSupplier(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.archiveSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  return {
    createSupplier: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateSupplier: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveSupplier: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
