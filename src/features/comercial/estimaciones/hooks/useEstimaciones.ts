import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Estimacion } from '../types';

interface UseEstimacionesFilters {
  status?: string;
  solicitud_type?: string;
  search?: string;
  client_id?: string;
  empresa_id?: string;
}

export function useEstimaciones(filters?: UseEstimacionesFilters) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['estimaciones', selectedEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      let query = supabase
        .schema('core_comercial')
        .from('estimaciones')
        .select(`
          *,
          current_version:estimacion_versions!fk_estimacion_current_version(
            id, version_number, total_cost, total_revenue, margin_percent, status,
            items:estimacion_items(
              quantity,
              job_function:job_functions(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.empresa_id && filters.empresa_id !== 'all') {
        query = query.eq('empresa_id', filters.empresa_id);
      } else if (!filters?.empresa_id || filters.empresa_id === 'default') {
        query = query.eq('empresa_id', selectedEmpresaId);
      } // Se filters.empresa_id for 'all', não aplicamos o filtro e deixamos a RLS filtrar

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.solicitud_type && filters.solicitud_type !== 'all') {
        query = query.eq('estimation_type', filters.solicitud_type);
      }
      if (filters?.client_id && filters.client_id !== 'all') {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.search) {
        query = query.or(`codigo.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const leadIds = [...new Set(data.map(d => d.lead_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(d => d.client_site_id).filter(Boolean))];
      
      const [
        { data: clients }, 
        { data: leads }, 
        { data: sites },
        { data: users },
        { data: companies },
        { data: countries }
      ] = await Promise.all([
        clientIds.length > 0 ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds) : Promise.resolve({ data: [] }),
        leadIds.length > 0 ? supabase.schema('core_comercial').from('leads').select('id, name, company_name').in('id', leadIds) : Promise.resolve({ data: [] }),
        siteIds.length > 0 ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds) : Promise.resolve({ data: [] }),
        supabase.schema('core_operacoes').from('mcs_users').select('id, email, display_name'),
        supabase.schema('core_common').from('empresas').select('id, legal_name, trade_name'),
        supabase.schema('core_common').from('countries').select('id, name')
      ]);

      return data.map(est => ({
        ...est,
        client: clients?.find((c: any) => c.id === est.client_id),
        lead: leads?.find((l: any) => l.id === est.lead_id),
        client_site: sites?.find((s: any) => s.id === est.client_site_id),
        created_by_user: users?.find((u: any) => u.id === est.created_by),
        empresa: companies?.find((e: any) => e.id === est.empresa_id),
        country: countries?.find((c: any) => c.id === est.country_id)
      })) as any[];
    },
    enabled: !!selectedEmpresaId,
  });
}
