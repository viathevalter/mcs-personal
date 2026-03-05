import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface UserProfile {
    id: string; // mcs_department_members id
    user_id: string | null; // Auth id if registered
    email: string; // correoempresarial
    display_name: string; // nombrecompleto
    role: string; // app_role from user_roles
    active: boolean; // mcs_department_members active / estadotrabajador
    department_id: string | null;
    empresa_contratante_id: number | null;
    empresa_servicos_id: number | null;
    created_at: string;
}

export interface PublicEmpresa {
    id: number;
    nombre_comercial: string;
}

export interface Department {
    id: string;
    name: string;
    active: boolean;
}

export async function getUsers(): Promise<UserProfile[]> {
    const { data: members, error } = await supabase
        .from('mcs_department_members')
        .select(`*`)
        .order('nombrecompleto', { ascending: true });

    if (error) throw mapSupabaseError(error);

    // Fetch new RBAC roles
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role, email');
    const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    // Map backend data to UserProfile interface
    return members.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        email: m.correoempresarial || m.usuario || '',
        display_name: m.nombrecompleto || 'Sem Nome',
        role: (m.user_id && rolesMap.get(m.user_id)) ? rolesMap.get(m.user_id) : 'visualizador',
        active: m.active ?? true,
        department_id: m.department_id,
        empresa_contratante_id: m.empresa_contratante_id,
        empresa_servicos_id: m.empresa_servicos_id,
        created_at: m.created_at,
    }));
}

export async function getPublicEmpresas(): Promise<PublicEmpresa[]> {
    const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre_comercial')
        .order('nombre_comercial');
    if (error) throw mapSupabaseError(error);
    return data as PublicEmpresa[];
}

export async function createDepartmentMember(data: any): Promise<void> {
    const { error } = await supabase
        .from('mcs_department_members')
        .insert({
            nombrecompleto: data.display_name,
            correoempresarial: data.email,
            department_id: data.department_id,
            active: data.active ?? true,
            empresa_contratante_id: data.empresa_contratante_id,
            empresa_servicos_id: data.empresa_servicos_id
        });

    if (error) throw mapSupabaseError(error);
}

export async function getDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
        .from('mcs_departments')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw mapSupabaseError(error);
    return data as Department[];
}

export async function updateDepartmentMember(id: string, updates: Partial<any>): Promise<void> {
    const { error } = await supabase
        .from('mcs_department_members')
        .update({
            nombrecompleto: updates.display_name,
            department_id: updates.department_id,
            active: updates.active,
            empresa_contratante_id: updates.empresa_contratante_id,
            empresa_servicos_id: updates.empresa_servicos_id
        })
        .eq('id', id);

    if (error) throw mapSupabaseError(error);
}

export async function updateMcsUser(userId: string, updates: Partial<any>): Promise<void> {
    const { error } = await supabase
        .from('mcs_users')
        .update({
            active: updates.active,
            display_name: updates.display_name,
            department_id: updates.department_id,
        })
        .eq('id', userId);

    if (error) throw mapSupabaseError(error);
}

export async function updateUserRole(userId: string, email: string, role: string): Promise<void> {
    const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, email, role }, { onConflict: 'user_id' });

    if (error) throw mapSupabaseError(error);
}

// Relacionamentos com as Empresas (Matriz / Filiais)
export interface UserCompanyMembership {
    user_id: string;
    empresa_id: string;
    role: string;
    is_active: boolean;
}

export async function getUserMemberships(userId: string): Promise<UserCompanyMembership[]> {
    const { data, error } = await supabase
        .schema('core_common')
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId);

    if (error) throw mapSupabaseError(error);
    return data as UserCompanyMembership[];
}

export async function saveUserMembership(membership: UserCompanyMembership): Promise<void> {
    // Check if membership already exists
    const { data: existing, error: searchError } = await supabase
        .schema('core_common')
        .from('user_memberships')
        .select('id')
        .eq('user_id', membership.user_id)
        .eq('empresa_id', membership.empresa_id)
        .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') {
        throw mapSupabaseError(searchError);
    }

    if (existing) {
        // Update existing membership
        const { error: updateError } = await supabase
            .schema('core_common')
            .from('user_memberships')
            .update({
                role: membership.role,
                is_active: membership.is_active
            })
            .eq('id', existing.id);

        if (updateError) throw mapSupabaseError(updateError);
    } else {
        // Insert new membership
        const { error: insertError } = await supabase
            .schema('core_common')
            .from('user_memberships')
            .insert({
                user_id: membership.user_id,
                empresa_id: membership.empresa_id,
                role: membership.role,
                is_active: membership.is_active
            });

        if (insertError) throw mapSupabaseError(insertError);
    }
}
