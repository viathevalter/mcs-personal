import { useQuery } from '@tanstack/react-query';
import { fetchSeguridadeStatus } from '../api/seguridadeApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { SeguridadeStatusWithWorker } from '@/shared/types/corePersonal';

export function useSeguridadeList() {
    const { selectedEmpresaId } = useEmpresa();

    return useQuery<SeguridadeStatusWithWorker[], Error>({
        queryKey: ['seguridade-status', selectedEmpresaId],
        queryFn: () => {
            if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
            return fetchSeguridadeStatus(selectedEmpresaId);
        },
        enabled: Boolean(selectedEmpresaId),
    });
}
