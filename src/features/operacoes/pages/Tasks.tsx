import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    CheckCircle2,
    Calendar,
    Search,
    User as UserIcon,
    Clock,
    Play,
    RefreshCw,
    ExternalLink,
    Building2,
    ListTodo,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface UnifiedTask {
    id: string;
    empresa_id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    due_date?: string | null;
    scheduled_for?: string | null;
    assigned_to?: string | null;
    assigned_to_user_id?: string | null;
    assigned_to_email?: string | null;
    assigned_to_name?: string | null;
    created_by_name?: string | null;
    created_by_email?: string | null;
    task_source?: string | null;
    metadata?: Record<string, any> | null;
    created_at: string;
    completed_at?: string | null;
    department?: { id: string; name: string; code: string } | null;
    solicitud?: { id: string; codigo?: string; title?: string; tipo?: string } | null;
}

export const Tasks: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { selectedEmpresaId } = useEmpresa();

    const [tasks, setTasks] = useState<UnifiedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'minhas' | 'pendentes' | 'concluidas'>('minhas');
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<string>('ALL');

    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .schema('core_operacoes')
                .from('solicitud_tareas')
                .select(`
                    *,
                    department:departments(id, name, code),
                    solicitud:solicitudes_operativas(id, codigo, title, tipo)
                `)
                .order('created_at', { ascending: false })
                .limit(200);

            if (!user?.id) {
                setTasks([]);
                return;
            }
            const orParts = [`assigned_to.eq.${user.id}`];
            if (user.email) orParts.push(`assigned_to_email.ilike.${user.email}`);
            query = query.or(orParts.join(','));

            const { data, error } = await query;
            if (error) throw error;
            setTasks((data || []) as UnifiedTask[]);
        } catch (error: any) {
            console.error('Error loading unified tasks:', error);
            toast.error('Erro ao carregar tarefas.');
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.email]);

    useEffect(() => {
        const searchId = searchParams.get('search');
        if (searchId) {
            setSearchTerm(searchId);
            setActiveTab('pendentes');
        }
        loadTasks();
        const onSync = () => loadTasks();
        window.addEventListener('mcs:tasks-updated', onSync);
        return () => window.removeEventListener('mcs:tasks-updated', onSync);
    }, [searchParams, loadTasks]);

    const isMyTask = useCallback(
        (t: UnifiedTask) => {
            if (!user) return false;
            return (
                t.assigned_to === user.id ||
                t.assigned_to_user_id === user.id ||
                (Boolean(user.email) &&
                    Boolean(t.assigned_to_email) &&
                    t.assigned_to_email!.toLowerCase() === user.email!.toLowerCase())
            );
        },
        [user]
    );

    const handleUpdateStatus = async (taskId: string, newStatus: 'in_progress' | 'completed') => {
        try {
            const payload: Record<string, any> = {
                status: newStatus,
                updated_at: new Date().toISOString()
            };
            if (newStatus === 'completed') {
                payload.completed_at = new Date().toISOString();
            }

            const { error } = await supabase
                .schema('core_operacoes')
                .from('solicitud_tareas')
                .update(payload)
                .eq('id', taskId);

            if (error) throw error;
            toast.success(newStatus === 'completed' ? '✅ Tarefa finalizada e movida para Concluídas!' : 'Tarefa iniciada!');
            window.dispatchEvent(new CustomEvent('mcs:tasks-updated'));
            loadTasks();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao atualizar status da tarefa.');
        }
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    const myPendingCount = useMemo(
        () => tasks.filter(t => isMyTask(t) && t.status !== 'completed' && t.status !== 'cancelled').length,
        [tasks, isMyTask]
    );

    const overdueCount = useMemo(
        () =>
            tasks.filter(
                t =>
                    isMyTask(t) &&
                    t.status !== 'completed' &&
                    t.status !== 'cancelled' &&
                    t.due_date &&
                    t.due_date < todayStr
            ).length,
        [tasks, isMyTask, todayStr]
    );

    const dueTodayCount = useMemo(
        () =>
            tasks.filter(
                t =>
                    isMyTask(t) &&
                    t.status !== 'completed' &&
                    t.status !== 'cancelled' &&
                    t.due_date === todayStr
            ).length,
        [tasks, isMyTask, todayStr]
    );

    const departmentOptions = useMemo(() => {
        const map = new Map<string, string>();
        tasks.forEach(t => {
            if (t.department?.code) {
                map.set(t.department.code.toUpperCase(), t.department.name);
            }
        });
        return Array.from(map.entries());
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (activeTab === 'minhas') {
                if (!isMyTask(t)) return false;
                if (t.status === 'completed' || t.status === 'cancelled') return false;
            } else if (activeTab === 'pendentes') {
                if (t.status === 'completed' || t.status === 'cancelled') return false;
            } else if (activeTab === 'concluidas') {
                if (t.status !== 'completed') return false;
            }

            if (deptFilter !== 'ALL') {
                if ((t.department?.code || '').toUpperCase() !== deptFilter) return false;
            }

            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const match =
                    (t.title || '').toLowerCase().includes(q) ||
                    (t.description || '').toLowerCase().includes(q) ||
                    (t.assigned_to_name || '').toLowerCase().includes(q) ||
                    (t.assigned_to_email || '').toLowerCase().includes(q) ||
                    (t.solicitud?.codigo || '').toLowerCase().includes(q);
                if (!match) return false;
            }

            return true;
        });
    }, [tasks, activeTab, deptFilter, searchTerm, isMyTask]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header + KPIs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <ListTodo className="w-6 h-6 text-indigo-600" />
                        Gestão de Tarefas (Sincronizada com Super Gaveta)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Olá, <strong>{user?.user_metadata?.full_name || user?.email}</strong>. Visualize aqui as mesmas tarefas da Super Gaveta Operacional em tela cheia.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 text-center">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">Minhas Pendentes</div>
                        <div className="text-xl font-bold text-indigo-600">{myPendingCount}</div>
                    </div>
                    <div className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 text-center">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">Vencidas</div>
                        <div className="text-xl font-bold text-rose-600">{overdueCount}</div>
                    </div>
                    <div className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 text-center">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">Vencem Hoje</div>
                        <div className="text-xl font-bold text-amber-600">{dueTodayCount}</div>
                    </div>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant={activeTab === 'minhas' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-xs font-semibold ${activeTab === 'minhas' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                        onClick={() => setActiveTab('minhas')}
                    >
                        Minhas Tarefas ({myPendingCount})
                    </Button>
                    <Button
                        variant={activeTab === 'pendentes' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-xs font-semibold ${activeTab === 'pendentes' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                        onClick={() => setActiveTab('pendentes')}
                    >
                        Todas Pendentes ({tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length})
                    </Button>
                    <Button
                        variant={activeTab === 'concluidas' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-xs font-semibold ${activeTab === 'concluidas' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        onClick={() => setActiveTab('concluidas')}
                    >
                        Concluídas ({tasks.filter(t => t.status === 'completed').length})
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tarefa, termo, responsável..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="h-8 px-2.5 text-xs rounded-md border bg-white dark:bg-slate-900"
                    >
                        <option value="ALL">Todos os Setores</option>
                        {departmentOptions.map(([code, name]) => (
                            <option key={code} value={code}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadTasks}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Carregando tarefas...</div>
            ) : filteredTasks.length === 0 ? (
                <div className="py-14 text-center border rounded-xl bg-white dark:bg-slate-900 text-xs text-muted-foreground">
                    Nenhuma tarefa encontrada nesta aba.
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTasks.map(task => {
                        const isOverdue =
                            task.status !== 'completed' &&
                            task.status !== 'cancelled' &&
                            task.due_date &&
                            task.due_date < todayStr;

                        return (
                            <div
                                key={task.id}
                                className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm space-y-2.5 ${
                                    isOverdue ? 'border-rose-300' : 'border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {task.department?.name && (
                                            <Badge variant="outline" className="text-[10px] gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {task.department.name}
                                            </Badge>
                                        )}
                                        {task.priority === 'urgent' || task.priority === 'high' ? (
                                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-[10px]">
                                                Prioridade Alta
                                            </Badge>
                                        ) : null}
                                        {task.status === 'in_progress' && (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[10px]">
                                                Em Andamento
                                            </Badge>
                                        )}
                                        {task.status === 'completed' && (
                                            <Badge className="bg-emerald-600 text-white text-[10px]">Concluída</Badge>
                                        )}
                                        {isOverdue && (
                                            <Badge className="bg-rose-600 text-white text-[10px] gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Vencida
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                            <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                                            {task.assigned_to_name || task.assigned_to_email || 'Setor Geral'}
                                        </span>
                                        {task.due_date && (
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-PT')}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(task.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</h3>
                                    {task.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line mt-1 leading-relaxed">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                                    <div>
                                        {task.metadata?.signing_url && task.status !== 'completed' && (
                                            <a
                                                href={task.metadata.signing_url}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Abrir Termo para Assinar ({task.metadata.codigo_termo || 'Tarifa'})
                                            </a>
                                        )}
                                    </div>

                                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                                        <div className="flex items-center gap-2">
                                            {task.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                    Iniciar
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                                                onClick={() => handleUpdateStatus(task.id, 'completed')}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Concluir Tarefa
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
