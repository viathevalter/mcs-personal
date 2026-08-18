import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface HoleriteStatusInfo {
    id: string;
    worker_id: string;
    status: 'rascunho' | 'fechado' | 'pago' | string;
    data_pagamento?: string | null;
    metodo_pagamento?: string | null;
}

export function useHoleritesStatus(mesReferencia: string) {
    return useQuery({
        queryKey: ['holerites_status', mesReferencia],
        queryFn: async () => {
            if (!mesReferencia) return new Map<string, HoleriteStatusInfo>();

            const { data, error } = await supabase
                .schema('core_personal')
                .from('holerites')
                .select('id, worker_id, status, data_pagamento, metodo_pagamento')
                .eq('mes_referencia', `${mesReferencia}-01`);

            if (error) {
                console.error('Error fetching holerites status:', error);
                return new Map<string, HoleriteStatusInfo>();
            }

            const map = new Map<string, HoleriteStatusInfo>();
            (data || []).forEach(h => {
                map.set(h.worker_id, {
                    id: h.id,
                    worker_id: h.worker_id,
                    status: h.status,
                    data_pagamento: h.data_pagamento,
                    metodo_pagamento: h.metodo_pagamento
                });
            });

            return map;
        },
        enabled: Boolean(mesReferencia),
        refetchOnWindowFocus: false
    });
}
