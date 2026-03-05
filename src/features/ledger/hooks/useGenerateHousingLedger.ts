import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateHousingLedger } from '../api/ledgerApi';

interface GenerateHousingParams {
    empresaId: string;
    year: number;
    month: number;
}

export function useGenerateHousingLedger() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: GenerateHousingParams) =>
            generateHousingLedger(params.empresaId, params.year, params.month),
        onSuccess: () => {
            // Invalidate the ledger entries query for the exact year/month
            // to refresh the table. We don't have the workerId explicitly here, 
            // so we invalidate the broader key
            queryClient.invalidateQueries({
                queryKey: ['ledger_entries']
            });
        }
    });
}
