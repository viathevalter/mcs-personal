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
        { data: proposal_signature },
        { data: pedido }
      ] = await Promise.all([
        estimacion.client_id
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, tax_id, email, phone, billing_email, address_line, postal_code, city, province, country_id').eq('id', estimacion.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        estimacion.lead_id
          ? supabase.schema('core_comercial').from('leads').select('id, name, email, phone, company_name, legal_name, tax_id, client_id, address_line, postal_code, city, province, country_id, billing_email, payment_term_id').eq('id', estimacion.lead_id).maybeSingle()
          : Promise.resolve({ data: null }),
        estimacion.client_site_id 
          ? supabase.schema('core_common').from('client_sites').select('id, name, address:address_line, address_line, city, postal_code, province').eq('id', estimacion.client_site_id).maybeSingle()
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
          .maybeSingle(),
        supabase.schema('core_comercial')
          .from('pedidos')
          .select('id, codigo, commercial_status, operational_status')
          .eq('source_estimacion_id', id)
          .eq('empresa_id', selectedEmpresaId)
          .maybeSingle()
      ]);

      let solicitud = null;
      if (pedido) {
        const { data: solData } = await supabase.schema('core_operacoes')
          .from('solicitudes_operativas')
          .select('id, codigo, status')
          .eq('pedido_id', pedido.id)
          .eq('empresa_id', selectedEmpresaId)
          .maybeSingle();
        solicitud = solData;
      }

      let resolvedClient = client;
      if (!resolvedClient && lead?.client_id) {
        const { data: clientFromLead } = await supabase
          .schema('core_common')
          .from('clients')
          .select('id, legal_name, trade_name, tax_id, email, phone, billing_email, address_line, postal_code, city, province, country_id')
          .eq('id', lead.client_id)
          .maybeSingle();

        if (clientFromLead) {
          resolvedClient = clientFromLead;
          // Auto-heal estimacion client_id in background
          supabase
            .schema('core_comercial')
            .from('estimaciones')
            .update({ client_id: clientFromLead.id })
            .eq('id', id)
            .then(() => {});
        }
      }

      // Find the current version and map it to current_version
      const currentVersion = estimacion.versions?.find((v: any) => v.id === estimacion.current_version_id) || estimacion.versions?.[0] || null;
      
      return {
        ...estimacion,
        client: resolvedClient,
        lead,
        client_site,
        country,
        current_version: currentVersion,
        proposal_signature,
        pedido,
        solicitud
      } as Estimacion & { versions: any[]; proposal_signature: any; pedido: any; solicitud: any };
    },
    enabled: !!selectedEmpresaId && !!id,
  });
}
