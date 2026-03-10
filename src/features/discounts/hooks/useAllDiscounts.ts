import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerDiscount } from '../types';

export function useAllDiscounts() {
    return useQuery({
        queryKey: ['all-worker-discounts'],
        queryFn: async () => {
            // Passo 1: Buscar TODOS os descontos existentes (geralmente menos volume que a base total de workers)
            const { data: discounts, error: discountsError } = await supabase
                .from('worker_discounts')
                .select('*')
                .order('reference_date', { ascending: false });

            if (discountsError) throw discountsError;
            if (!discounts || discounts.length === 0) return [];

            // Passo 2: Extrair os IDs de workers únicos que efetivamente TÊM descontos
            const workerIds = [...new Set(discounts.map(d => d.worker_id))];

            // Passo 3: Buscar EXATAMENTE apenas os Trabalhadores precisos, burlando o limite 1000
            const { data: workers, error: workersError } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('id, nome, status_trabajador')
                .in('id', workerIds);

            if (workersError) throw workersError;

            // Passo 4: Criar um dicionário (Map) para junção em O(1)
            const workersMap = new Map(workers?.map(w => [w.id, w]));

            // Passo 5: Combinar os dois Array, mantendo a integridade sem Inner Join frágil
            const enrichedDiscounts = discounts.map(discount => {
                const worker = workersMap.get(discount.worker_id) || { id: discount.worker_id, nome: 'Desconhecido', status_trabajador: 'Alta' };
                return {
                    ...discount,
                    workers: worker
                };
            });

            return enrichedDiscounts as (WorkerDiscount & { workers: { id: string, nome: string, status_trabajador: string } })[];
        },
    });
}
