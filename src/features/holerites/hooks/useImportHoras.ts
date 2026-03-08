import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HOLERITE_EVENTOS_QUERY_KEY } from './useHoleriteEventos';
import { insertHoleriteEventosBatch, type InsertHoleriteEventoPayload } from '../api/holeritesApi';
import { toast } from 'sonner';

export function useImportHoras() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (events: InsertHoleriteEventoPayload[]) => {
            await insertHoleriteEventosBatch(events);
        },
        onSuccess: (_, variables) => {
            // Recarregamos a query de eventos para qualquer mês afetado.
            // Para simplicidade, invalidamos toda a chave
            queryClient.invalidateQueries({ queryKey: [HOLERITE_EVENTOS_QUERY_KEY] });
            toast.success(`Importação concluída com sucesso (${variables.length} registros).`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao importar horas.');
        }
    });
}
