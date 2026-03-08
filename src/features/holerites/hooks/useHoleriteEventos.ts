import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { HoleriteEvento } from '@/shared/types/holerites';

export const HOLERITE_EVENTOS_QUERY_KEY = 'holerite_eventos';

export function useHoleriteEventos(mes_referencia: string) {
    return useQuery({
        queryKey: [HOLERITE_EVENTOS_QUERY_KEY, mes_referencia],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_personal')
                .from('holerite_eventos')
                .select(`
                    id, 
                    tipo_evento, 
                    categoria, 
                    valor, 
                    descricao, 
                    referencia_dias_horas, 
                    created_at, 
                    holerites!inner ( worker_id, mes_referencia )
                `)
                .eq('holerites.mes_referencia', `${mes_referencia}-01`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching holerite eventos:", error);
                throw error;
            }

            if (!data) return [];

            return data.map((row: any) => ({
                id: row.id,
                trabalhador_id: row.holerites.worker_id,
                mes_referencia: String(row.holerites.mes_referencia).substring(0, 7),
                tipo: row.tipo_evento,
                categoria: row.categoria,
                valor: Number(row.valor),
                descricao: row.descricao,
                horas_referencia: row.referencia_dias_horas,
                created_at: row.created_at
            })) as HoleriteEvento[];
        },
        enabled: Boolean(mes_referencia),
        refetchOnWindowFocus: false
    });
}
