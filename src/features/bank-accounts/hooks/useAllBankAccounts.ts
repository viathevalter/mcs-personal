import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { listWorkers } from '@/features/workers/api/workersApi';

export interface BankAccountRow {
    worker_id: string;
    worker_nome: string;
    worker_codigo: string;
    cliente_nome: string | null;
    contratante: string | null;
    iban: string | null;
    banco: string | null;
    import_batch_id: string | null;
    updated_at: string | null;
}

export const useAllBankAccounts = (empresaId?: string) => {
    return useQuery({
        // include empresa_id to refetch on switch
        queryKey: ['all-bank-accounts', empresaId],
        queryFn: async (): Promise<BankAccountRow[]> => {
            if (!empresaId) return [];

            // The search_workers RPC is capped at 1000 results internally, so we must paginate to get all workers.
            let allWorkersData: any[] = [];
            let currentPage = 1;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const workersResponse = await listWorkers({
                    empresaId,
                    statusTrabajador: ['ativos', 'inativos', 'pendientes_ingreso'],
                    page: currentPage,
                    pageSize: pageSize,
                    sortColumn: 'nome',
                    sortDirection: 'asc'
                });

                const pageData = workersResponse.data.filter(w => w.nome && w.nome.trim() !== '');
                allWorkersData = [...allWorkersData, ...pageData];

                if (workersResponse.data.length < pageSize) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            if (!allWorkersData || allWorkersData.length === 0) return [];

            const workerIds = allWorkersData.map(w => w.id).filter(Boolean);

            if (workerIds.length === 0) return [];

            // Fetch settings in chunks to avoid URL length limit (414)
            const chunkSize = 150;
            const settingsData: any[] = [];
            
            for (let i = 0; i < workerIds.length; i += chunkSize) {
                const chunk = workerIds.slice(i, i + chunkSize);
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('worker_ibans')
                    .select('worker_id, iban, banco, updated_at')
                    .eq('status', 'ATIVO')
                    .in('worker_id', chunk);

                if (error) {
                    console.error("Error fetching active ibans for bank accounts (chunk):", error);
                    // continue with what we have to not break the whole page
                }
                
                if (data) {
                    settingsData.push(...data);
                }
            }

            return allWorkersData.map((w) => {
                const settings = settingsData?.find(s => s.worker_id === w.id);

                return {
                    worker_id: w.id,
                    worker_nome: w.nome || 'N/A',
                    worker_codigo: w.cod_colab || 'N/A',
                    cliente_nome: w.cliente_nombre || null,
                    contratante: w.contratante || null,
                    iban: settings?.iban || null,
                    banco: settings?.banco || null,
                    updated_at: settings?.updated_at || null,
                    import_batch_id: null // We removed import_batch_id from worker_ibans for simplified flow
                };
            });
        },
        enabled: Boolean(empresaId)
    });
};
