import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import { useAuth } from '@/app/providers/AuthProvider';

interface AddIbanData {
    worker_id: string;
    banco: string | null;
    iban: string;
    documentoFile: File | null;
    observacoes: string | null;
}

export function useManageWorkerIban() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const addIbanMutation = useMutation({
        mutationFn: async (data: AddIbanData) => {
            if (!user) throw new Error('Usuário não autenticado');

            // 1. Upload file if exists
            let documento_url = null;
            if (data.documentoFile) {
                const fileExt = data.documentoFile.name.split('.').pop();
                const fileName = `${data.worker_id}-${Date.now()}.${fileExt}`;
                const filePath = `ibans/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('worker-documents')
                    .upload(filePath, data.documentoFile);

                if (uploadError) throw mapSupabaseError(uploadError);

                const { data: urlData } = supabase.storage
                    .from('worker-documents')
                    .getPublicUrl(filePath);
                
                documento_url = urlData.publicUrl;
            }

            // 2. Disable current active IBANs
            const { error: updateError } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .update({ status: 'INATIVO' })
                .eq('worker_id', data.worker_id)
                .eq('status', 'ATIVO');

            if (updateError) throw mapSupabaseError(updateError);

            // 3. Insert new IBAN
            const { error: insertError } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .insert([{
                    worker_id: data.worker_id,
                    banco: data.banco,
                    iban: data.iban,
                    status: 'ATIVO',
                    documento_url,
                    observacoes: data.observacoes,
                    changed_by: user.id
                }]);

            if (insertError) throw mapSupabaseError(insertError);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker_ibans', variables.worker_id] });
        }
    });

    const updateIbanStatusMutation = useMutation({
        mutationFn: async ({ id, status, worker_id }: { id: string, status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO', worker_id: string }) => {
            if (!user) throw new Error('Usuário não autenticado');

            // If setting to ATIVO, we should ensure others are INATIVO first? 
            // Better to let the user figure it out or just run the update above. 
            // For now, simple update is enough.
            if (status === 'ATIVO') {
                await supabase
                    .schema('core_personal')
                    .from('worker_ibans')
                    .update({ status: 'INATIVO' })
                    .eq('worker_id', worker_id)
                    .eq('status', 'ATIVO');
            }

            const { error } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .update({ status, changed_by: user.id })
                .eq('id', id);

            if (error) throw mapSupabaseError(error);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker_ibans', variables.worker_id] });
        }
    });


    return {
        addIban: addIbanMutation.mutateAsync,
        isAdding: addIbanMutation.isPending,
        updateStatus: updateIbanStatusMutation.mutateAsync,
        isUpdatingStatus: updateIbanStatusMutation.isPending
    };
}
