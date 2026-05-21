import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobFunctionEpisApi } from '../api/jobFunctionEpisApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateJobFunctionEpiDTO, UpdateJobFunctionEpiDTO } from '../types';

export function useJobFunctionEpis(jobFunctionId: string) {
  return useQuery({
    queryKey: ['jobFunctionEpis', jobFunctionId],
    queryFn: () => jobFunctionEpisApi.getJobFunctionEpis(jobFunctionId),
    enabled: !!jobFunctionId,
  });
}

// useEpis hook was moved to master-data/epis module

export function useMutateJobFunctionEpi(jobFunctionId: string) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateJobFunctionEpiDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return jobFunctionEpisApi.createJobFunctionEpi(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionEpis', jobFunctionId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJobFunctionEpiDTO }) => {
      return jobFunctionEpisApi.updateJobFunctionEpi(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionEpis', jobFunctionId] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => jobFunctionEpisApi.archiveJobFunctionEpi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionEpis', jobFunctionId] });
    },
  });

  return {
    createEpi: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateEpi: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveEpi: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
