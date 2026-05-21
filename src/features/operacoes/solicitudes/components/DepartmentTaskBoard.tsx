import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { useSolicitudActions } from '../hooks/useSolicitudActions';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, CheckCircle2, Clock, PlayCircle, AlertCircle, Lock, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  departmentCodes: string[];
  onTaskClick?: (task: any) => void;
}

export function DepartmentTaskBoard({ title, departmentCodes, onTaskClick }: Props) {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading, refetch } = useDepartmentTasks(departmentCodes);
  
  // We pass undefined because this board handles multiple solicitudes.
  // The mutations will invalidate using the returned solicitud_id.
  const { startTask, completeTask } = useSolicitudActions(undefined);

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            Gestão de tarefas operacionais direcionadas ao departamento.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes (Livres)</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blocked}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando tarefas do departamento...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma tarefa encontrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitud Mãe</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dependência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div 
                      className="font-medium text-blue-600 hover:underline cursor-pointer flex items-center"
                      onClick={() => {
                        if (onTaskClick) {
                          onTaskClick(task);
                        } else {
                          navigate(`/operacoes/solicitudes/${task.solicitud_id}`);
                        }
                      }}
                    >
                      {task.solicitud?.codigo}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={task.solicitud?.title}>
                      {task.solicitud?.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={task.description}>
                        {task.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                      task.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                      task.priority === 'normal' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SolicitudStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    {task.status === 'blocked' && task.blocked_by_task ? (
                      <div className="flex items-center text-xs text-orange-500">
                        <Lock className="h-3 w-3 mr-1" />
                        Bloqueada por: {task.blocked_by_task.title}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Livre</span>
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
                        Iniciar
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
                        Concluir
                      </Button>
                    )}
                    {task.status === 'completed' && (
                      <div className="text-xs text-emerald-500 font-medium flex flex-col items-end">
                        <span>Finalizada</span>
                        {task.completed_at && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
