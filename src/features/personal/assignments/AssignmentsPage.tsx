import { Building, AlertCircle } from 'lucide-react';
import { useWorkerAssignments } from '@/features/operacoes/solicitudes/hooks/useWorkerAssignments';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export const AssignmentsPage: React.FC = () => {
  const { selectedEmpresaId } = useEmpresa();
  
  // No filters initially
  const { data: assignments = [], isLoading } = useWorkerAssignments({
    empresa_id: selectedEmpresaId
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Trabalhadores Alocados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Visão geral de todos os trabalhadores ativos ou planejados.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Trabalhador</th>
                <th className="px-6 py-4 font-medium">Pedido</th>
                <th className="px-6 py-4 font-medium">Cliente / Obra</th>
                <th className="px-6 py-4 font-medium">Função</th>
                <th className="px-6 py-4 font-medium text-center">Início Previsto</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Carregando alocações...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma alocação encontrada.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment: any) => (
                  <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {assignment.worker?.nome || 'Desconhecido'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {assignment.worker?.nif || assignment.worker?.dni || assignment.worker?.cod_colab || 'Sem documento'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {assignment.pedido?.codigo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {assignment.client?.trade_name || assignment.client?.legal_name || 'Cliente'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {assignment.client_site?.name || 'Obra'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {assignment.job_function_name_snapshot || 'Desconhecida'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                      {assignment.planned_start_date ? new Date(assignment.planned_start_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        assignment.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        assignment.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {assignment.status === 'active' ? 'Ativo' : 
                         assignment.status === 'planned' ? 'Planejado' : 
                         assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {assignment.assignment_type === 'new_hire' && !assignment.replacement_of_assignment_id ? (
                        <span className="text-xs font-medium text-slate-500">Alocação Raiz</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                            <AlertCircle size={12} />
                            Substituição
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
