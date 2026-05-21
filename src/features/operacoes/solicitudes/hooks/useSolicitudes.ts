import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SolicitudDetail } from '../types';

interface UseSolicitudesFilters {
  status?: string;
  tipo?: string;
  priority?: string;
  search?: string;
}

export function useSolicitudes(filters?: UseSolicitudesFilters) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['solicitudes', selectedEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      let query = supabase
        .from('solicitudes_operativas')
        .select(`
          *,
          pedido:pedido_id (
            id,
            codigo,
            client_id,
            client_site_id,
            client:clients!pedido_client_id_fkey (id, legal_name, trade_name),
            client_site:client_sites!pedido_client_site_id_fkey (id, name)
          )
        `)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.tipo && filters.tipo !== 'all') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.search) {
        query = query.or(`codigo.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SolicitudDetail[]; 
    },
    enabled: !!selectedEmpresaId,
  });
}
