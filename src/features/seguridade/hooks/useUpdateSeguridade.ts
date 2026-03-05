import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSeguridadeStatus } from '../api/seguridadeApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import type { StatusWorkflowSeguridade } from '@/shared/types/corePersonal';

interface UpdateProps {
    id: string;
    status: StatusWorkflowSeguridade;
    dataEfetiva?: string;
    observacoes?: string;
}

export function useUpdateSeguridade() {
    const queryClient = useQueryClient();
    const { selectedEmpresaId } = useEmpresa();

    return useMutation({
        mutationFn: ({ id, status, dataEfetiva, observacoes }: UpdateProps) =>
            updateSeguridadeStatus(id, status, dataEfetiva, observacoes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seguridade-status', selectedEmpresaId] });
            toast.success('Status de Seguridade atualizado com sucesso.');
        },
        onError: (error) => {
            console.error('Update seguridade error:', error);
            toast.error('Erro ao atualizar status', {
                description: error.message || 'Houve um problema ao salvar as informações.',
            });
        },
    });
}
