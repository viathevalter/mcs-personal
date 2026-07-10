import { useQuery } from '@tanstack/react-query';
import { jobFunctionsApi } from '../api/jobFunctionsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';


export function useJobFunctions(empresaId?: string | null) {
  const { selectedEmpresaId } = useEmpresa();
  const activeId = empresaId !== undefined ? empresaId : selectedEmpresaId;

  return useQuery({
    queryKey: ['jobFunctions', activeId],
    queryFn: () => {
      if (!activeId) return Promise.resolve([]);
      return jobFunctionsApi.getJobFunctions(activeId);
    },
    enabled: !!activeId,
  });
}
