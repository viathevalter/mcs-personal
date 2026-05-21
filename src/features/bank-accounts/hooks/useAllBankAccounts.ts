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
    data_ingresso: string | null;
    data_baixa: string | null;
    certificado_url: string | null;
    autorizacao_url: string | null;
    is_new: boolean;
    status_month: 'ATIVO' | 'INATIVO';
}

export const useAllBankAccounts = (empresaId?: string, month?: number, year?: number) => {
    return useQuery({
        // include empresa_id, month, year to refetch on switch
        queryKey: ['all-bank-accounts', empresaId, month, year],
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
                    .select('worker_id, iban, banco, updated_at, certificado_url, autorizacao_url')
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

            // Client-side filtering for active in month
            let filteredWorkers = allWorkersData;
            
            if (month && year) {
                const monthStart = new Date(year, month - 1, 1);
                const monthEnd = new Date(year, month, 0, 23, 59, 59); // last day of month
                
                filteredWorkers = allWorkersData.filter(w => {
                    const ingressDate = w.data_ingresso ? new Date(w.data_ingresso) : null;
                    const exitDate = w.data_baixa ? new Date(w.data_baixa) : null;
                    
                    // Se não tiver data de ingresso, assumimos que está ativo se statusTrabajador for ativo,
                    // mas num sistema de RH ideal a data_ingresso deveria existir. Vamos assumir que sim.
                    if (ingressDate && ingressDate > monthEnd) return false; // Entered after this month
                    
                    if (exitDate && exitDate < monthStart) return false; // Left before this month started
                    
                    return true;
                });
            }

            return filteredWorkers.map((w) => {
                const settings = settingsData?.find(s => s.worker_id === w.id);
                
                let isNew = false;
                let statusMonth: 'ATIVO' | 'INATIVO' = 'ATIVO';
                
                if (month && year && w.data_ingresso) {
                    const ingressDate = new Date(w.data_ingresso);
                    if (ingressDate.getMonth() === month - 1 && ingressDate.getFullYear() === year) {
                        isNew = true;
                    }
                }
                
                if (month && year && w.data_baixa) {
                    const exitDate = new Date(w.data_baixa);
                    // Se a data de baixa for no mês selecionado ou antes do fim do mês selecionado
                    const monthEnd = new Date(year, month, 0, 23, 59, 59);
                    if (exitDate <= monthEnd) {
                        statusMonth = 'INATIVO';
                    }
                } else if (w.status_trabajador && w.status_trabajador.toLowerCase() === 'inativo') {
                     statusMonth = 'INATIVO';
                     // Fallback, if the query month is in the future compared to when they were deactivated
                }

                return {
                    worker_id: w.id,
                    worker_nome: w.nome || 'N/A',
                    worker_codigo: w.cod_colab || 'N/A',
                    cliente_nome: w.cliente_nombre || null,
                    contratante: w.contratante || null,
                    iban: settings?.iban || null,
                    banco: settings?.banco || null,
                    updated_at: settings?.updated_at || null,
                    data_ingresso: w.data_ingresso || null,
                    data_baixa: w.data_baixa || null,
                    certificado_url: settings?.certificado_url || null,
                    autorizacao_url: settings?.autorizacao_url || null,
                    import_batch_id: null, // We removed import_batch_id from worker_ibans for simplified flow
                    is_new: isNew,
                    status_month: statusMonth
                };
            });
        },
        enabled: Boolean(empresaId)
    });
};
