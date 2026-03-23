import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import { useAuth } from '@/app/providers/AuthProvider';
import { uploadWorkerDocument } from '../api/documentsApi';

interface AddIbanData {
    worker_id: string;
    banco: string | null;
    empresa_id: string; // added to upload document
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
                // Upload globally and classify as IBAN Authorization
                const doc = await uploadWorkerDocument({
                    empresaId: data.empresa_id,
                    workerId: data.worker_id,
                    docType: 'Autorização de IBAN',
                    file: data.documentoFile
                });

                // Generate public or signed URL to string in db
                const { data: urlData } = supabase.storage
                    .from('mcs-personal-docs')
                    .getPublicUrl(doc.file_path);
                
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

    const attachDocumentMutation = useMutation({
        mutationFn: async ({ id, worker_id, empresa_id, file }: { id: string, worker_id: string, empresa_id: string, file: File }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const doc = await uploadWorkerDocument({
                empresaId: empresa_id,
                workerId: worker_id,
                docType: 'Autorização de IBAN',
                file: file
            });

            const { data: urlData } = supabase.storage
                .from('mcs-personal-docs')
                .getPublicUrl(doc.file_path);

            const { error } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .update({ documento_url: urlData.publicUrl, changed_by: user.id })
                .eq('id', id);

            if (error) throw mapSupabaseError(error);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker_ibans', variables.worker_id] });
            queryClient.invalidateQueries({ queryKey: ['worker_documents', variables.worker_id] }); // Update docs tab
        }
    });


    return {
        addIban: addIbanMutation.mutateAsync,
        isAdding: addIbanMutation.isPending,
        updateStatus: updateIbanStatusMutation.mutateAsync,
        isUpdatingStatus: updateIbanStatusMutation.isPending,
        attachDocument: attachDocumentMutation.mutateAsync,
        isAttaching: attachDocumentMutation.isPending
    };
}
