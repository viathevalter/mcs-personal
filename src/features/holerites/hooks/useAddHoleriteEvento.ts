import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HoleriteEvento, EventoTipo, EventoCategoria } from '@/shared/types/holerites';
import { HOLERITE_EVENTOS_QUERY_KEY } from './useHoleriteEventos';
import { insertHoleriteEventosBatch, type InsertHoleriteEventoPayload } from '../api/holeritesApi';

export interface AddHoleriteEventoParams {
    trabalhador_id: string;
    empresa_id: string;
    mes_referencia: string;
    tipo: EventoTipo;
    categoria: EventoCategoria;
    valor: number;
    descricao?: string;
}

export function useAddHoleriteEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (evento: AddHoleriteEventoParams) => {
            const payload: InsertHoleriteEventoPayload = {
                trabalhador_id: evento.trabalhador_id,
                empresa_id: evento.empresa_id,
                mes_referencia: evento.mes_referencia,
                tipo: evento.tipo,
                categoria: evento.categoria,
                valor: evento.valor,
                descricao: evento.descricao
            };

            await insertHoleriteEventosBatch([payload]);

            return {} as HoleriteEvento;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [HOLERITE_EVENTOS_QUERY_KEY, variables.mes_referencia],
            });
        },
    });
}
