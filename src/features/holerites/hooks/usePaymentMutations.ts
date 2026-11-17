import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

export interface MarcarPagosParams {
    workerIds: string[];
    mesReferencia: string;
    dataPagamento?: string; // YYYY-MM-DD
    metodoPagamento?: string;
    bancoId?: string | null;
    bancoPagamento?: string | null;
    comprovanteUrl?: string | null;
    comprovanteNome?: string | null;
    comprovanteSize?: number | null;
    comprovanteMime?: string | null;
    observacaoPagamento?: string | null;
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
        mutationFn: async ({
            workerIds,
            mesReferencia,
            dataPagamento,
            metodoPagamento,
            bancoId,
            bancoPagamento,
            comprovanteUrl,
            comprovanteNome,
            comprovanteSize,
            comprovanteMime,
            observacaoPagamento,
            empresaId
        }: MarcarPagosParams) => {
            const { data, error } = await supabase.rpc('marcar_holerites_pagos', {
                payload: {
                    worker_ids: workerIds,
                    mes_referencia: mesReferencia,
                    data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
                    metodo_pagamento: metodoPagamento || 'Transferência Bancária',
                    banco_id: bancoId || null,
                    banco_pagamento: bancoPagamento || null,
                    comprovante_url: comprovanteUrl || null,
                    comprovante_nome: comprovanteNome || null,
                    comprovante_size: comprovanteSize || null,
                    comprovante_mime: comprovanteMime || null,
                    observacao_pagamento: observacaoPagamento || null,
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
            queryClient.invalidateQueries({ queryKey: ['worker_documents'] });
            variables.workerIds.forEach(wId => {
                queryClient.invalidateQueries({ queryKey: ['worker-documents', wId] });
            });
            toast.success(
                variables.comprovanteUrl
                    ? 'Pagamento consolidado e comprovante salvo no prontuário do trabalhador!'
                    : 'Pagamento consolidado com sucesso!'
            );
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
