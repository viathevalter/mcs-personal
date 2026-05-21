import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

export interface SolicitudTargetPayload {
    source_assignment_id: string;
    source_worker_id: string;
    source_pedido_id: string;
    source_pedido_item_id: string;
    source_client_id: string;
    source_client_site_id: string;
    action_type: 'replace' | 'relocate' | 'test' | 'offboard';
    reason?: string;
    notes?: string;
}

export interface CreateSolicitudPayload {
    empresa_id: string;
    type: string;
    title: string;
    description: string;
    priority?: string;
    targets: SolicitudTargetPayload[];
}

export function useCreateSolicitud() {
    const queryClient = useQueryClient();
    const { selectedEmpresaId } = useEmpresa();

    const createSolicitudWithTargets = useMutation({
        mutationFn: async (payload: CreateSolicitudPayload) => {
            if (!payload.empresa_id) throw new Error("Empresa não selecionada");

            const { data, error } = await supabase.schema('core_operacoes').rpc('criar_solicitud_operativa_com_targets', {
                payload: payload
            });

            if (error) throw error;
            return data; // Returns the new UUID of the solicitud
        },
        onSuccess: () => {
            toast.success('Solicitação Operativa criada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['solicitudes', selectedEmpresaId] });
            queryClient.invalidateQueries({ queryKey: ['department-tasks', selectedEmpresaId] });
        },
        onError: (error: any) => {
            console.error(error);
            toast.error('Erro ao criar solicitação', { description: error.message });
        }
    });

    return {
        createSolicitudWithTargets
    };
}
