import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerDiscount } from '../types';

export function useAllDiscounts() {
    return useQuery({
        queryKey: ['all-worker-discounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('worker_discounts')
                .select(`
          *,
          workers!inner(
            id,
            nome,
            status_trabajador
          )
        `)
                .order('reference_date', { ascending: false });

            if (error) throw error;
            return data as (WorkerDiscount & { workers: { id: string, nome: string, status_trabajador: string } })[];
        },
    });
}
