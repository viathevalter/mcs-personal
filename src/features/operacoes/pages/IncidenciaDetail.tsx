import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar, CheckSquare, MessageSquare, Send, Plus,
    User, FileText, CheckCircle, Save, X, Play, Clock, AlertCircle, Edit, Trash2, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getIncidencia, listTarefas, listLogs, addLog, updateTarefa, createTarefa, assignTarefa, updateIncidencia, deleteTarefa, listDepartments
} from '../services/incidencias';
import { useAuth } from '../contexts/AuthContext';
import { supabaseEmployeeService } from '../services/db/SupabaseEmployeeService';
import type { Incidencia, IncidenciaTarefa, IncidenciaLog } from '../services/types';
import { useLanguage } from '../i18n';
import { ContextCard } from '../components/ContextCard';
import { RichTextRenderer } from '../components/ui/RichTextEditor';
import { FileAttachmentUploader, TaskAttachment } from '../components/ui/FileAttachmentUploader';

export const IncidenciaDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
    const [tarefas, setTarefas] = useState<IncidenciaTarefa[]>([]);
    const [logs, setLogs] = useState<IncidenciaLog[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    const [newLogText, setNewLogText] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [newTask, setNewTask] = useState<{ id?: string, titulo: string, departamento: string, prazo: string, responsavel_email?: string }>({ titulo: '', departamento: 'Operações', prazo: '', responsavel_email: '' });

    // Editing State
    const [isEditingIncidencia, setIsEditingIncidencia] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Incidencia> & { departamento?: string }>({});

    const loadData = async () => {
        if (!id) return;
        try {
            const inc = await getIncidencia(id);
            setIncidencia(inc);
            if (inc) {
                const [fetchedTasks, fetchedLogs, emps, depts] = await Promise.all([
                    listTarefas(inc.id),
                    listLogs(inc.id),
                    supabaseEmployeeService.list(),
                    listDepartments()
                ]);
                setTarefas(fetchedTasks);
                setLogs(fetchedLogs);
                setEmployees(emps.filter(e => e.active));
                setDepartments(depts);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSendLog = async () => {
        if (!newLogText.trim() || !incidencia || !user) return;
        try {
            let userName = user.profile?.full_name || user.email || 'Usuário';

            // Format if it's an email
            if (userName.includes('@')) {
                const part = userName.split('@')[0];
                userName = part.charAt(0).toUpperCase() + part.slice(1);
            }

            await addLog(incidencia.id, newLogText, userName); // Pass User Name
            setNewLogText('');
            const updatedLogs = await listLogs(incidencia.id);
            setLogs(updatedLogs);
            toast.success(t('incidencias.messages.log_success'));
        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.log_error'));
        }
    };

    const handleAdvanceStatus = async (task: IncidenciaTarefa, reverse: boolean = false) => {
        let newStatus: IncidenciaTarefa['status'] = task.status;

        if (reverse) {
            if (task.status === 'Concluida') newStatus = 'Em Andamento';
            else if (task.status === 'Em Andamento') newStatus = 'Pendente';
            else if (task.status === 'Pendente') return;
        } else {
            if (task.status === 'Pendente') newStatus = 'Em Andamento';
            else if (task.status === 'Em Andamento') newStatus = 'Concluida';
            else if (task.status === 'Concluida') return;
        }

        try {
            const localTasks = tarefas.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
            setTarefas(localTasks); // Optimistic UI for fast clickers

            await updateTarefa(task.id, { status: newStatus });

            // --- AUTO-UPDATE INCIDENT STATUS LOGIC ---
            const allConcluded = localTasks.length > 0 && localTasks.every(t => t.status === 'Concluida');
            const anyInProgress = localTasks.some(t => t.status === 'Em Andamento');
            const anyConcluded = localTasks.some(t => t.status === 'Concluida');

            let newIncidentStatus = incidencia!.status;

            if (allConcluded) {
                if (incidencia!.status !== 'Resolvido' && incidencia!.status !== 'Fechado') {
                    newIncidentStatus = 'Resolvido';
                }
            } else {
                if (anyInProgress || anyConcluded) {
                    if (incidencia!.status === 'Aberto' || incidencia!.status === 'Resolvido' || incidencia!.status === 'Fechado') {
                        newIncidentStatus = 'Em Andamento';
                    }
                } else if (incidencia!.status === 'Resolvido' || incidencia!.status === 'Fechado') {
                    newIncidentStatus = 'Aberto';
                }
            }

            if (newIncidentStatus !== incidencia!.status) {
                const isResolving = newIncidentStatus === 'Resolvido';
                const payload: any = {
                    status: newIncidentStatus,
                    data_fechamento: isResolving ? new Date().toISOString() : null
                };

                await updateIncidencia(incidencia!.id, payload);
                setIncidencia(prev => prev ? { ...prev, ...payload } : null);
                await addLog(incidencia!.id, t('incidencias.logs.auto_status_change', { status: newIncidentStatus }), 'Sistema');
            }

            // Sync with backend at the end to guarantee latest state
            const updatedTasks = await listTarefas(incidencia!.id);
            setTarefas(updatedTasks);
            const updatedLogs = await listLogs(incidencia!.id);
            setLogs(updatedLogs);
            toast.success(t('incidencias.messages.task_status_updated', { status: newStatus }));

        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.task_status_error'));
        }
    };

    const handleSaveIncidenciaEdit = async () => {
        if (!incidencia) return;
        try {
            await updateIncidencia(incidencia.id, editForm);

            // If the user changed the department in the top-level edit, update the primary task
            if (editForm.departamento && tarefas.length > 0 && tarefas[0].departamento !== editForm.departamento) {
                await updateTarefa(tarefas[0].id, { departamento: editForm.departamento } as any);
                setTarefas(tarefas.map((t, i) => i === 0 ? { ...t, departamento: editForm.departamento } : t));
            }

            setIncidencia({ ...incidencia, ...editForm } as any);
            setIsEditingIncidencia(false);
            toast.success(t('incidencias.messages.update_success'));
            await addLog(incidencia.id, t('incidencias.logs.manual_edit'), user?.email || 'Sistema');
            const updatedLogs = await listLogs(incidencia.id);
            setLogs(updatedLogs);
        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.update_error'));
        }
    };

    const handleUpdateEvidence = async (taskId: string, evidence: string) => {
        try {
            await updateTarefa(taskId, { evidencia: evidence });
            setTarefas(tarefas.map(t => t.id === taskId ? { ...t, evidencia: evidence } : t));
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignToMe = async (taskId: string) => {
        if (!user || !user.email) return;
        try {
            await assignTarefa(taskId, user.email);
            setTarefas(tarefas.map(t => t.id === taskId ? { ...t, responsavel_email: user.email } : t));
            toast.success(t('incidencias.messages.task_assigned_success'));
        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.task_assigned_error'));
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incidencia || !user) return;
        try {
            if (newTask.id) {
                // Edit Task Mode
                await updateTarefa(newTask.id, {
                    titulo: newTask.titulo,
                    departamento: newTask.departamento,
                    prazo: newTask.prazo || undefined,
                    responsavel_email: newTask.responsavel_email || null
                } as any);
                toast.success(t('incidencias.messages.task_update_success'));
            } else {
                // Create Task Mode
                await createTarefa({
                    incidencia_id: incidencia.id,
                    titulo: newTask.titulo,
                    departamento: newTask.departamento,
                    prazo: newTask.prazo || undefined,
                    status: 'Pendente',
                    ordem: tarefas.length + 1,
                    created_by: user.id,
                    responsavel_email: newTask.responsavel_email || undefined
                });
                toast.success(t('incidencias.messages.task_create_success'));
            }
            setIsTaskModalOpen(false);
            setNewTask({ titulo: '', departamento: 'Operações', prazo: '', responsavel_email: '' });
            const updatedTasks = await listTarefas(incidencia.id);
            setTarefas(updatedTasks);
        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.task_save_error'));
        }
    };

    const handleEditTask = (task: IncidenciaTarefa) => {
        setNewTask({
            id: task.id,
            titulo: task.titulo,
            departamento: task.departamento || 'Operações',
            prazo: task.prazo ? task.prazo.split('T')[0] : '',
            responsavel_email: task.responsavel_email || ''
        });
        setIsTaskModalOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm(t('incidencias.detail.confirm_delete_task') || 'Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await deleteTarefa(taskId);
            setTarefas(tarefas.filter(t => t.id !== taskId));
            toast.success(t('incidencias.messages.task_delete_success'));
        } catch (error) {
            console.error(error);
            toast.error(t('incidencias.messages.task_delete_error'));
        }
    };

    const calculateDuration = (start?: string, end?: string) => {
        if (!start || !end) return '-';
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHrs > 24) return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
        if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
        return `${diffMins}m`;
    };

    const getOverdueLabel = (dueAt?: string, status?: string) => {
        if (!dueAt || status === 'Concluida') return null;
        const now = new Date();
        const due = new Date(dueAt);
        if (due < now) {
            const diffMs = now.getTime() - due.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);

            if (diffDays > 0) return `${diffDays}d ${diffHrs % 24}h`;
            if (diffHrs > 0) return `${diffHrs}h ${diffMins % 60}m`;
            return `${diffMins}m`;
        }
        return null;
    };

    const formatUserName = (name: string) => {
        if (!name) return 'Sistema';
        if (name.includes('@')) {
            const part = name.split('@')[0];
            return part.charAt(0).toUpperCase() + part.slice(1);
        }
        return name;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>;
    if (!incidencia) return <div className="p-8 text-center text-red-500">{t('incidencias.detail.not_found')}</div>;

    const getPriorityColor = (p: string) => {
        // Translate priority for check
        const critico = t('incidencias.impacto.Crítico');
        const alto = t('incidencias.impacto.Alto');

        // Check against mock values (PT) or translated
        if (p === 'Critica' || p === 'Crítico' || p === critico) return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900';
        if (p === 'Alta' || p === 'Alto' || p === alto) return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    };

    const statusDisplay = t(`incidencias.status.${incidencia.status}` as any) || incidencia.status;
    const impactDisplay = t(`incidencias.impacto.${incidencia.impacto}` as any) || incidencia.impacto;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                <ArrowLeft size={16} className="mr-1" /> {t('incidencias.detail.back')}
            </button>

            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">#{incidencia.id.substring(0, 8)}...</span>
                            {isEditingIncidencia ? (
                                <input
                                    type="text"
                                    className="text-2xl font-bold bg-white dark:bg-slate-900 border border-blue-400 rounded px-2 py-1 w-full max-w-xl outline-none"
                                    value={editForm.titulo || ''}
                                    onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{incidencia.titulo}</h1>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {isEditingIncidencia ? (
                                <select
                                    className="px-2 py-1 rounded text-xs font-bold border outline-none bg-white dark:bg-slate-900"
                                    value={editForm.impacto || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, impacto: e.target.value as any }))}
                                >
                                    <option value="Baixo">Baixo</option>
                                    <option value="Médio">Médio</option>
                                    <option value="Alto">Alto</option>
                                    <option value="Crítico">Crítico</option>
                                </select>
                            ) : (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(incidencia.impacto)}`}>
                                    {impactDisplay}
                                </span>
                            )}

                            {isEditingIncidencia ? (
                                <select
                                    className="px-2 py-1 rounded text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 outline-none"
                                    value={editForm.status || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                                >
                                    <option value="Aberto">Aberto</option>
                                    <option value="Em Andamento">Em Andamento</option>
                                    <option value="Resolvido">Resolvido</option>
                                    <option value="Fechado">Fechado</option>
                                </select>
                            ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                    {statusDisplay}
                                </span>
                            )}

                            {isEditingIncidencia ? (
                                <select
                                    className="px-2 py-1 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 outline-none"
                                    value={editForm.tipo || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                                >
                                    <option value="Geral">Geral</option>
                                    <option value="Falta">Falta</option>
                                    <option value="Acidente">Acidente</option>
                                    <option value="Qualidade">Qualidade</option>
                                    <option value="Segurança">Segurança</option>
                                    <option value="Reemplazo">Reemplazo</option>
                                    <option value="Task">Task</option>
                                </select>
                            ) : (
                                incidencia.tipo && <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{incidencia.tipo}</span>
                            )}

                            {isEditingIncidencia && tarefas.length > 0 && (
                                <select
                                    className="px-2 py-1 rounded text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-400 dark:border-slate-500 outline-none"
                                    title="Departamento Impactado / Responsável"
                                    value={(editForm as any).departamento || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, departamento: e.target.value }) as any)}
                                >
                                    {departments.length > 0 ? (
                                        departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))
                                    ) : (
                                        <option value="">{t('common.loading')}</option>
                                    )}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400 flex flex-col items-end gap-2">
                        {isEditingIncidencia ? (
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditingIncidencia(false); setEditForm({}); }} className="text-slate-400 hover:text-slate-600 px-2 py-1">{t('common.cancel')}</button>
                                <button onClick={handleSaveIncidenciaEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm text-xs font-bold">{t('common.save')}</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setEditForm({
                                        titulo: incidencia.titulo,
                                        descricao: incidencia.descricao,
                                        impacto: incidencia.impacto,
                                        tipo: incidencia.tipo,
                                        status: incidencia.status,
                                        departamento: tarefas.length > 0 ? tarefas[0].departamento : undefined
                                    } as any);
                                    setIsEditingIncidencia(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-xs font-medium bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                            >
                                <Edit size={12} /> {t('common.edit') || "Editar"}
                            </button>
                        )}
                        <div className="flex items-center justify-end gap-1 mb-1 mt-1">
                            <Calendar size={14} />
                            {t('incidencias.detail.open')}: {new Date(incidencia.data_abertura).toLocaleDateString()}
                        </div>
                        {incidencia.data_fechamento && (
                            <div className="flex items-center justify-end gap-1 text-emerald-600">
                                <CheckCircle size={14} />
                                {t('incidencias.detail.closed')}: {new Date(incidencia.data_fechamento).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* MANAGEMENT SUMMARY BAR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 my-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                            <User size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Atribuído A</div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {(incidencia.atribuido_a_email || (tarefas.length > 0 && tarefas[0].responsavel_email)) ? (
                                    incidencia.atribuido_a_email || tarefas[0].responsavel_email
                                ) : (
                                    <span className="text-slate-400 italic">Não atribuído</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Briefcase size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Departamento</div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {tarefas.length > 0 && tarefas[0].departamento ? tarefas[0].departamento : 'Geral'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <User size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Criado Por (Gestor)</div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {incidencia.criado_por_nome || 'N/A'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Clock size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Progresso</div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {incidencia.progresso_pct || 0}% ({incidencia.tarefas_concluidas || 0}/{incidencia.tarefas_totais || tarefas.length})
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTEXT CARD INTEGRATION */}
                <div className="mb-4">
                    <ContextCard context={incidencia.context} />
                </div>

                {(incidencia.descricao || isEditingIncidencia) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        {isEditingIncidencia ? (
                            <textarea
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-blue-400 rounded px-3 py-2 text-sm outline-none resize-y min-h-[80px]"
                                value={editForm.descricao || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                                placeholder="Descrição detalhada..."
                            />
                        ) : (
                            (() => {
                                let desc = incidencia.descricao || '';
                                let atts: TaskAttachment[] = [];
                                if (desc.trim().startsWith('{')) {
                                    try {
                                        const parsed = JSON.parse(desc);
                                        desc = parsed.description || '';
                                        atts = parsed.attachments || [];
                                    } catch {
                                        desc = incidencia.descricao || '';
                                    }
                                }
                                return (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200">
                                            <RichTextRenderer content={desc} />
                                        </div>
                                        {atts.length > 0 && (
                                            <FileAttachmentUploader attachments={atts} onChange={() => {}} readOnly />
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Checklist Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <CheckSquare className="text-blue-600 dark:text-blue-500" size={20} />
                            {t('incidencias.detail.checklist')}
                        </h3>
                        <button
                            onClick={() => { setNewTask({ titulo: '', departamento: 'Operações', prazo: '' }); setIsTaskModalOpen(true); }}
                            className="text-xs flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <Plus size={14} /> {t('incidencias.detail.add_task')}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden transition-colors">
                        {tarefas.length === 0 && <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">{t('incidencias.detail.no_tasks')}</div>}

                        {tarefas.map((task) => {
                            const overdueLabel = getOverdueLabel(task.prazo, task.status);
                            const duration = task.status === 'Concluida' ? calculateDuration(task.started_at, task.completed_at) : null;
                            const taskStatusDisplay = t(`tasks.status.${task.status}` as any) || task.status;

                            return (
                                <div key={task.id} className={`p-4 transition-colors ${task.status === 'Concluida' ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}>
                                    <div className="flex items-start gap-3">
                                        {/* Action Button */}
                                        <div className="flex flex-col items-center gap-1 mt-0.5">
                                            <button
                                                onClick={() => handleAdvanceStatus(task)}
                                                className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${task.status === 'Concluida'
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : task.status === 'Em Andamento'
                                                        ? 'bg-blue-100 border-blue-400 text-blue-600 animate-pulse'
                                                        : 'border-slate-300 hover:border-blue-400 text-slate-300 hover:text-blue-500'
                                                    }`}
                                                title={taskStatusDisplay}
                                            >
                                                {task.status === 'Concluida' && <CheckCircle size={14} />}
                                                {task.status === 'Em Andamento' && <Play size={10} fill="currentColor" />}
                                            </button>
                                            {task.status !== 'Pendente' && (
                                                <button
                                                    onClick={() => handleAdvanceStatus(task, true)}
                                                    className="text-slate-300 hover:text-amber-500 transition-colors"
                                                    title="Reverter Status"
                                                >
                                                    <ArrowLeft size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-medium text-sm flex items-center gap-2 ${task.status === 'Concluida' ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {task.titulo}
                                                            {overdueLabel && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] rounded font-bold uppercase no-underline">
                                                                    <AlertCircle size={10} />
                                                                    {t('tasks.vencida_ha', { days: '' }).replace('ha  dias', '').replace('há  dias', '')} {overdueLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(user?.id === task.created_by || user?.isSuperAdmin) && (
                                                            <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 hover:opacity-100 transition-opacity ml-2">
                                                                <button onClick={() => handleEditTask(task)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Editar Tarefa">
                                                                    <Edit size={12} />
                                                                </button>
                                                                <button onClick={() => handleDeleteTask(task.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir Tarefa">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {duration && (
                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} /> Tempo: {duration}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Assignment Logic */}
                                                {task.status !== 'Concluida' && (
                                                    <div className="ml-2 flex-shrink-0">
                                                        {task.responsavel_email ? (
                                                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900" title={`${t('tasks.assigned_to')}: ${task.responsavel_email}`}>
                                                                <User size={10} />
                                                                {task.responsavel_email.split('@')[0]}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleAssignToMe(task.id)}
                                                                className="text-[10px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-2 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors uppercase font-bold"
                                                            >
                                                                {t('tasks.actions.assumir')}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                                                    {task.departamento || 'Geral'}
                                                </span>
                                                {task.status === 'Em Andamento' && (
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                                                        <Play size={10} /> {taskStatusDisplay}
                                                    </span>
                                                )}
                                                {task.prazo && (
                                                    <span className={`flex items-center gap-1 ${overdueLabel ? 'text-red-500 dark:text-red-400 font-bold' : ''}`}>
                                                        <Calendar size={10} /> {new Date(task.prazo).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Evidence Field */}
                                            {task.status !== 'Concluida' && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <FileText size={12} className="text-slate-400 dark:text-slate-500" />
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none text-xs text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 transition-colors"
                                                        placeholder="Evidência (link/texto)..."
                                                        defaultValue={task.evidencia || ''}
                                                        onBlur={(e) => handleUpdateEvidence(task.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateEvidence(task.id, e.currentTarget.value);
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {task.evidencia && task.status === 'Concluida' && (
                                                <div className="mt-1 text-xs text-slate-500 italic flex items-center gap-1">
                                                    <FileText size={10} /> {task.evidencia}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Timeline / Logs Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <MessageSquare className="text-blue-600 dark:text-blue-500" size={20} />
                        {t('incidencias.detail.timeline')}
                    </h3>

                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] transition-colors">

                        {/* 1. RICH TEXT INPUT AREA (Top) */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors z-10 relative">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all">
                                {/* Pseud-Toolbar */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-400">
                                    <div className="flex gap-1">
                                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors" title="Bold"><span className="font-bold text-xs">B</span></button>
                                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors italic" title="Italic"><span className="font-serif text-xs">I</span></button>
                                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors underline" title="Underline"><span className="underline text-xs">U</span></button>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <span className="text-xs text-slate-400 font-medium">Nova Anotação / Atualização</span>
                                </div>
                                <textarea
                                    className="w-full bg-transparent p-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none min-h-[120px] resize-none"
                                    placeholder={t('incidencias.detail.comment_placeholder')}
                                    value={newLogText}
                                    onChange={(e) => setNewLogText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            handleSendLog();
                                        }
                                    }}
                                />
                                <div className="flex justify-between items-center px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-lg">
                                    <span className="text-[10px] text-slate-400">Ctrl + Enter para enviar</span>
                                    <button
                                        onClick={handleSendLog}
                                        disabled={!newLogText.trim()}
                                        className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Send size={14} /> Registrar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. SCROLLABLE LOG LIST (Bottom) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/30">
                            {logs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60">
                                    <MessageSquare size={32} className="mb-2" />
                                    <div className="text-sm">{t('incidencias.detail.no_logs')}</div>
                                </div>
                            )}

                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3 group">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${log.usuario === 'Sistema' ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'}`}>
                                            {log.usuario ? log.usuario.substring(0, 2).toUpperCase() : 'SY'}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {formatUserName(log.usuario || 'Sistema')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{new Date(log.criado_em).toLocaleString()}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 p-3 rounded-tr-lg rounded-br-lg rounded-bl-lg shadow-sm border border-slate-100 dark:border-slate-700/50 group-hover:border-slate-200 transition-colors whitespace-pre-wrap leading-relaxed">
                                            {log.mensagem}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm animate-fade-in border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                {newTask.id ? t('incidencias.detail.edit_task_title', 'Editar Tarefa') : t('incidencias.detail.new_task_title')}
                            </h3>
                            <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('incidencias.detail.task_title')}</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                    value={newTask.titulo}
                                    onChange={e => setNewTask({ ...newTask, titulo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.departamento')}</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                                    value={newTask.departamento}
                                    onChange={e => setNewTask({ ...newTask, departamento: e.target.value })}
                                    required
                                >
                                    {departments.length > 0 ? (
                                        departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))
                                    ) : (
                                        <option value="">{t('common.loading')}</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('incidencias.detail.deadline')}</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                    value={newTask.prazo}
                                    onChange={e => setNewTask({ ...newTask, prazo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('incidencias.detail.assign_to')}</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                                    value={newTask.responsavel_email || ''}
                                    onChange={e => setNewTask({ ...newTask, responsavel_email: e.target.value })}
                                >
                                    <option value="">{t('incidencias.detail.unassigned')}</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.correoempresarial}>{emp.nombrecompleto}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium w-full flex justify-center items-center gap-2 transition-colors">
                                    <Save size={16} /> {t('incidencias.detail.save_task')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
