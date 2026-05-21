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
