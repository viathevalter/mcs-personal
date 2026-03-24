import type { ReactNode } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { isRoleAllowed } from './roles';
import type { AppRole } from './roles';

interface RoleGateProps {
    allow: AppRole[];
    fallback?: ReactNode;
    children: ReactNode;
}

export function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
    const { role: memberRole } = useEmpresa();
    const { role: globalRole } = useRole();

    // Se é o Dono do sistema, fura a fila e vê o menu
    if (globalRole === 'super_admin') {
        return <>{children}</>;
    }

    if (!isRoleAllowed(memberRole || undefined, allow)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
