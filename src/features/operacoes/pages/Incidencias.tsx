import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listIncidencias, createIncidencia, getActivePlaybooks, listDepartments, deleteIncidencia } from '../services/incidencias';
import { integrationFacade } from '../services/integration/integrationFacade';
import { contextBuilder } from '../services/context/contextBuilder';
import type { Incidencia, IncidenciaImpacto, Playbook, IncidentContext } from '../services/types';
import {
    Search, AlertTriangle, ChevronRight, X, User, Briefcase, Settings,
    Database, Check, Loader2, Trash2, Zap, FileText
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { AsyncSelect } from '../components/ui/AsyncSelect';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { FileAttachmentUploader, TaskAttachment } from '../components/ui/FileAttachmentUploader';
import { useAuth } from '../contexts/AuthContext';

import { supabaseEmployeeService } from '../services/db/SupabaseEmployeeService';
import type { Employee } from '../services/db/SupabaseEmployeeService';

export const Incidencias: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'resumen' | 'incidencias' | 'tarefas'>('incidencias');

    // Auth State - syncing with context
    // const [currentUser, setCurrentUser] = useState(MOCK_USERS[0]); // REMOVED
    // const [currentDept, setCurrentDept] = useState('Operações'); // REMOVED

    // Data & Filters
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Incidencia[]>([]);
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [impactoFilter, setImpactoFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'task' | 'process'>('process');
    const [creationMode, setCreationMode] = useState<'manual' | 'origin'>('manual');
    const [quickContextType, setQuickContextType] = useState<'none' | 'client' | 'worker' | 'pedido'>('none');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update time every minute to keep SLAs fresh without performance impact
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Common Fields
    const [baseForm, setBaseForm] = useState({
        titulo: '',
        descricao: '',
        impacto: 'Médio' as IncidenciaImpacto,
        tipo: 'Geral',
        playbook_id: '',
        departamento: 'Operações', // Default for Quick Task
        sla: 1, // Default for Quick Task
        slaUnit: 'days' as 'hours' | 'days',
        scheduled_for: '', // Agendado Para (opcional)
        responsavel_email: '', // Responsável pela tarefa
        attachments: [] as TaskAttachment[]
    });

    // Mode A: Manual Selections
    const [manualSel, setManualSel] = useState<{
        client: any | null;
        pedido: any | null;
        worker: any | null;
        obra: any | null;
    }>({ client: null, pedido: null, worker: null, obra: null });

    // Mode B: Origin Selections
    const [originType, setOriginType] = useState<'reemplazo' | 'reubicacion'>('reemplazo');
    const [originItem, setOriginItem] = useState<any | null>(null);
    const [previewContext, setPreviewContext] = useState<IncidentContext | null>(null);
    const [loadingContext, setLoadingContext] = useState(false);

    // Load Initial Data
    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'incidencias' || activeTab === 'resumen') {
                const filters: any = {};
                if (statusFilter) filters.status = statusFilter;
                if (impactoFilter) filters.prioridade = impactoFilter;
                let res = await listIncidencias(filters);

                // --- ADMIN DATA ISOLATION ---
                if (user && !user.isSuperAdmin && user.isAdmin) {
                    const managed = user.profile?.managed_departments || [];
                    res = res.filter(inc => {
                        // Allow if admin created the incident
                        if (inc.criado_por_nome === user.email) return true;

                        // Check if the incident involves any managed department
                        const involved = inc.departamentos_envolvidos || [];
                        if (involved.length === 0) return false;

                        return involved.some(d => managed.includes(d));
                    });
                }

                setData(res);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        getActivePlaybooks().then(setPlaybooks);
        listDepartments().then(setDepartments);
        supabaseEmployeeService.list().then(setEmployees);
    }, [activeTab, statusFilter, impactoFilter, user]);

    // Handle Origin Item Selection
    const handleOriginSelect = async (item: any) => {
        setOriginItem(item);
        if (!item) {
            setPreviewContext(null);
            return;
        }

        setLoadingContext(true);
        try {
            let ctx: IncidentContext;
            if (originType === 'reemplazo') {
                ctx = await contextBuilder.buildContextFromReemplazo(item.sp_id);
                setBaseForm(prev => ({ ...prev, titulo: `Incidência em Reemplazo ${item.codigo || item.sp_id}` }));
            } else {
                ctx = await contextBuilder.buildContextFromReubicacion(item.sp_id);
                setBaseForm(prev => ({ ...prev, titulo: `Incidência em Reubicación ${item.codigo || item.sp_id}` }));
            }
            setPreviewContext(ctx);
        } catch (e) {
            console.error(e);
            alert('Erro ao construir contexto.');
        } finally {
            setLoadingContext(false);
        }
    };

    // Handle Scheduled For Change
    const handleScheduledDateChange = (val: string) => {
        const updates: any = { scheduled_for: val };

        if (val) {
            const targetDate = new Date(val + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                updates.sla = diffDays === 0 ? 1 : diffDays;
                updates.slaUnit = 'days';
            }
        }

        setBaseForm(prev => ({ ...prev, ...updates }));
    };

    const handleDeleteIncidencia = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Evitar navegar p/ detalhe da incidência
        if (!window.confirm('Tem certeza que deseja excluir toda essa incidência e suas tarefas?')) return;
        setLoading(true);
        try {
            await deleteIncidencia(id);
            await loadData();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir incidência');
        } finally {
            setLoading(false);
        }
    };

    // Create Action
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalContext: IncidentContext;
            let finalOriginType = 'manual';

            if (creationMode === 'origin') {
                if (!previewContext) {
                    alert('Selecione uma origem válida.');
                    setLoading(false);
                    return;
                }
                finalContext = previewContext;
                finalOriginType = originType;
            } else {
                // Build Manual Context (Shared logic for Process Manual & Quick Task)
                finalContext = {
                    origin: { system: 'supabase', table: 'incidents', label: 'Manual Creation' },
                    extra: {}
                };

                // Use manualSel for both modes
                if (manualSel.client) {
                    finalContext.client = {
                        name: manualSel.client.name,
                        sp_id: manualSel.client.sp_id,
                        link: { system: 'sharepoint', table: 'sp_clients', sp_id: manualSel.client.sp_id, label: manualSel.client.name },
                        email: manualSel.client.email,
                        phone: manualSel.client.phone
                    };
                    finalContext.company = { name: manualSel.client.company };
                }
                if (manualSel.pedido) {
                    finalContext.pedido = {
                        ref: manualSel.pedido.codigo,
                        sp_id: manualSel.pedido.sp_id,
                        link: { system: 'sharepoint', table: 'sp_pedidos', sp_id: manualSel.pedido.sp_id, label: manualSel.pedido.codigo }
                    };
                }
                if (manualSel.worker) {
                    finalContext.worker = {
                        name: manualSel.worker.nome,
                        sp_id: manualSel.worker.sp_id,
                        link: { system: 'sharepoint', table: 'sp_workers', sp_id: manualSel.worker.sp_id, label: manualSel.worker.nome },
                        email: manualSel.worker.email,
                        phone: manualSel.worker.phone
                    };
                }
                if (manualSel.obra) {
                    finalContext.obra = {
                        name: manualSel.obra.nome,
                        sp_id: manualSel.obra.sp_id,
                        link: { system: 'sharepoint', table: 'sp_obras', sp_id: manualSel.obra.sp_id, label: manualSel.obra.nome }
                    };
                }
            }

            const isQuickTask = modalType === 'task';
            const finalTipo = isQuickTask ? 'Task' : baseForm.tipo;

            const finalDescricaoPayload = isQuickTask
                ? JSON.stringify({ description: baseForm.descricao, attachments: baseForm.attachments })
                : baseForm.descricao;

            await createIncidencia({
                titulo: baseForm.titulo,
                descricao: finalDescricaoPayload,
                prioridade: baseForm.impacto as any,
                impacto: baseForm.impacto,
                tipo: finalTipo,
                status: 'Aberto',
                origem_tipo: finalOriginType,
                origem_criacao: 'manual',
                criado_por_nome: user?.email || 'Unknown',
                playbook_id: baseForm.playbook_id || undefined,
                context: finalContext,
                // Quick Task Fields
                departamento: isQuickTask ? baseForm.departamento : undefined,
                scheduled_for: isQuickTask && baseForm.scheduled_for ? new Date(baseForm.scheduled_for).toISOString() : undefined,
                sla: isQuickTask ? baseForm.sla : undefined,
                prazo: isQuickTask
                    ? new Date(Date.now() + (baseForm.sla * (baseForm.slaUnit === 'hours' ? 3600000 : 86400000))).toISOString()
                    : undefined,
                responsavel_email: baseForm.responsavel_email
            });

            setIsModalOpen(false);
            resetModal();
            await loadData();

        } catch (err) {
            console.error(err);
            alert('Erro ao criar incidência');
        } finally {
            setLoading(false);
        }
    };

    const resetModal = () => {
        setBaseForm({ titulo: '', descricao: '', impacto: 'Médio', tipo: 'Geral', playbook_id: '', departamento: 'Operações', sla: 1, slaUnit: 'days', scheduled_for: '', responsavel_email: '', attachments: [] });
        setManualSel({ client: null, pedido: null, worker: null, obra: null });
        setOriginItem(null);
        setPreviewContext(null);
        setQuickContextType('none');
    };

    // Helper styles


    const filteredIncidencias = data.filter(item => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return item.titulo.toLowerCase().includes(searchLower) ||
                item.origem_codigo?.toLowerCase().includes(searchLower) ||
                item.cliente?.toLowerCase().includes(searchLower);
        }
        return true;
    });

    return (
        <div className="space-y-6 animate-fade-in relative font-inter">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('incidencias.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie e monitore todas as incidências operacionais.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <User size={14} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {user?.email}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setModalType('task'); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all hover:shadow-md"
                        >
                            <Zap size={16} />
                            <span className="hidden md:inline">{t('incidencias.btn_quick_task') || 'Nova Tarefa'}</span>
                        </button>
                        <button
                            onClick={() => { setModalType('process'); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
                        >
                            <FileText size={16} />
                            <span className="hidden md:inline">{t('incidencias.btn_new_process') || 'Iniciar Processo'}</span>
                        </button>
                    </div>
                    <button onClick={() => navigate('/admin/playbooks')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title={t('menu.playbooks')}>
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Pivot Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="flex space-x-6">
                    {[
                        { id: 'resumen', label: t('incidencias.tabs.resumo') },
                        { id: 'incidencias', label: t('incidencias.tabs.lista') },
                        { id: 'tarefas', label: t('incidencias.tabs.fila') }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                py-4 text-sm font-medium border-b-2 transition-all duration-200
                                ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* === ABA RESUMEN === */}
            {activeTab === 'resumen' && (
                <div className="animate-fade-in space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('incidencias.status.Aberto')}s</div>
                                <div className="text-3xl font-bold text-slate-900 mt-2">{data.filter(i => i.status === 'Aberto').length || 0}</div>
                            </div>
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                        </Card>
                        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('incidencias.status.Em Andamento')}</div>
                                <div className="text-3xl font-bold text-slate-900 mt-2">{data.filter(i => i.status === 'Em Andamento').length || 0}</div>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><Loader2 size={24} /></div>
                        </Card>
                        <Card className="p-5 flex items-center justify-between border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('incidencias.status.Resolvido')}</div>
                                <div className="text-3xl font-bold text-slate-900 mt-2">{data.filter(i => i.status === 'Resolvido').length || 0}</div>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><Check size={24} /></div>
                        </Card>
                    </div>
                </div>
            )}

            {/* === ABA INCIDENCIAS (LISTA) === */}
            {activeTab === 'incidencias' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm items-center transition-colors">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={t('incidencias.filters.search_placeholder')}
                                className="w-full bg-transparent pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                        <select className="bg-transparent py-2 px-3 text-sm text-slate-600 font-medium focus:outline-none cursor-pointer hover:text-slate-900 transition-colors"
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">Status: Todos</option>
                            <option value="Aberto">{t('incidencias.status.Aberto')}</option>
                            <option value="Em Andamento">{t('incidencias.status.Em Andamento')}</option>
                            <option value="Concluida">{t('incidencias.status.Resolvido')}</option>
                        </select>
                        <select className="bg-transparent py-2 px-3 text-sm text-slate-600 font-medium focus:outline-none cursor-pointer hover:text-slate-900 transition-colors"
                            value={impactoFilter} onChange={(e) => setImpactoFilter(e.target.value)}>
                            <option value="">Impacto: Todos</option>
                            <option value="Crítico">{t('incidencias.impacto.Crítico')}</option>
                            <option value="Alto">{t('incidencias.impacto.Alto')}</option>
                            <option value="Médio">{t('incidencias.impacto.Médio')}</option>
                        </select>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-20">{t('incidencias.table.id')}</th>
                                    <th className="px-6 py-4 w-40">{t('incidencias.table.status')}</th>
                                    <th className="px-6 py-4">{t('incidencias.table.titulo')}</th>
                                    <th className="px-6 py-4 w-48">{t('incidencias.table.criado_por')}</th>
                                    <th className="px-6 py-4 w-40">{t('incidencias.table.dept_impacto')}</th>
                                    <th className="px-6 py-4 w-40">{t('incidencias.table.progresso')}</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? <tr><td colSpan={7} className="p-12 text-center text-slate-500">{t('common.loading')}</td></tr> :
                                    filteredIncidencias.map((row) => {
                                        const statusDisplay = t(`incidencias.status.${row.status}` as any) || row.status;
                                        const impactDisplay = t(`incidencias.impacto.${row.impacto}` as any) || row.impacto;

                                        return (
                                            <tr key={row.id} onClick={() => navigate(`/operacoes/incidencias/${row.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                                                <td className="px-6 py-4 font-mono text-slate-500 text-xs">#{row.id.substring(0, 6)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <StatusBadge status={statusDisplay} type="status" className="shadow-sm" />
                                                        <StatusBadge status={impactDisplay} type="impact" className="opacity-80" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1 truncate max-w-sm">{row.titulo}</div>
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Briefcase size={12} /> {row.cliente || 'Interno'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-700 font-medium">{row.origem_tipo}</div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><User size={12} /> {row.criado_por_nome || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {row.departamentos_envolvidos?.map((d, i) => (
                                                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{d}</span>
                                                        )) || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-full max-w-[120px]">
                                                        <div className="flex justify-between text-[10px] mb-1.5">
                                                            <span className="font-semibold text-slate-700">{row.progresso_pct || 0}%</span>
                                                            {row.prazo_estimado ? (
                                                                (() => {
                                                                    const deadline = new Date(row.prazo_estimado);
                                                                    const diffMs = deadline.getTime() - currentTime.getTime();
                                                                    const diffMins = Math.floor(diffMs / 60000);
                                                                    const diffHrs = Math.floor(diffMs / 3600000);
                                                                    const diffDays = Math.floor(diffHrs / 24);

                                                                    let timeDisplay = '';
                                                                    let timeColor = 'text-slate-400';

                                                                    if (diffMs < 0) {
                                                                        timeDisplay = 'Atrasado';
                                                                        timeColor = 'text-rose-500 font-bold';
                                                                    } else if (diffHrs < 24) {
                                                                        if (diffHrs < 1) {
                                                                            timeDisplay = `${diffMins}m rest.`;
                                                                            timeColor = 'text-amber-600 font-bold';
                                                                        } else {
                                                                            timeDisplay = `${diffHrs}h rest.`;
                                                                            timeColor = diffHrs < 4 ? 'text-amber-500 font-bold' : 'text-slate-500';
                                                                        }
                                                                    } else {
                                                                        timeDisplay = `${diffDays}d rest.`;
                                                                    }

                                                                    return <span className={timeColor} title={deadline.toLocaleString()}>{timeDisplay}</span>;
                                                                })()
                                                            ) : (
                                                                <span className="text-slate-400">{row.tarefas_concluidas}/{row.tarefas_totais}</span>
                                                            )}
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${row.progresso_pct || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end h-full gap-2">
                                                    {user?.id === row.criado_por_nome && (
                                                        <button
                                                            onClick={(e) => handleDeleteIncidencia(e, row.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                            title="Excluir Incidência"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                {!loading && filteredIncidencias.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center">
                                                <Search size={32} className="text-slate-200 mb-3" />
                                                <p>Nenhuma incidência encontrada com os filtros atuais.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* === ABA TAREFAS === */}
            {
                activeTab === 'tarefas' && (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <p>Use a aba "Gestão Diária" para ver a fila detalhada de tarefas.</p>
                    </div>
                )
            }

            {/* --- CREATE INCIDENT MODAL --- */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
                        <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-colors ${modalType === 'task' ? 'max-w-6xl' : 'max-w-5xl'}`}>

                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${modalType === 'task' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {modalType === 'task' ? <Zap size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    {modalType === 'task' ? t('incidencias.modal_nova_tarefa.title_quick') : t('incidencias.modal_nova_tarefa.title_process')}
                                </h3>
                                <button onClick={() => { setIsModalOpen(false); resetModal(); }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                {modalType === 'process' ? (
                                    <>
                                        {/* Creation Mode Tabs */}
                                        <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
                                            <button
                                                onClick={() => { setCreationMode('manual'); setPreviewContext(null); setOriginItem(null); }}
                                                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${creationMode === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <User size={16} /> Entrada Manual
                                            </button>
                                            <button
                                                onClick={() => { setCreationMode('origin'); setPreviewContext(null); }}
                                                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${creationMode === 'origin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <Database size={16} /> A partir de Origem
                                            </button>
                                        </div>

                                        {/* Mode Specific Inputs */}
                                        <div className="grid grid-cols-12 gap-6 p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                            {creationMode === 'manual' ? (
                                                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <AsyncSelect
                                                        label="Cliente / Empresa"
                                                        placeholder="Buscar cliente..."
                                                        onSearch={(q) => integrationFacade.searchClients(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, client: item }))}
                                                        renderItem={(c) => <div className="font-medium">{c.name} <span className="text-xs text-slate-400 block">{c.company}</span></div>}
                                                        displayValue={manualSel.client?.name}
                                                    />
                                                    <AsyncSelect
                                                        label="Pedido Relacionado"
                                                        placeholder="Buscar pedido..."
                                                        onSearch={(q) => integrationFacade.searchPedidos(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, pedido: item }))}
                                                        renderItem={(p) => <div className="font-medium">{p.codigo} <span className="text-xs text-slate-400 block">{p.status}</span></div>}
                                                        displayValue={manualSel.pedido?.codigo}
                                                    />
                                                    <AsyncSelect
                                                        label="Colaborador"
                                                        placeholder="Buscar worker..."
                                                        onSearch={(q) => integrationFacade.searchWorkers(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, worker: item }))}
                                                        renderItem={(w) => <div className="font-medium">{w.nome} <span className="text-xs text-slate-400 block">{w.documento}</span></div>}
                                                        displayValue={manualSel.worker?.nome}
                                                    />
                                                    <AsyncSelect
                                                        label="Obra / Projeto"
                                                        placeholder="Buscar obra..."
                                                        onSearch={(q) => integrationFacade.searchObras(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, obra: item }))}
                                                        renderItem={(o) => <div className="font-medium">{o.nome} <span className="text-xs text-slate-400 block">{o.codigo}</span></div>}
                                                        displayValue={manualSel.obra?.nome}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Origem</label>
                                                        <select
                                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                                            value={originType}
                                                            onChange={(e) => { setOriginType(e.target.value as any); setOriginItem(null); setPreviewContext(null); }}
                                                        >
                                                            <option value="reemplazo">Reemplazo</option>
                                                            <option value="reubicacion">Reubicación</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <AsyncSelect
                                                            label={`Buscar ${originType === 'reemplazo' ? 'Reemplazo' : 'Reubicación'}`}
                                                            placeholder="Digite código ou ID..."
                                                            onSearch={(q) => originType === 'reemplazo' ? integrationFacade.searchReemplazos(q) : integrationFacade.searchReubicaciones(q)}
                                                            onSelect={handleOriginSelect}
                                                            renderItem={(item) => (
                                                                <div className="flex justify-between">
                                                                    <span className="font-medium">{item.codigo || `Item ${item.sp_id}`}</span>
                                                                    <span className="text-xs text-slate-400">{item.motivo} • {item.status}</span>
                                                                </div>
                                                            )}
                                                            displayValue={originItem?.codigo}
                                                        />
                                                    </div>

                                                    {/* Context Preview */}
                                                    {loadingContext && <div className="col-span-12 text-center text-sm text-slate-500 py-2">Construindo contexto...</div>}
                                                    {previewContext && (
                                                        <div className="col-span-12 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                                                            <div className="font-bold flex items-center gap-1 mb-2"><Check size={14} /> Contexto Identificado</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {previewContext.client && <div>🏢 Cliente: <b>{previewContext.client.name}</b></div>}
                                                                {previewContext.worker && <div>👷 Worker: <b>{previewContext.worker.name}</b></div>}
                                                                {previewContext.pedido && <div>📄 Pedido: <b>{previewContext.pedido.ref}</b></div>}
                                                                {previewContext.obra && <div>🏗️ Obra: <b>{previewContext.obra.name}</b></div>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Common Form Fields */}
                                        <div className="grid grid-cols-12 gap-6">
                                            <div className="col-span-8">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Título do Processo</label>
                                                <input
                                                    type="text" required
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 text-slate-900 dark:text-slate-100 transition-all"
                                                    placeholder="Ex: Falta de EPI na obra X..."
                                                    value={baseForm.titulo}
                                                    onChange={e => setBaseForm({ ...baseForm, titulo: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Playbook (Automação)</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.playbook_id}
                                                    onChange={e => setBaseForm({ ...baseForm, playbook_id: e.target.value })}
                                                >
                                                    <option value="">-- Nenhum --</option>
                                                    {playbooks.map(pb => (
                                                        <option key={pb.id} value={pb.id}>{pb.nome}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-span-12 space-y-4">
                                                <RichTextEditor
                                                    label="Descrição Detalhada / Instruções"
                                                    value={baseForm.descricao}
                                                    onChange={val => setBaseForm({ ...baseForm, descricao: val })}
                                                    placeholder="Descreva o ocorrido com detalhes, passos e instruções..."
                                                    minHeight="180px"
                                                />
                                                <FileAttachmentUploader
                                                    attachments={baseForm.attachments}
                                                    onChange={atts => setBaseForm({ ...baseForm, attachments: atts })}
                                                />
                                            </div>

                                            <div className="col-span-12 md:col-span-4">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Impacto</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.impacto}
                                                    onChange={e => setBaseForm({ ...baseForm, impacto: e.target.value as any })}
                                                >
                                                    <option value="Baixo">Baixo</option>
                                                    <option value="Médio">Médio</option>
                                                    <option value="Alto">Alto</option>
                                                    <option value="Crítico">Crítico</option>
                                                </select>
                                            </div>
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria (Tipo)</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.tipo}
                                                    onChange={e => setBaseForm({ ...baseForm, tipo: e.target.value })}
                                                >
                                                    <option value="Geral">Geral</option>
                                                    <option value="Falta">Falta</option>
                                                    <option value="Acidente">Acidente</option>
                                                    <option value="Qualidade">Qualidade</option>
                                                    <option value="Segurança">Segurança</option>
                                                    <option value="Reemplazo">Reemplazo</option>
                                                </select>
                                            </div>
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Atribuir (Opcional)</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.responsavel_email}
                                                    onChange={(e) => {
                                                        const selectedEmail = e.target.value;
                                                        const userDept = employees.find(emp => emp.correoempresarial === selectedEmail)?.department_name;
                                                        setBaseForm({
                                                            ...baseForm,
                                                            responsavel_email: selectedEmail,
                                                            departamento: userDept || baseForm.departamento
                                                        });
                                                    }}
                                                >
                                                    <option value="">Não atribuir</option>
                                                    {employees.filter(e => e.active && e.correoempresarial).map(emp => (
                                                        <option key={emp.id} value={emp.correoempresarial}>{emp.nombrecompleto}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg flex gap-3">
                                            <Zap className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={20} />
                                            <div className="text-sm text-emerald-800 dark:text-emerald-200">
                                                <p className="font-bold">{t('incidencias.modal_nova_tarefa.title_quick')}</p>
                                                <p className="opacity-90">{t('incidencias.modal_nova_tarefa.desc_quick')}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.context_label')}</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={quickContextType}
                                                    onChange={(e) => {
                                                        setQuickContextType(e.target.value as any);
                                                        setManualSel({ client: null, pedido: null, worker: null, obra: null }); // Reset select
                                                    }}
                                                >
                                                    <option value="none">{t('incidencias.modal_nova_tarefa.context_general')}</option>
                                                    <option value="client">{t('incidencias.modal_nova_tarefa.context_client')}</option>
                                                    <option value="worker">{t('incidencias.modal_nova_tarefa.context_worker')}</option>
                                                    <option value="pedido">{t('incidencias.modal_nova_tarefa.context_order')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                {quickContextType === 'client' && (
                                                    <AsyncSelect
                                                        label={t('incidencias.modal_nova_tarefa.search_client')}
                                                        placeholder={t('incidencias.modal_nova_tarefa.search_client_placeholder')}
                                                        onSearch={(q) => integrationFacade.searchClients(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, client: item }))}
                                                        renderItem={(c) => <div className="font-medium">{c.name}</div>}
                                                        displayValue={manualSel.client?.name}
                                                    />
                                                )}
                                                {quickContextType === 'worker' && (
                                                    <AsyncSelect
                                                        label={t('incidencias.modal_nova_tarefa.search_worker')}
                                                        placeholder={t('incidencias.modal_nova_tarefa.search_worker_placeholder')}
                                                        onSearch={(q) => integrationFacade.searchWorkers(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, worker: item }))}
                                                        renderItem={(w) => <div className="font-medium">{w.nome}</div>}
                                                        displayValue={manualSel.worker?.nome}
                                                    />
                                                )}
                                                {quickContextType === 'pedido' && (
                                                    <AsyncSelect
                                                        label={t('incidencias.modal_nova_tarefa.search_order')}
                                                        placeholder={t('incidencias.modal_nova_tarefa.search_order_placeholder')}
                                                        onSearch={(q) => integrationFacade.searchPedidos(q)}
                                                        onSelect={(item) => setManualSel(prev => ({ ...prev, pedido: item }))}
                                                        renderItem={(p) => <div className="font-medium">{p.codigo}</div>}
                                                        displayValue={manualSel.pedido?.codigo}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.what_needs_to_be_done')}</label>
                                            <input
                                                type="text" required
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 text-slate-900 dark:text-slate-100 transition-all"
                                                placeholder={t('incidencias.modal_nova_tarefa.what_needs_to_be_done_placeholder')}
                                                value={baseForm.titulo}
                                                onChange={e => setBaseForm({ ...baseForm, titulo: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.department')}</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.departamento}
                                                    onChange={(e) => setBaseForm({ ...baseForm, departamento: e.target.value })}
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
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.priority')}</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.impacto}
                                                    onChange={(e) => setBaseForm({ ...baseForm, impacto: e.target.value as any })}
                                                >
                                                    <option value="Baixo">{t('incidencias.impacto.Baixo')}</option>
                                                    <option value="Médio">{t('incidencias.impacto.Médio')}</option>
                                                    <option value="Alto">{t('incidencias.impacto.Alto')}</option>
                                                    <option value="Crítico">{t('incidencias.impacto.Crítico')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.scheduled_for')}</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 text-slate-900 dark:text-slate-100 transition-all"
                                                    value={baseForm.scheduled_for}
                                                    onChange={(e) => handleScheduledDateChange(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('incidencias.modal_nova_tarefa.sla_deadline')}</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number" min="1" max="100"
                                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 text-slate-900 dark:text-slate-100 transition-all"
                                                        value={baseForm.sla}
                                                        onChange={(e) => setBaseForm({ ...baseForm, sla: Number(e.target.value) })}
                                                    />
                                                    <select
                                                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                                                        value={baseForm.slaUnit}
                                                        onChange={(e) => setBaseForm({ ...baseForm, slaUnit: e.target.value as 'hours' | 'days' })}
                                                    >
                                                        <option value="hours">{t('incidencias.modal_nova_tarefa.time_hours')}</option>
                                                        <option value="days">{t('incidencias.modal_nova_tarefa.time_days')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Atribuir (Opcional)</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                                                    value={baseForm.responsavel_email}
                                                    onChange={(e) => {
                                                        const selectedEmail = e.target.value;
                                                        const userDept = employees.find(emp => emp.correoempresarial === selectedEmail)?.department_name;
                                                        setBaseForm({
                                                            ...baseForm,
                                                            responsavel_email: selectedEmail,
                                                            departamento: userDept || baseForm.departamento
                                                        });
                                                    }}
                                                >
                                                    <option value="">Não atribuir</option>
                                                    {employees.filter(e => e.active && e.correoempresarial).map(emp => (
                                                        <option key={emp.id} value={emp.correoempresarial}>{emp.nombrecompleto}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <RichTextEditor
                                                label={t('incidencias.modal_nova_tarefa.additional_details') || "Detalhes Adicionais / Instruções"}
                                                value={baseForm.descricao}
                                                onChange={val => setBaseForm({ ...baseForm, descricao: val })}
                                                placeholder={t('incidencias.modal_nova_tarefa.additional_details_placeholder') || "Digite as instruções e observações..."}
                                                minHeight="180px"
                                            />
                                            <FileAttachmentUploader
                                                attachments={baseForm.attachments}
                                                onChange={atts => setBaseForm({ ...baseForm, attachments: atts })}
                                            />
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsModalOpen(false); resetModal(); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    {t('incidencias.modal_nova_tarefa.btn_cancel')}
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={loading || (creationMode === 'origin' && !previewContext)}
                                    className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    {t('incidencias.modal_nova_tarefa.btn_create')}
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }
        </div >
    );
};
