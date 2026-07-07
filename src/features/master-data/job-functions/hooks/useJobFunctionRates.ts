import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobFunctionRatesApi } from '../api/jobFunctionRatesApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateJobFunctionRateRefDTO, UpdateJobFunctionRateRefDTO } from '../types';

export function useJobFunctionRates(jobFunctionId: string) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['jobFunctionRates', jobFunctionId, selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return jobFunctionRatesApi.getRates(selectedEmpresaId, jobFunctionId);
    },
    enabled: !!jobFunctionId && !!selectedEmpresaId,
  });
}

export function useMutateJobFunctionRate(jobFunctionId: string) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateJobFunctionRateRefDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return jobFunctionRatesApi.createRate(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionRates', jobFunctionId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJobFunctionRateRefDTO }) => {
      return jobFunctionRatesApi.updateRate(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionRates', jobFunctionId] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => jobFunctionRatesApi.archiveRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionRates', jobFunctionId] });
    },
  });

  return {
    createRate: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateRate: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveRate: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
