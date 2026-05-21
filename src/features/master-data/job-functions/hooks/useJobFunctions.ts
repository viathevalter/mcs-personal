import { useQuery } from '@tanstack/react-query';
import { jobFunctionsApi } from '../api/jobFunctionsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';


export function useJobFunctions() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['jobFunctions', selectedEmpresaId],
    queryFn: () => {
      if (!selectedEmpresaId) return Promise.resolve([]);
      return jobFunctionsApi.getJobFunctions(selectedEmpresaId);
    },
    enabled: !!selectedEmpresaId,
  });
}
