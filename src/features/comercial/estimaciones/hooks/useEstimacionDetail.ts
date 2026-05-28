import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Estimacion } from '../types';

export function useEstimacionDetail(id: string | undefined) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['estimacion-detail', selectedEmpresaId, id],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (!id) throw new Error('ID não fornecido');

      // Fetch the main estimacion with client, client_site and all versions
      const { data: estimacion, error: estError } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .select(`
          *,
          versions:estimacion_versions!estimacion_versions_estimacion_id_fkey(
            *,
            items:estimacion_items(
              *,
              job_function:job_functions(id, code, name)
            ),
            costs:estimacion_costs(*)
          )
        `)
        .eq('id', id)
        .eq('empresa_id', selectedEmpresaId)
        .maybeSingle();

      if (estError) throw estError;
      if (!estimacion) throw new Error('Estimación não encontrada ou você não tem acesso a ela nesta empresa.');

      // Fetch cross-schema relations
      const [
        { data: client },
        { data: lead },
        { data: client_site },
        { data: country },
        { data: proposal_signature }
      ] = await Promise.all([
        estimacion.client_id
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, email, phone').eq('id', estimacion.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        estimacion.lead_id
          ? supabase.schema('core_comercial').from('leads').select('id, name, email, phone, company_name').eq('id', estimacion.lead_id).maybeSingle()
          : Promise.resolve({ data: null }),
        estimacion.client_site_id 
          ? supabase.schema('core_common').from('client_sites').select('id, name, address').eq('id', estimacion.client_site_id).maybeSingle()
          : Promise.resolve({ data: null }),
        estimacion.country_id
          ? supabase.schema('core_common').from('countries').select('id, name').eq('id', estimacion.country_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.schema('core_comercial')
          .from('proposal_signatures')
          .select('*, proposal_audit_logs(*)')
          .eq('estimacion_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      // Find the current version and map it to current_version
      const currentVersion = estimacion.versions?.find((v: any) => v.id === estimacion.current_version_id);
      
      return {
        ...estimacion,
        client,
        lead,
        client_site,
        country,
        current_version: currentVersion,
        proposal_signature
      } as Estimacion & { versions: any[]; proposal_signature: any };
    },
    enabled: !!selectedEmpresaId && !!id,
  });
}
