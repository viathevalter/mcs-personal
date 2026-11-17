import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface HoleriteStatusInfo {
    id: string;
    worker_id: string;
    status: 'rascunho' | 'fechado' | 'pago' | string;
    data_pagamento?: string | null;
    metodo_pagamento?: string | null;
    banco_id?: string | null;
    banco_pagamento?: string | null;
    comprovante_url?: string | null;
    comprovante_nome?: string | null;
    worker_document_id?: string | null;
    observacao_pagamento?: string | null;
}

export function useHoleritesStatus(mesReferencia: string) {
    return useQuery({
        queryKey: ['holerites_status', mesReferencia],
        queryFn: async () => {
            if (!mesReferencia) return new Map<string, HoleriteStatusInfo>();

            const { data, error } = await supabase
                .schema('core_personal')
                .from('holerites')
                .select('id, worker_id, status, data_pagamento, metodo_pagamento, banco_id, banco_pagamento, comprovante_url, comprovante_nome, worker_document_id, observacao_pagamento')
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
                    metodo_pagamento: h.metodo_pagamento,
                    banco_id: (h as any).banco_id ?? null,
                    banco_pagamento: (h as any).banco_pagamento ?? null,
                    comprovante_url: (h as any).comprovante_url ?? null,
                    comprovante_nome: (h as any).comprovante_nome ?? null,
                    worker_document_id: (h as any).worker_document_id ?? null,
                    observacao_pagamento: (h as any).observacao_pagamento ?? null
                });
            });

            return map;
        },
        enabled: Boolean(mesReferencia),
        refetchOnWindowFocus: false
    });
}
