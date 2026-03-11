import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteBankBatch } from '../api/bankAccountsApi';

export const useDeleteBankBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (batchId: string) => {
            await deleteBankBatch(batchId);
            return batchId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-bank-accounts'] });
            toast.success('Lote de contas bancárias revertido com sucesso!');
        },
        onError: (error: any) => {
            console.error('Erro ao reverter lote:', error);
            toast.error(error.message || 'Falha ao reverter lote.');
        }
    });
};
