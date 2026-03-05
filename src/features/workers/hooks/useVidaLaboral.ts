import { useQuery } from '@tanstack/react-query';
import { fetchVidaLaboralByWorker } from '@/features/seguridade/api/seguridadeApi';
import type { SeguridadeStatus } from '@/shared/types/corePersonal';

export function useVidaLaboral(workerId: string) {
    return useQuery<SeguridadeStatus[], Error>({
        queryKey: ['vida-laboral', workerId],
        queryFn: () => fetchVidaLaboralByWorker(workerId),
        enabled: Boolean(workerId),
    });
}
