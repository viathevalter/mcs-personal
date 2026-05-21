import { useQuery } from '@tanstack/react-query';
import { jobFunctionsApi } from '../api/jobFunctionsApi';

export function useJobFunction(id?: string) {
  return useQuery({
    queryKey: ['jobFunction', id],
    queryFn: () => {
      if (!id) return Promise.reject(new Error('ID não fornecido'));
      return jobFunctionsApi.getJobFunction(id);
    },
    enabled: !!id,
  });
}
