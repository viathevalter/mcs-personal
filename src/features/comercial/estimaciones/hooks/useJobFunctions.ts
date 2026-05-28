import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export function useJobFunctions() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['job-functions', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('job_functions')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useAllJobFunctionRates() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['all-job-function-rates', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('job_function_rate_refs')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .neq('status', 'archived');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmpresaId,
  });
}
