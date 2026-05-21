import { supabase } from '../supabaseClient';
import type { Department } from '../../types/models';

export const supabaseDepartmentService = {
    list: async (): Promise<Department[]> => {
        const { data, error } = await supabase
            .from('mcs_departments')
            .select('*')
            .eq('active', true) // Only list active by default? Or list all? Let's list all and filter in UI if needed, but usually we want active. Let's return all for admin.
            .order('name');

        if (error) {
            console.error('Error listing departments:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            active: row.active
        }));
    },

    create: async (name: string): Promise<Department | null> => {
        const { data, error } = await supabase
            .from('mcs_departments')
            .insert([{ name, active: true }])
            .select()
            .single();

        if (error) {
            console.error('Error creating department:', error);
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            active: data.active
        };
    },

    update: async (id: string, name: string): Promise<boolean> => {
        const { error } = await supabase
            .from('mcs_departments')
            .update({ name })
            .eq('id', id);

        if (error) {
            console.error('Error updating department:', error);
            return false;
        }
        return true;
    },

    delete: async (id: string): Promise<boolean> => {
        // Soft delete
        const { error } = await supabase
            .from('mcs_departments')
            .update({ active: false })
            .eq('id', id);

        if (error) {
            console.error('Error deleting department:', error);
            return false;
        }
        return true;
    }
};
