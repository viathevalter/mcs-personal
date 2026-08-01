import { supabase } from '../supabaseClient';
import type { Incident } from '../../types/models';

export const supabaseIncidentService = {

    list: async (): Promise<Incident[]> => {
        const { data, error } = await supabase
            .from('mcs_incidents')
            .select('*')
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error listing incidents:', error);
            return [];
        }

        return data.map(mapToModel);
    },

    getById: async (id: string): Promise<Incident | null> => {
        const { data, error } = await supabase
            .from('mcs_incidents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return null;
        }
        return mapToModel(data);
    },

    create: async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> => {

        // Ensure context has extra for legacy fields if columns don't exist
        const fullContext = {
            ...incident.context,
            extra: {
                ...(incident.context?.extra || {}),
                prioridade: incident.prioridade,
                impacto: incident.impacto
            }
        };
        let currentUserId: string | undefined = undefined;
        try {
            const { data: authData } = await supabase.auth.getUser();
            currentUserId = authData.user?.id;
        } catch {
            // ignore
        }

        const dbPayload: any = {
            title: incident.title,
            description: incident.description,
            status: mapStatusToDb(incident.status),
            incident_type: incident.incident_type,
            context_json: JSON.parse(contextJson),

            origin_system: incident.context?.origin?.system,
            origin_ref: incident.context?.origin?.ref,
            client_sp_id: incident.context?.client?.sp_id,
            worker_sp_id: incident.context?.worker?.sp_id,
            pedido_sp_id: incident.context?.pedido?.sp_id,
        };

        if (currentUserId) {
            dbPayload.created_by = currentUserId;
        }

        const { data, error } = await supabase
            .from('mcs_incidents')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return mapToModel(data);
    },

    update: async (id: string, patch: Partial<Incident>): Promise<Incident | null> => {
        const dbPatch: any = {};
        if (patch.title) dbPatch.title = patch.title;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.status) dbPatch.status = mapStatusToDb(patch.status);
        if (patch.data_fechamento !== undefined) dbPatch.data_fechamento = patch.data_fechamento;
        if (patch.incident_type) dbPatch.incident_type = patch.incident_type;

        // Fetch current context if we need to update impacto/prioridade
        if (patch.impacto || patch.prioridade) {
            const current = await supabase.from('mcs_incidents').select('context_json').eq('id', id).single();
            if (current.data) {
                const ctx = current.data.context_json || {};
                ctx.extra = ctx.extra || {};
                if (patch.impacto) ctx.extra.impacto = patch.impacto;
                if (patch.prioridade) ctx.extra.prioridade = patch.prioridade;
                dbPatch.context_json = ctx;
            }
        }

        if (Object.keys(dbPatch).length === 0) return null;

        const { data, error } = await supabase
            .from('mcs_incidents')
            .update(dbPatch)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapToModel(data);
    },

    delete: async (id: string): Promise<void> => {
        // 1. Delete associated tasks first to prevent FK constraint issues
        try {
            await supabase
                .from('mcs_incident_tasks')
                .delete()
                .eq('incident_id', id);
        } catch (taskErr) {
            console.warn('Error deleting associated tasks:', taskErr);
        }

        // 2. Try hard delete
        const { data, error } = await supabase
            .from('mcs_incidents')
            .delete()
            .eq('id', id)
            .select();

        // 3. Fallback: If RLS blocked hard delete (or created_by was NULL), mark status = 'deleted'
        if (error || !data || data.length === 0) {
            console.warn("Hard delete returned 0 rows or error. Soft deleting incident status = 'deleted'", error);
            await supabase
                .from('mcs_incidents')
                .update({ status: 'deleted' })
                .eq('id', id);
        }
    }
};

// Mapper function: DB columns -> Model Type
function mapToModel(row: any): Incident {
    const ctx = row.context_json || {};
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        status: mapStatusFromDb(row.status),
        // Read from context extra or default
        impacto: ctx.extra?.impacto || 'Médio',
        prioridade: ctx.extra?.prioridade || 'Media',
        incident_type: row.incident_type,
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        data_fechamento: row.data_fechamento,
        origin_type: row.origin_type || 'manual',
        context: ctx,

        // Legacy flat fields mapping
        cliente: row.cliente,
        empresa: row.empresa,
        comercial: row.comercial,
        origem_codigo: row.origin_code,
        criado_por_nome: row.created_by_email
    };
}

function mapStatusToDb(uiStatus: string): string {
    switch (uiStatus) {
        case 'Aberto': return 'open';
        case 'Em Andamento': return 'in_progress';
        case 'Resolvido': return 'resolved';
        case 'Fechado': return 'closed';
        default: return 'open';
    }
}

function mapStatusFromDb(dbStatus: string): any {
    switch (dbStatus) {
        case 'open': return 'Aberto';
        case 'in_progress': return 'Em Andamento';
        case 'resolved': return 'Resolvido';
        case 'closed': return 'Fechado';
        default: return 'Aberto';
    }
}
