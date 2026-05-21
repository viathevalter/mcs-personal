import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobFunctionQuestionsApi } from '../api/jobFunctionQuestionsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { CreateJobFunctionQuestionDTO, UpdateJobFunctionQuestionDTO } from '../types';

export function useJobFunctionQuestions(jobFunctionId: string) {
  return useQuery({
    queryKey: ['jobFunctionQuestions', jobFunctionId],
    queryFn: () => jobFunctionQuestionsApi.getQuestions(jobFunctionId),
    enabled: !!jobFunctionId,
  });
}

export function useMutateJobFunctionQuestion(jobFunctionId: string) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: (payload: CreateJobFunctionQuestionDTO) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      return jobFunctionQuestionsApi.createQuestion(selectedEmpresaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionQuestions', jobFunctionId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJobFunctionQuestionDTO }) => {
      return jobFunctionQuestionsApi.updateQuestion(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionQuestions', jobFunctionId] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => jobFunctionQuestionsApi.archiveQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobFunctionQuestions', jobFunctionId] });
    },
  });

  return {
    createQuestion: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    updateQuestion: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    archiveQuestion: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  };
}
