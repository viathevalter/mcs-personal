export type AppRole = 'admin' | 'rh' | 'finance' | 'commercial' | 'user';

export interface UserMembership {
    empresa_id: string;
    role: AppRole;
    is_active: boolean;
    // Fallback property to display a friendly name for the DEV fake company
    empresa_name?: string;
}

export const ROLE_HIERARCHY: Record<AppRole, number> = {
    admin: 100,
    finance: 30,
    rh: 20,
    commercial: 10,
    user: 1,
};

export function isRoleAllowed(userRole: AppRole | undefined, requiredRoles: AppRole[]): boolean {
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
}
