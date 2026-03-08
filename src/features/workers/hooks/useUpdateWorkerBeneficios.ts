import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { WorkerBeneficiosSettings } from '@/shared/types/corePersonal';
import { BENEFICIOS_QUERY_KEY } from './useWorkerBeneficios';
import { BENEFICIOS_HISTORY_QUERY_KEY } from './useWorkerBeneficiosHistory';
import { toast } from 'sonner';

export type AuditPayload = {
    change_type: 'iban_update' | 'tarifa_update';
    old_value: string | null;
    new_value: string | null;
    documentFile?: File | null;
};

export interface UpdateWorkerBeneficiosParams {
    settings: WorkerBeneficiosSettings;
    audits: AuditPayload[];
}

export function useUpdateWorkerBeneficios() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ settings, audits }: UpdateWorkerBeneficiosParams) => {

            // 1. Update the actual settings
            const { error: settingsError } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .upsert({
                    worker_id: settings.worker_id,
                    iban: settings.iban,
                    banco: settings.banco,
                    tarifa_hora: settings.tarifa_hora,
                    recebe_auxilio_moradia: settings.recebe_auxilio_moradia,
                    auxilio_moradia_base: settings.auxilio_moradia_base,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'worker_id'
                });

            if (settingsError) throw settingsError;

            // 2. Process audit logs if provided (e.g., user changed IBAN or Tarifa)
            if (audits?.length > 0) {
                const { data: userData } = await supabase.auth.getUser();
                if (!userData?.user) throw new Error('Não autenticado');

                for (const audit of audits) {
                    let document_url = null;

                    // Upload Document if exists
                    if (audit.documentFile) {
                        const fileExt = audit.documentFile.name.split('.').pop();
                        const fileName = `${settings.worker_id}_${Date.now()}.${fileExt}`;
                        const filePath = `${fileName}`;

                        const { error: uploadError, data } = await supabase.storage
                            .from('beneficios-docs')
                            .upload(filePath, audit.documentFile);

                        if (uploadError) throw uploadError;

                        document_url = data.path;
                    }

                    // Insert History Log
                    const { error: historyError } = await supabase
                        .from('core_personal.worker_beneficios_history')
                        .insert({
                            worker_id: settings.worker_id,
                            changed_by: userData.user.id,
                            change_type: audit.change_type,
                            old_value: audit.old_value,
                            new_value: audit.new_value,
                            document_url: document_url
                        });

                    if (historyError) throw historyError;
                }
            }

            return settings;
        },
        onSuccess: (_, vars) => {
            toast.success('Benefícios guardados corretamente.');
            queryClient.invalidateQueries({ queryKey: [BENEFICIOS_QUERY_KEY, vars.settings.worker_id] });
            queryClient.invalidateQueries({ queryKey: [BENEFICIOS_HISTORY_QUERY_KEY, vars.settings.worker_id] });
        },
        onError: (error) => {
            console.error('Error updating beneficios:', error);
            toast.error('Erro ao guardar os benefícios.');
        }
    });
}
