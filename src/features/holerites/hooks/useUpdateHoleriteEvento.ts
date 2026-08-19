import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { HOLERITE_EVENTOS_QUERY_KEY } from './useHoleriteEventos';

export interface UpdateHoleriteEventoParams {
    id: string;
    valor?: number;
    categoria?: string;
    descricao?: string | null;
    tipo?: 'provento' | 'desconto';
}

export function useUpdateHoleriteEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, valor, categoria, descricao, tipo }: UpdateHoleriteEventoParams) => {
            const updates: Record<string, any> = {
                updated_at: new Date().toISOString()
            };
            if (valor !== undefined) updates.valor = valor;
            if (categoria !== undefined) updates.categoria = categoria;
            if (descricao !== undefined) updates.descricao = descricao;
            if (tipo !== undefined) updates.tipo_evento = tipo;

            const { data, error } = await supabase
                .schema('core_personal')
                .from('holerite_eventos')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error("Error updating holerite evento:", error);
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [HOLERITE_EVENTOS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['workers-for-holerites'] });
            toast.success('Lançamento atualizado com sucesso!');
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar lançamento: ${error.message}`);
        }
    });
}
