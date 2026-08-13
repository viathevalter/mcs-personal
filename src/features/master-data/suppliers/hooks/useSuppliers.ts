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

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers_list'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateSupplierDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return suppliersApi.createSupplier(selectedEmpresaId, payload);
    },
    onSuccess: invalidateSuppliers,
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payloadList: CreateSupplierDTO[]) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return suppliersApi.bulkCreateSuppliers(selectedEmpresaId, payloadList);
    },
    onSuccess: invalidateSuppliers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierDTO }) => {
      return suppliersApi.updateSupplier(id, payload);
    },
    onSuccess: invalidateSuppliers,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.archiveSupplier(id),
    onSuccess: invalidateSuppliers,
  });

  return {
    createSupplier: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    bulkCreateSuppliers: bulkCreateMutation.mutateAsync,
    isBulkCreating: bulkCreateMutation.isPending,

    updateSupplier: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveSupplier: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}

