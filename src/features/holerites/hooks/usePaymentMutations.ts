import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

export interface MarcarPagosParams {
    workerIds: string[];
    mesReferencia: string;
    dataPagamento?: string; // YYYY-MM-DD
    metodoPagamento?: string;
    empresaId?: string;
}

export interface EstornarPagamentoParams {
    workerId?: string;
    holeriteId?: string;
    mesReferencia: string;
}

export function usePaymentMutations() {
    const queryClient = useQueryClient();

    const marcarPagosMutation = useMutation({
        mutationFn: async ({ workerIds, mesReferencia, dataPagamento, metodoPagamento, empresaId }: MarcarPagosParams) => {
            const { data, error } = await supabase.rpc('marcar_holerites_pagos', {
                payload: {
                    worker_ids: workerIds,
                    mes_referencia: mesReferencia,
                    data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
                    metodo_pagamento: metodoPagamento || 'Transferência Bancária',
                    empresa_id: empresaId || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
                }
            });

            if (error) {
                console.error('Error marking holerites as paid:', error);
                throw error;
            }

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['holerites_status', variables.mesReferencia] });
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos', variables.mesReferencia] });
            toast.success('Pagamento consolidado com sucesso!');
        },
        onError: (err: any) => {
            toast.error(err?.message || 'Erro ao consolidar pagamento.');
        }
    });

    const estornarPagamentoMutation = useMutation({
        mutationFn: async ({ workerId, holeriteId, mesReferencia }: EstornarPagamentoParams) => {
            const { data, error } = await supabase.rpc('estornar_holerite_pagamento', {
                payload: {
                    worker_id: workerId,
                    holerite_id: holeriteId,
                    mes_referencia: mesReferencia
                }
            });

            if (error) {
                console.error('Error reverting holerite payment:', error);
                throw error;
            }

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['holerites_status', variables.mesReferencia] });
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos', variables.mesReferencia] });
            toast.success('Pagamento estornado com sucesso (retornado a Rascunho / Lançado).');
        },
        onError: (err: any) => {
            toast.error(err?.message || 'Erro ao estornar pagamento.');
        }
    });

    return {
        marcarPagos: marcarPagosMutation.mutate,
        isMarcarPagosLoading: marcarPagosMutation.isPending,
        estornarPagamento: estornarPagamentoMutation.mutate,
        isEstornarLoading: estornarPagamentoMutation.isPending
    };
}
