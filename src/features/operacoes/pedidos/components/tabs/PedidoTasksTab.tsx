import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { format } from 'date-fns';
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react';
import type { SolicitudTarea } from '../../types';

interface Props {
  tasks: SolicitudTarea[];
  isLoading: boolean;
  onStartTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  isStarting: boolean;
  isCompleting: boolean;
}

export function PedidoTasksTab({ tasks, isLoading, onStartTask, onCompleteTask, isStarting, isCompleting }: Props) {
  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground mt-6">Carregando tarefas...</div>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma tarefa operacional gerada para este pedido até o momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Tarefas Operacionais</CardTitle>
        <CardDescription>
          Micro-tarefas roteadas por departamento (RH, Logística, Documentação) oriundas das solicitudes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Departamento / Título</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Responsável</th>
                <th className="px-4 py-3 text-right font-medium">Data Limite</th>
                <th className="px-4 py-3 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                      {task.department || 'Geral'}
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                    {task.dependent_on_task_id && task.status === 'blocked' && (
                      <div className="text-xs text-red-500 flex items-center mt-1">
                        <Lock size={12} className="mr-1" />
                        Bloqueada por: {task.dependent_on_task?.title || 'Outra Tarefa'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PedidoStatusBadge type="task" status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.assignee?.raw_user_meta_data?.full_name || 'Não Atribuído'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {task.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => onStartTask(task.id)}
                          disabled={isStarting}
                        >
                          <PlayCircle size={14} className="mr-1.5" />
                          Iniciar
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onCompleteTask(task.id)}
                          disabled={isCompleting}
                        >
                          <CheckCircle2 size={14} className="mr-1.5" />
                          Concluir
                        </Button>
                      )}
                      {(task.status === 'blocked' || task.status === 'completed' || task.status === 'cancelled') && (
                        <span className="text-xs text-slate-400 italic">Sem ação</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
