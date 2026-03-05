import { useQuery } from '@tanstack/react-query';
import { listLedgerEntriesByWorker, type ListLedgerEntriesParams } from '../api/ledgerApi';
import type { LedgerEntry } from '@/shared/types/corePersonal';

export function useLedgerEntriesByWorker(params: ListLedgerEntriesParams) {
    return useQuery<LedgerEntry[], Error>({
        queryKey: ['ledger_entries', params.workerId, params.year, params.month],
        queryFn: () => listLedgerEntriesByWorker(params),
        enabled: Boolean(params.workerId),
        staleTime: 60 * 1000,
    });
}
