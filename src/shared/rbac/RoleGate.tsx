import type { ReactNode } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { isRoleAllowed } from './roles';
import type { AppRole } from './roles';

interface RoleGateProps {
    allow: AppRole[];
    fallback?: ReactNode;
    children: ReactNode;
}

export function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
    const { role } = useEmpresa();

    if (!isRoleAllowed(role || undefined, allow)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
