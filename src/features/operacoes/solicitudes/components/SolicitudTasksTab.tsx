import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SolicitudTareaDetail } from '../types';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react';
import { useSolicitudActions } from '../hooks/useSolicitudActions';

interface Props {
  solicitudId: string;
  tasks: SolicitudTareaDetail[];
  isLoading: boolean;
}

export function SolicitudTasksTab({ solicitudId, tasks, isLoading }: Props) {
  const { t } = useTranslation();
  const { startTask, completeTask } = useSolicitudActions(solicitudId);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t('solicitud_detail.tasks_tab.loading')}</div>;
  }

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">{t('solicitud_detail.tasks_tab.empty')}</div>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('solicitud_detail.tasks_tab.col_task')}</TableHead>
            <TableHead>{t('solicitud_detail.tasks_tab.col_department')}</TableHead>
            <TableHead>{t('solicitud_detail.tasks_tab.col_status')}</TableHead>
            <TableHead>{t('solicitud_detail.tasks_tab.col_dependency')}</TableHead>
            <TableHead className="text-right">{t('solicitud_detail.tasks_tab.col_actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div className="font-medium">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>
                )}
              </TableCell>
              <TableCell>
                {task.department?.name || 'N/A'}
              </TableCell>
              <TableCell>
                <SolicitudStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                {task.status === 'blocked' && task.blocked_by_task ? (
                  <div className="flex items-center text-xs text-orange-500">
                    <Lock className="h-3 w-3 mr-1" />
                    {t('solicitud_detail.tasks_tab.blocked_by')} {task.blocked_by_task.title}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">{t('solicitud_detail.tasks_tab.free')}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {task.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => startTask.mutate(task.id)}
                    disabled={startTask.isPending}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {t('solicitud_detail.tasks_tab.start')}
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => completeTask.mutate(task.id)}
                    disabled={completeTask.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('solicitud_detail.tasks_tab.complete')}
                  </Button>
                )}
                {task.status === 'completed' && (
                  <span className="text-xs text-emerald-500 font-medium">{t('solicitud_detail.tasks_tab.finished')}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
