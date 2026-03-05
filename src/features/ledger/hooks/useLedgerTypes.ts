import { useQuery } from '@tanstack/react-query';
import { listLedgerTypes } from '../api/ledgerApi';
import type { LedgerType } from '@/shared/types/corePersonal';

export function useLedgerTypes(empresaId: string | null) {
    return useQuery<LedgerType[], Error>({
        queryKey: ['ledger_types', empresaId],
        queryFn: () => {
            if (!empresaId) throw new Error('empresaId is required');
            return listLedgerTypes(empresaId);
        },
        enabled: Boolean(empresaId),
        staleTime: 5 * 60 * 1000,
    });
}
