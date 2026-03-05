import type { AppRole } from '../rbac/roles';

export type Role = AppRole;

export interface Empresa {
    id: string;
    codigo: string;
    nome: string;
    is_active: boolean;
    created_at: string;
}

// Re-using or extending the existing UserMembership if needed, 
// strictly typed per Supabase schema core_common.user_memberships
export interface UserMembership {
    id: string; // The prompt asked for 'id' in the user_memberships although it's usually composite. 
    user_id: string;
    empresa_id: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    // Optional join fields
    empresa_name?: string;
}
