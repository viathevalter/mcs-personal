import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground mt-6">{t('cockpit_pedidos.tasks_tab.loading')}</div>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          {t('cockpit_pedidos.tasks_tab.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('cockpit_pedidos.tasks_tab.title')}</CardTitle>
        <CardDescription>
          {t('cockpit_pedidos.tasks_tab.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.tasks_tab.col_dept_title')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.tasks_tab.col_status')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.tasks_tab.col_assignee')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.tasks_tab.col_due_date')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.tasks_tab.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                      {task.department || t('cockpit_pedidos.tasks_tab.general_dept')}
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                    {task.dependent_on_task_id && task.status === 'blocked' && (
                      <div className="text-xs text-red-500 flex items-center mt-1">
                        <Lock size={12} className="mr-1" />
                        {t('cockpit_pedidos.tasks_tab.blocked_by', { title: task.dependent_on_task?.title || t('cockpit_pedidos.tasks_tab.other_task') })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PedidoStatusBadge type="task" status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.assignee?.raw_user_meta_data?.full_name || t('cockpit_pedidos.tasks_tab.unassigned')}
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
                          {t('cockpit_pedidos.tasks_tab.start')}
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
                          {t('cockpit_pedidos.tasks_tab.complete')}
                        </Button>
                      )}
                      {(task.status === 'blocked' || task.status === 'completed' || task.status === 'cancelled') && (
                        <span className="text-xs text-slate-400 italic">{t('cockpit_pedidos.tasks_tab.no_action')}</span>
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
