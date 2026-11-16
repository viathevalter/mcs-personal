import type { ReactNode } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { isRoleAllowed } from './roles';
import type { AppRole } from './roles';

interface RoleGateProps {
    allow: AppRole[];
    featureKey?: string;
    fallback?: ReactNode;
    children: ReactNode;
}

export function RoleGate({ allow, featureKey, fallback = null, children }: RoleGateProps) {
    const { role: memberRole } = useEmpresa();
    const { role: globalRole, canViewFeature } = useRole();

    // Se é o Dono do sistema, fura a fila e vê o menu
    if (globalRole === 'super_admin') {
        return <>{children}</>;
    }

    const roleAllowed = isRoleAllowed(memberRole || undefined, allow);
    const allowed = featureKey ? canViewFeature(featureKey, roleAllowed) : roleAllowed;

    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
