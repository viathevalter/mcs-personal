import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export interface OpenPosition {
  id: string;
  pedido_id: string;
  pedido_codigo: string;
  client_id: string;
  client_name: string;
  client_site_id: string;
  site_name: string;
  job_function_id: string;
  job_function_name: string;
  description_snapshot?: string;
  risk_level_snapshot?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  status: string;
  pergunta_respuesta?: any;
  base_cost_hour_snapshot?: number | string;
}

export const useOpenPositions = () => {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['open_positions', selectedEmpresaId],
    queryFn: async (): Promise<OpenPosition[]> => {
      if (!selectedEmpresaId) return [];

      // 1. Fetch pedido_items and joined pedidos (same schema)
      let queryBuilder = supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select(`
          id,
          pedido_id,
          job_function_id,
          job_function_name_snapshot,
          description_snapshot,
          risk_level_snapshot,
          quantity_requested,
          quantity_fulfilled,
          status,
          pedidos!inner (
            codigo,
            client_id,
            client_site_id,
            expected_start_date,
            expected_end_date
          )
        `);

      if (selectedEmpresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
        queryBuilder = queryBuilder.eq('empresa_id', selectedEmpresaId);
      }

      const { data: itemsData, error } = await queryBuilder
        .neq('status', 'fulfilled')
        .neq('status', 'cancelled');

      if (error) throw error;
      if (!itemsData || itemsData.length === 0) return [];

      // 2. Collect unique ids for relationships
      const clientIds = [...new Set(itemsData.map((i: any) => i.pedidos?.client_id).filter(Boolean))];
      const siteIds = [...new Set(itemsData.map((i: any) => i.pedidos?.client_site_id).filter(Boolean))];
      const jobIds = [...new Set(itemsData.map((i: any) => i.job_function_id).filter(Boolean))];

      // 3. Fetch clients, sites and job functions
      const [clientsRes, sitesRes, jobsRes] = await Promise.all([
        clientIds.length > 0 
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        jobIds.length > 0
          ? supabase.schema('core_comercial').from('job_functions').select('id, name').in('id', jobIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c.trade_name || c.legal_name]) || []);
      const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s.name]) || []);
      const jobsMap = new Map(jobsRes.data?.map(j => [j.id, j.name]) || []);

      // 4. Map the final result
      return itemsData.map((item: any) => ({
        id: item.id,
        pedido_id: item.pedido_id,
        pedido_codigo: item.pedidos?.codigo || '',
        client_id: item.pedidos?.client_id || '',
        client_name: clientsMap.get(item.pedidos?.client_id) || 'Desconhecido',
        client_site_id: item.pedidos?.client_site_id || '',
        site_name: sitesMap.get(item.pedidos?.client_site_id) || 'Desconhecido',
        job_function_id: item.job_function_id,
        job_function_name: item.job_function_name_snapshot || jobsMap.get(item.job_function_id) || 'Desconhecida',
        description_snapshot: item.description_snapshot || '',
        risk_level_snapshot: item.risk_level_snapshot || '',
        expected_start_date: item.pedidos?.expected_start_date || '',
        expected_end_date: item.pedidos?.expected_end_date || '',
        quantity_requested: item.quantity_requested,
        quantity_fulfilled: item.quantity_fulfilled,
        status: item.status
      }));
    },
    enabled: !!selectedEmpresaId
  });
};
