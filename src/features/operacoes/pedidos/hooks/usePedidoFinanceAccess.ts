import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';

export function usePedidoFinanceAccess() {
  const { role: memberRole, isLoading: loadingEmpresa } = useEmpresa();
  const { role: globalRole, loadingRole } = useRole();

  // Permissão concedida apenas para super_admin global
  const hasFinanceAccess = globalRole === 'super_admin';

  return {
    hasFinanceAccess,
    isLoading: loadingEmpresa || loadingRole
  };
}
