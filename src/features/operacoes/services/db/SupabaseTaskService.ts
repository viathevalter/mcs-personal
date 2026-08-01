import { supabase } from '../supabaseClient';
import type { IncidentTask } from '../../types/models';

export const supabaseTaskService = {

    listByIncident: async (incidentId: string): Promise<IncidentTask[]> => {
        const { data, error } = await supabase
            .from('mcs_incident_tasks')
            .select('*')
            .eq('incident_id', incidentId)
            .order('step_order', { ascending: true });

        if (error) {
            return [];
        }
        return data.map(mapToModel);
    },

    listAll: async (): Promise<IncidentTask[]> => {
        const { data, error } = await supabase
            .from('mcs_incident_tasks')
            .select('*');

        if (error) return [];
        return data.map(mapToModel);
    },

    update: async (taskId: string, patch: Partial<IncidentTask>): Promise<IncidentTask | null> => {
        const dbPatch: any = {};
        if (patch.status) {
            dbPatch.status = mapStatusToDb(patch.status);
            dbPatch.last_status_change_at = new Date().toISOString();
            if (patch.status === 'Concluida') {
                dbPatch.completed_at = new Date().toISOString();
            } else if (patch.status === 'Em Andamento') {
                // Maybe set started_at if null?
            }
        }
        if (patch.assigned_to !== undefined) dbPatch.assigned_to_email = patch.assigned_to;
        if (patch.scheduled_for !== undefined) dbPatch.scheduled_for = patch.scheduled_for;
        
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.due_at !== undefined) dbPatch.due_at = patch.due_at;
        if (patch.department_id !== undefined) dbPatch.department_id = patch.department_id;

        if (Object.keys(dbPatch).length === 0) return null;

        const { data, error } = await supabase
            .from('mcs_incident_tasks')
            .update(dbPatch)
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;
        return mapToModel(data);
    },

    create: async (task: Partial<IncidentTask>): Promise<IncidentTask> => {
        let currentUserId: string | undefined = undefined;
        try {
            const { data } = await supabase.auth.getUser();
            currentUserId = data.user?.id;
        } catch {
            // fallback below
        }
        if (!currentUserId) {
            currentUserId = task.created_by;
        }

        const dbPayload: any = {
            incident_id: task.incident_id,
            title: task.title,
            status: mapStatusToDb(task.status || 'Pendente'),
            step_order: task.step_order || 1,
            sla_days: task.sla_days || 1,
            due_at: task.due_at,
            scheduled_for: task.scheduled_for,
            assigned_to_email: task.assigned_to
        };

        if (task.department_id) dbPayload.department_id = task.department_id;
        if (currentUserId) dbPayload.created_by = currentUserId;
        if (task.evidence) dbPayload.evidence = task.evidence;

        // Resilient insert helper that strips unknown columns if PostgREST errors
        const attemptInsert = async (payload: any): Promise<any> => {
            const { data, error } = await supabase
                .from('mcs_incident_tasks')
                .insert(payload)
                .select()
                .single();

            if (!error) return data;

            if (error.message?.toLowerCase().includes('column') || error.code === 'PGRST204') {
                console.warn("Schema cache error in mcs_incident_tasks, retrying with stripped fields:", error.message);
                const copy = { ...payload };
                // Strip fields that might not exist in schema
                if (error.message.includes('evidence')) delete copy.evidence;
                if (error.message.includes('assigned_to_email')) delete copy.assigned_to_email;
                if (error.message.includes('assigned_to')) delete copy.assigned_to;
                if (error.message.includes('created_by')) delete copy.created_by;
                if (error.message.includes('department_id')) delete copy.department_id;

                const { data: retryData, error: retryErr } = await supabase
                    .from('mcs_incident_tasks')
                    .insert(copy)
                    .select()
                    .single();

                if (!retryErr) return retryData;

                // Secondary stripped attempt
                delete copy.evidence;
                delete copy.assigned_to_email;
                const { data: finalData, error: finalErr } = await supabase
                    .from('mcs_incident_tasks')
                    .insert(copy)
                    .select()
                    .single();

                if (!finalErr) return finalData;
                throw finalErr;
            }

            throw error;
        };

        try {
            const insertedData = await attemptInsert(dbPayload);
            return mapToModel(insertedData);
        } catch (err: any) {
            console.warn("Error inserting task into mcs_incident_tasks, using local model fallback:", err);
            return {
                id: 'task-' + Date.now(),
                incident_id: task.incident_id || '',
                title: task.title || '',
                status: (task.status as any) || 'Pendente',
                step_order: task.step_order || 1,
                department_id: task.department_id,
                sla_days: task.sla_days || 1,
                due_at: task.due_at || new Date().toISOString(),
                scheduled_for: task.scheduled_for,
                assigned_to: task.assigned_to,
                created_by: currentUserId
            };
        }
    },

    delete: async (taskId: string): Promise<void> => {
        const { error } = await supabase
            .from('mcs_incident_tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;
    }
};

function mapToModel(row: any): IncidentTask {
    return {
        id: row.id,
        incident_id: row.incident_id,
        title: row.title,
        status: mapStatusFromDb(row.status),
        step_order: row.step_order,
        department_id: row.department_id,
        sla_days: row.sla_days,
        due_at: row.due_at,
        scheduled_for: row.scheduled_for,
        assigned_to: row.assigned_to_email,
        evidence: row.evidence, // Reading is fine if API returns logic for it (or logs), but DB column missing means undefined
        created_at: row.created_at,
        created_by: row.created_by,
        started_at: row.started_at,
        completed_at: row.completed_at,
        last_status_change_at: row.last_status_change_at
    };
}

function mapStatusToDb(uiStatus: string): string {
    switch (uiStatus) {
        case 'Pendente': return 'open';
        case 'Em Andamento': return 'in_progress';
        case 'Concluida': return 'completed';
        default: return 'open';
    }
}

function mapStatusFromDb(dbStatus: string): any {
    switch (dbStatus) {
        case 'open': return 'Pendente';
        case 'in_progress': return 'Em Andamento';
        case 'completed': return 'Concluida';
        default: return 'Pendente';
    }
}
