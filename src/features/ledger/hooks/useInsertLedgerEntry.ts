import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insertLedgerEntry } from '../api/ledgerApi';
import type { LedgerEntry } from '@/shared/types/corePersonal';

export function useInsertLedgerEntry(workerId: string, year: number, month: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: Omit<LedgerEntry, 'id' | 'created_at'>) =>
            insertLedgerEntry(variables),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledger_entries', workerId, year, month] });
        },
    });
}
