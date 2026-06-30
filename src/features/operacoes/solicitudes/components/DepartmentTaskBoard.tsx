import { useState, useMemo } from 'react';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { useSolicitudActions } from '../hooks/useSolicitudActions';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, CheckCircle2, Clock, PlayCircle, AlertCircle, Lock, RefreshCw, ExternalLink, Search, X } from 'lucide-react';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const solicitudCode = task.solicitud?.codigo || '';
      const solicitudTitle = task.solicitud?.title || '';
      const taskTitle = task.title || '';
      const taskDescription = task.description || '';
      
      const empresaName = task.solicitud?.empresa?.name || 'Sem Empresa';
      const clientName = task.solicitud?.pedido?.client?.trade_name || task.solicitud?.pedido?.client?.legal_name || 'Sem Alocação';
      
      const textMatch = 
        solicitudCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitudTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        taskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());
        
      const statusMatch = statusFilter === 'all' || task.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
      
      return textMatch && statusMatch && priorityMatch;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="flex flex-col space-y-6 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
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

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por tarefa, código, empresa ou cliente..."
            className="pl-9 pr-8 bg-white dark:bg-black"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-black">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente (Livre)</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="blocked">Bloqueada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-white dark:bg-black">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando tarefas do departamento...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma tarefa encontrada para os filtros aplicados.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitud Mãe</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dependência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
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
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {task.solicitud?.empresa?.name || 'Sem Empresa'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {task.solicitud?.pedido?.client?.trade_name || task.solicitud?.pedido?.client?.legal_name || 'Sem Alocação'}
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
    </div>
  );
}
