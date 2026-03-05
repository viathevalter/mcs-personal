import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWorker } from '../api/workersApi';
import { useToast } from '@/hooks/use-toast';

export interface UpdateWorkerParams {
    id: string;
    nome: string;
    email: string | null;
    movil: string | null;
    niss: string | null;
    nif: string | null;
    nie: string | null;
    dni: string | null;
    pasaporte: string | null;
    licencia_conducir: string | null;
    nacionalidade: string | null;
    fecha_nacimiento: string | null;
    nuss: string | null;
    foto: string | null;
    status_trabajador: string | null;
    status_seguridad: string | null;
}

export function useUpdateWorker() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: UpdateWorkerParams) => {
            return updateWorker(params.id, params);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['workers'] }); // Atualiza a lista caso o nome mude
            toast({
                title: 'Sucesso',
                description: 'Trabalhador atualizado com sucesso.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Erro ao atualizar',
                description: error.message || 'Falha ao atualizar o trabalhador.',
                variant: 'destructive',
            });
        },
    });
}
