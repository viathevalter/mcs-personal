import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { upsertWorkerBankBatch, type UpsertBankAccountInput } from '../api/bankAccountsApi';

export const useImportBankAccounts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payloads: UpsertBankAccountInput[]) => {
            await upsertWorkerBankBatch(payloads);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-bank-accounts'] });
            toast.success('Página de Contas Correntes importada com sucesso!');
        },
        onError: (error: any) => {
            console.error('Erro ao importar contas bancárias:', error);
            toast.error(error.message || 'Falha ao importar contas bancárias.');
        }
    });
};
