import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobFunctionsApi } from '../api/jobFunctionsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateJobFunctionDTO, UpdateJobFunctionDTO } from '../types';

export function useMutateJobFunction() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateJobFunctionDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return jobFunctionsApi.createJobFunction(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctions', selectedEmpresaId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJobFunctionDTO }) => {
      return jobFunctionsApi.updateJobFunction(id, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctions', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['jobFunction', data.id] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => jobFunctionsApi.archiveJobFunction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctions', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['jobFunction', id] });
    },
  });

  return {
    createJobFunction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateJobFunction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveJobFunction: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
