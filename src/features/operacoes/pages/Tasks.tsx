
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    CheckCircle, Calendar, Filter, Search, Briefcase, User as UserIcon,
    AlertCircle, Layers, ArrowUpRight, X, Play, Clock, AlertTriangle, Trash2, Edit, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllTarefas, updateTarefa, assignTarefa, deleteTarefa, listDepartments } from '../services/incidencias';
import { incidentTaskService } from '../services/mock/incidentTasks.service';
import { useAuth } from '../contexts/AuthContext';
import type { IncidenciaTarefaExpandida } from '../services/types';
import { useLanguage } from '../i18n';
import { ContextCard } from '../components/ContextCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CalendarView } from '../components/CalendarView';
import { TaskDetailsModal } from '../components/TaskDetailsModal';

export const Tasks: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const effectiveUser = useMemo(() => {
        if (!user) return { name: '', email: '', id: '', isAdmin: false, isSuperAdmin: false, profile: undefined };
        const name = user.profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
        const email = user.email || '';
        const isSuperAdmin = user.isSuperAdmin || user.profile?.role === 'super_admin';
        const isAdmin = user.isAdmin || isSuperAdmin || user.profile?.role === 'admin';

        return {
            ...user,
            name,
            email,
            id: user.id,
            isAdmin,
            isSuperAdmin,
            profile: user.profile
        };
    }, [user]);

    useEffect(() => {
        const searchId = searchParams.get('search');
        if (searchId) {
            setSearchTerm(searchId);
            setActiveTab('todas');
            setStatusFilter('Todos');
        }
        loadData();
    }, [searchParams]);

    const handleAdvanceStatus = async (task: IncidenciaTarefaExpandida) => {
        let newStatus = 'Pendente';
        if (task.status === 'Pendente') newStatus = 'Em Andamento';
        else if (task.status === 'Em Andamento') newStatus = 'Concluida';
        else return;

        await updateTarefa(task.id, { status: newStatus as any });
        await loadData();
    };

    const handleAssignToMe = async (id: string) => {
        await assignTarefa(id, currentUser.email);
        await loadData();
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm(t('tasks.actions.confirm_delete') || 'Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await deleteTarefa(id);
            toast.success(t('tasks.messages.delete_success'));
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error(t('tasks.messages.delete_error'));
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateTarefa(editingTask.id, {
                titulo: editingTask.titulo,
                prazo: editingTask.prazo || undefined,
                scheduled_for: editingTask.scheduled_for || undefined,
            } as any);
            toast.success("Tarefa atualizada");
            setIsEditModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar tarefa");
        }
    };

    // --- Filtering Logic ---
    const uniqueAssignees = useMemo(() => {
        const assignees = new Set<string>();
        allTasks.forEach(t => {
            if (t.responsavel_email) {
                assignees.add(t.responsavel_email);
            }
        });
        return Array.from(assignees).sort();
    }, [allTasks]);

    const isAssignedToMe = (emailOrName?: string | null) => {
        if (!emailOrName || !effectiveUser) return false;
        const target = emailOrName.trim().toLowerCase();
        const myEmail = (effectiveUser.email || '').trim().toLowerCase();
        const myName = (effectiveUser.name || '').trim().toLowerCase();
        const myUsername = myEmail.split('@')[0];

        if (myEmail && target === myEmail) return true;
        if (myUsername && target.includes(myUsername)) return true;
        if (myUsername && myUsername.includes(target.split('@')[0])) return true;
        if (myName && target.includes(myName)) return true;
        if (myName && myName.includes(target)) return true;
        return false;
    };

    const filteredData = useMemo(() => {
        const userDeptVal = effectiveUser.profile?.department_id || '';
        const foundDept = departments.find(d => d.id === userDeptVal || d.name?.toLowerCase() === userDeptVal?.toLowerCase());
        const userDeptName = foundDept?.name || userDeptVal;
        const managed = effectiveUser.profile?.managed_departments || [];

        return allTasks.filter(t => {
            const isMine = isAssignedToMe(t.responsavel_email) || t.created_by === effectiveUser.id;

            // --- ADMIN / SUPER ADMIN DATA ISOLATION ---
            if (effectiveUser && !effectiveUser.isSuperAdmin && effectiveUser.isAdmin) {
                const isManaged = managed.includes(t.departamento);

                if (!isMine && !isManaged && userDeptName && t.departamento?.toLowerCase() !== userDeptName.toLowerCase()) {
                    return false;
                }
            }

            if (activeTab === 'minhas') {
                if (!isMine) return false;
            } else if (activeTab === 'setor') {
                if (!userDeptName && managed.length === 0 && !effectiveUser.isSuperAdmin) {
                    return false;
                }
                const matchesDeptName = userDeptName && t.departamento?.toLowerCase() === userDeptName.toLowerCase();
                const matchesDeptId = userDeptVal && t.department_id === userDeptVal;
                const matchesManaged = managed.includes(t.departamento);

                if (!matchesDeptName && !matchesDeptId && !matchesManaged && !effectiveUser.isSuperAdmin) {
                    return false;
                }
            }
            // 'todas' shows everything that passes isolation check above

            if (statusFilter && statusFilter !== 'Todos') {
                if (statusFilter === 'Ativas') {
                    if (t.status === 'Concluida') return false;
                } else if (t.status !== statusFilter) {
                    return false;
                }
            }
            if (assigneeFilter !== 'Todos') {
                if (assigneeFilter === 'Unassigned') {
                    if (t.responsavel_email) return false;
                } else {
                    if (t.responsavel_email?.toLowerCase() !== assigneeFilter.toLowerCase()) return false;
                }
            }
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                const matchTitle = t.titulo?.toLowerCase().includes(lower) || false;
                const matchInc = t.incidencia_titulo?.toLowerCase().includes(lower) || false;
                const matchId = String(t.id || '').includes(lower) || String(t.incidencia_id || '').includes(lower);
                if (!matchTitle && !matchInc && !matchId) return false;
            }
            if (onlyOverdue) {
                if (!t.prazo) return false;
                if (t.status === 'Concluida') return false;
                const isLate = new Date(t.prazo) < new Date();
                if (!isLate) return false;
            }
            return true;
        });
    }, [allTasks, activeTab, statusFilter, searchTerm, onlyOverdue, effectiveUser, assigneeFilter, departments]);

    const myTasks = allTasks.filter(t => (isAssignedToMe(t.responsavel_email) || t.created_by === effectiveUser.id) && t.status !== 'Concluida');
    const myPendingCount = myTasks.length;
    const myOverdueCount = myTasks.filter(t => t.prazo && new Date(t.prazo) < new Date()).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const myDueTodayCount = myTasks.filter(t => t.prazo && t.prazo.startsWith(todayStr)).length;

    return (
        <div className="space-y-6 animate-fade-in font-inter pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        {t('tasks.title')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Olá, <span className="font-medium text-slate-900 dark:text-slate-200">{effectiveUser.name}</span>. {t('tasks.subtitle')}
                    </p>
                </div>

                {/* Summary Cards (Compact) */}
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-colors">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Layers size={16} /></div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('tasks.kpi.pendentes')}</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{myPendingCount}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-colors">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg"><AlertTriangle size={16} /></div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('tasks.kpi.vencidas')}</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{myOverdueCount}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-colors">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg"><Clock size={16} /></div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('tasks.kpi.hoje')}</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{myDueTodayCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Area */}
            <div className="flex flex-col gap-6">
                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-800">
                    <nav className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('minhas')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${activeTab === 'minhas'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            <UserIcon size={16} /> {t('tasks.tabs.minhas')}
                        </button>
                        <button
                            onClick={() => setActiveTab('setor')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${activeTab === 'setor'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            <Briefcase size={16} /> {t('tasks.tabs.setor')}
                        </button>
                        {(currentUser?.isAdmin || currentUser?.isSuperAdmin) && (
                            <button
                                onClick={() => setActiveTab('todas')}
                                className={`pb-4 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${activeTab === 'todas'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                <Layers size={16} /> {t('tasks.tabs.todas')}
                            </button>
                        )}
                    </nav>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={t('incidencias.filters.search_placeholder')}
                            className="w-full bg-transparent pl-10 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

                    <select
                        className="bg-transparent py-2 px-3 text-sm text-slate-600 dark:text-slate-400 font-medium focus:outline-none cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Todos">{t('incidencias.filters.status_all')}</option>
                        <option value="Ativas">Tarefas Ativas</option>
                        <option value="Pendente">{t('tasks.status.Pendente')}</option>
                        <option value="Em Andamento">{t('tasks.status.Em Andamento')}</option>
                        <option value="Concluida">{t('tasks.status.Concluida')}</option>
                    </select>

                    {activeTab !== 'minhas' && (
                        <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>
                            <select
                                className="bg-transparent py-2 px-3 text-sm text-slate-600 dark:text-slate-400 font-medium focus:outline-none cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors max-w-[150px] truncate"
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                            >
                                <option value="Todos">Resp: Todos</option>
                                <option value="Unassigned">Não atribuído</option>
                                {uniqueAssignees.map(email => (
                                    <option key={email} value={email}>{email}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <button
                        onClick={() => setOnlyOverdue(!onlyOverdue)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${onlyOverdue
                            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900 shadow-sm'
                            : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <AlertCircle size={16} />
                        {t('tasks.kpi.vencidas')}
                    </button>

                    {(searchTerm || statusFilter !== 'Ativas' || assigneeFilter !== 'Todos' || onlyOverdue) && (
                        <button
                            onClick={() => { setSearchTerm(''); setStatusFilter('Ativas'); setAssigneeFilter('Todos'); setOnlyOverdue(false); }}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start md:self-auto">
                    <button
                        onClick={() => setViewMode('lista')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'lista'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <Filter size={16} /> Lista
                    </button>
                    <button
                        onClick={() => setViewMode('calendario')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'calendario'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <Calendar size={16} /> Calendário
                    </button>
                </div>
            </div>

            {/* Tasks List or Calendar */}
            {viewMode === 'lista' ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">{t('common.loading')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">{t('tasks.table.tarefa')}</th>
                                        <th className="px-6 py-4 w-64">{t('tasks.table.contexto')}</th>
                                        <th className="px-6 py-4">{t('tasks.table.setor')}</th>
                                        <th className="px-6 py-4">{t('tasks.table.prazo')}</th>
                                        <th className="px-6 py-4">{t('tasks.table.responsavel')}</th>
                                        <th className="px-6 py-4 text-right">{t('tasks.table.acao')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.length === 0 ? (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-400">Nenhum dado encontrado.</td></tr>
                                    ) : (
                                        filteredData.map(task => {
                                            const isDone = task.status === 'Concluida';
                                            const now = new Date();
                                            const dueDate = task.prazo ? new Date(task.prazo) : null;
                                            const isLate = dueDate ? dueDate < now : false;

                                            const getOverdueLabel = () => {
                                                if (!dueDate) return '';
                                                const diffMs = now.getTime() - dueDate.getTime();
                                                const diffMins = Math.floor(diffMs / 60000);
                                                const diffHrs = Math.floor(diffMins / 60);
                                                const diffDays = Math.floor(diffHrs / 24);

                                                if (diffDays > 0) return `${diffDays}d ${diffHrs % 24}h`;
                                                if (diffHrs > 0) return `${diffHrs}h ${diffMins % 60}m`;
                                                return `${diffMins}m`;
                                            };

                                            return (
                                                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 flex-shrink-0">
                                                                <StatusBadge
                                                                    status={task.status}
                                                                    type="status"
                                                                    className={isDone ? 'opacity-70 shadow-none' : 'shadow-sm'}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div
                                                                    onClick={() => setSelectedTaskForModal(task)}
                                                                    className={`font-medium cursor-pointer hover:underline ${isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}
                                                                >
                                                                    {task.titulo}
                                                                </div>
                                                                {task.evidencia && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1"><CheckCircle size={12} /> {task.evidencia}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div onClick={() => navigate(`/operacoes/incidencias/${task.incidencia_id}`)} className="cursor-pointer group/link mb-2">
                                                            <div className="text-blue-600 font-medium group-hover/link:underline text-xs flex items-center gap-1 mb-1">
                                                                {task.incidencia_titulo} <ArrowUpRight size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                        <ContextCard context={task.context} compact />
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                            <Briefcase size={10} /> {task.departamento}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        {task.prazo ? (
                                                            <div className={`flex flex-col ${!isDone && isLate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                <div className="flex items-center gap-1.5 font-medium text-xs">
                                                                    <Calendar size={14} />
                                                                    {new Date(task.prazo).toLocaleDateString()}
                                                                </div>
                                                                {!isDone && isLate && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded w-fit mt-1 border border-rose-100 dark:border-rose-900">
                                                                        <AlertCircle size={10} />
                                                                        {t('tasks.vencida_ha', { days: '' }).replace('ha  dias', '').replace('há  dias', '')} {getOverdueLabel()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        {task.responsavel_email ? (
                                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                                                    {task.responsavel_email.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className="text-xs truncate max-w-[120px] font-medium">{task.responsavel_email}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs italic">Não atribuído</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 align-top text-right">
                                                        <div className="flex justify-end gap-2 items-center">
                                                            <button
                                                                onClick={() => setSelectedTaskForModal(task)}
                                                                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                                                title="Ver Detalhes da Tarefa"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {(user?.id === task.created_by || user?.isAdmin) && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingTask({ id: task.id, titulo: task.titulo, prazo: task.prazo ? task.prazo.split('T')[0] : '', scheduled_for: task.scheduled_for ? task.scheduled_for.split('T')[0] : '' });
                                                                            setIsEditModalOpen(true);
                                                                        }}
                                                                        className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Editar Tarefa">
                                                                        <Edit size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteTask(task.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Excluir Tarefa">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {!isDone ? (
                                                                <>
                                                                    {!task.responsavel_email && (
                                                                        <button
                                                                            onClick={() => handleAssignToMe(task.id)}
                                                                            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium shadow-sm hover:border-slate-300 dark:hover:border-slate-600"
                                                                        >
                                                                            {t('tasks.actions.assumir')}
                                                                        </button>
                                                                    )}
                                                                    {task.responsavel_email === currentUser.email && (
                                                                        <button
                                                                            onClick={() => handleAdvanceStatus(task)}
                                                                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all font-medium ${task.status === 'Em Andamento'
                                                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow'
                                                                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'
                                                                                }`}
                                                                        >
                                                                            {task.status === 'Em Andamento' ? (
                                                                                <>
                                                                                    <CheckCircle size={14} /> {t('tasks.actions.concluir')}
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Play size={14} fill="currentColor" /> {t('tasks.actions.iniciar')}
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                                                    {t('tasks.actions.feito')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <CalendarView
                    tasks={filteredData}
                    onTaskClick={(task) => navigate(`/operacoes/incidencias/${task.incidencia_id}`)}
                    currentUserId={user?.id}
                    onAssignMe={handleAssignToMe}
                    onEditClick={(task) => {
                        setEditingTask({ id: task.id, titulo: task.titulo, prazo: task.prazo ? task.prazo.split('T')[0] : '', scheduled_for: task.scheduled_for ? task.scheduled_for.split('T')[0] : '' });
                        setIsEditModalOpen(true);
                    }}
                    onDeleteClick={(task) => handleDeleteTask(task.id)}
                />
            )}

            {
                isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm animate-fade-in border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Editar Tarefa</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Título da Tarefa</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                        value={editingTask.titulo}
                                        onChange={e => setEditingTask({ ...editingTask, titulo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Prazo Limite</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                        value={editingTask.prazo}
                                        onChange={e => setEditingTask({ ...editingTask, prazo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Agendado Para</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                        value={editingTask.scheduled_for}
                                        onChange={e => setEditingTask({ ...editingTask, scheduled_for: e.target.value })}
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium w-full transition-colors">
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Task Details Modal */}
            <TaskDetailsModal
                task={selectedTaskForModal}
                isOpen={!!selectedTaskForModal}
                onClose={() => setSelectedTaskForModal(null)}
                onStatusChange={handleAdvanceStatus}
                onAssignMe={handleAssignToMe}
                onTaskUpdated={loadData}
                currentUserEmail={currentUser.email}
            />
        </div >
    );
};
