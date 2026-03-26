import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/supabase/client';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';
import { getHoursControlWorkers } from '../../workers/api/workersApi';

export interface ClientSummary {
    cliente_nombre: string;
    total_workers: number;
    pending_hours: number;
    submitted_hours: number;
    validated_hours: number;
    has_active_workers: boolean;
    has_inactive_workers: boolean;
}

export function useClientHoursSummary(periodYear: number, periodMonth: number, contratante: string | null = null) {
    const { selectedEmpresaId } = useEmpresa();
    const [data, setData] = useState<ClientSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!selectedEmpresaId) {
                if (isMounted) {
                    setData([]);
                    setIsLoading(false);
                }
                return;
            }

            try {
                setIsLoading(true);
                setIsError(false);
                setError(null);

                console.log('Fetching workers...');
                const workers = await getHoursControlWorkers({
                    empresaId: selectedEmpresaId,
                    periodYear,
                    periodMonth,
                    contratante: contratante || null,
                });
                console.log('Workers fetched:', workers?.length);

                // Fetch hours for the given period
                const workerIds = workers?.map(w => w.id) || [];

                let hoursData: any[] = [];
                if (workerIds.length > 0) {
                    console.log('Fetching worker hours...');
                    const chunkSize = 200;
                    for (let i = 0; i < workerIds.length; i += chunkSize) {
                        const chunk = workerIds.slice(i, i + chunkSize);
                        const { data: hours, error: hoursError } = await supabase
                            .schema('core_personal')
                            .from('worker_hours')
                            .select('worker_id, status')
                            .in('worker_id', chunk)
                            .eq('period_year', periodYear)
                            .eq('period_month', periodMonth);

                        if (hoursError) {
                            console.error('Hours fetch error:', hoursError);
                            throw hoursError;
                        }
                        if (hours) {
                            hoursData = [...hoursData, ...hours];
                        }
                    }
                    console.log('Hours fetched:', hoursData.length);
                }

                if (!isMounted) return;

                // Group by client
                const summaryMap = new Map<string, ClientSummary>();

                workers?.forEach(w => {
                    const client = w.cliente_nombre || 'NÃO DEFINIDO';
                    if (!summaryMap.has(client)) {
                        summaryMap.set(client, {
                            cliente_nombre: client,
                            total_workers: 0,
                            pending_hours: 0,
                            submitted_hours: 0,
                            validated_hours: 0,
                            has_active_workers: false,
                            has_inactive_workers: false,
                        });
                    }
                    const summary = summaryMap.get(client)!;
                    summary.total_workers++;

                    const isInactive = w.status_trabajador?.toLowerCase() === 'inativo' || w.status_trabajador?.toLowerCase() === 'desligado';
                    if (isInactive) {
                        summary.has_inactive_workers = true;
                    } else {
                        summary.has_active_workers = true;
                    }

                    // Check hours status
                    const hourRecord = hoursData.find(h => h.worker_id === w.id);
                    if (!hourRecord || hourRecord.status === 'pendente') {
                        summary.pending_hours++;
                    } else if (hourRecord.status === 'enviado') {
                        summary.submitted_hours++;
                    } else if (hourRecord.status === 'validado') {
                        summary.validated_hours++;
                    }
                });

                setData(Array.from(summaryMap.values()).sort((a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre)));
            } catch (err: any) {
                console.error('Error fetching client summaries:', err);
                if (isMounted) {
                    setIsError(true);
                    setError(err);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [selectedEmpresaId, periodYear, periodMonth, contratante]);

    return { data, isLoading, isError, error };
}
