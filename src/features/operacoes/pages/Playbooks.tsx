import React, { useEffect, useState, useMemo } from 'react';
import {
    ArrowLeft, Plus, Save, Trash2, CheckCircle, FileText, Briefcase,
    Clock, ChevronDown, ArrowUp, ArrowDown, Edit2, X, Lock, ShieldCheck,
    AlertCircle, RefreshCw, Layers, Building2, Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { taskTemplateService } from '../services/mock/taskTemplates.service';
import type { TaskTemplate } from '../types/models';
import { toast } from 'sonner';

export interface DbPlaybook {
    id: string;
    empresa_id: string;
    code: string;
    name: string;
    solicitud_type: string;
    description: string;
    status: 'active' | 'inactive';
    step_count?: number;
}

export interface DbDepartment {
    id: string;
    empresa_id: string;
    code: string;
    name: string;
    status: string;
}

export interface DbPlaybookStep {
    id: string;
    empresa_id: string;
    playbook_id: string;
    department_id: string;
    code: string;
    title: string;
    description: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    default_due_days: number;
    required: boolean;
    sort_order: number;
    blocking: boolean;
    depends_on_step_id: string | null;
    status: 'active' | 'inactive';
    department?: {
        id: string;
        code: string;
        name: string;
    };
}

export const OPERATION_TYPES: { value: string; label: string; badgeColor: string }[] = [
    { value: 'new_order',          label: 'Novo Pedido (Mobilização Inicial)',        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
    { value: 'offboarding',        label: 'Nova Baja (Desligamento de Trabalhador)',  badgeColor: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
    { value: 'replacement',        label: 'Novo Reemplazo (Substituição)',            badgeColor: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
    { value: 'relocation',         label: 'Nova Reubicación (Realocação de Obra)',    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' },
    { value: 'technical_test',     label: 'Nova Prueba (Teste Técnico)',              badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800' },
    { value: 'field_trial',        label: 'Prueba en Obra (Teste Prático em Campo)',  badgeColor: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' },
    { value: 'order_postponement', label: 'Adiamento de Início de Obra',              badgeColor: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
    { value: 'order_pause',        label: 'Pausa de Pedido',                          badgeColor: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
    { value: 'order_extension',    label: 'Prorrogação de Obra',                      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
    { value: 'order_termination',  label: 'Finalização / Desmobilização de Obra',     badgeColor: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    { value: 'order_cancellation', label: 'Cancelamento de Pedido',                   badgeColor: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' },
    { value: 'scope_change',       label: 'Alteração de Escopo / Aditivo',            badgeColor: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' },
    { value: 'incident',           label: 'Incidência Operacional / Falta ou Conduta',badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
];

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800' },
    high:   { label: 'Alta',    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800' },
    normal: { label: 'Normal',  color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' },
    low:    { label: 'Baixa',   color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

export const DEPT_COLORS: Record<string, string> = {
    RH:               'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
    LOGISTICA:        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    DOCUMENTACION:    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
    CONTRATOS:        'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
    FINANCEIRO:       'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    COMERCIAL:        'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
    OPERACOES:        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    SEGURIDAD_SOCIAL: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const PLAYBOOK_ORDER: Record<string, number> = {
    new_order: 1,
    offboarding: 2,
    replacement: 3,
    relocation: 4,
    technical_test: 5,
    field_trial: 6,
    order_postponement: 7,
    order_pause: 8,
    order_extension: 9,
    order_termination: 10,
    order_cancellation: 11,
    scope_change: 12,
    incident: 13,
};

export const Playbooks: React.FC = () => {
    const navigate = useNavigate();
    const { selectedEmpresaId, empresas } = useEmpresa();

    const targetEmpresaId = useMemo(() => {
        if (selectedEmpresaId) return selectedEmpresaId;
        if (empresas && empresas.length > 0) return empresas[0].id;
        return null;
    }, [selectedEmpresaId, empresas]);

    const [playbooks, setPlaybooks] = useState<DbPlaybook[]>([]);
    const [selectedPlaybook, setSelectedPlaybook] = useState<DbPlaybook | null>(null);
    const [steps, setSteps] = useState<DbPlaybookStep[]>([]);
    const [departments, setDepartments] = useState<DbDepartment[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deptFilter, setDeptFilter] = useState<string>('ALL');

    // Playbook details editing
    const [isEditingPlaybook, setIsEditingPlaybook] = useState(false);
    const [editedPlaybook, setEditedPlaybook] = useState<Partial<DbPlaybook>>({});

    // Step add / edit form state
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [stepForm, setStepForm] = useState<{
        title: string;
        description: string;
        department_id: string;
        default_due_days: number;
        priority: 'low' | 'normal' | 'high' | 'urgent';
        blocking: boolean;
        depends_on_step_id: string;
    }>({
        title: '',
        description: '',
        department_id: '',
        default_due_days: 1,
        priority: 'normal',
        blocking: false,
        depends_on_step_id: '',
    });

    useEffect(() => {
        if (targetEmpresaId) {
            loadInitialData(targetEmpresaId);
        }
    }, [targetEmpresaId]);

    useEffect(() => {
        if (selectedPlaybook) {
            loadSteps(selectedPlaybook.id);
            setEditedPlaybook(selectedPlaybook);
            setIsEditingPlaybook(false);
            setDeptFilter('ALL');
            resetStepForm(departments);
        } else {
            setSteps([]);
        }
    }, [selectedPlaybook?.id]);

    const loadInitialData = async (empId: string, preservePlaybookCode?: string) => {
        setLoading(true);
        try {
            const [pbRes, deptRes, tplList] = await Promise.all([
                supabase
                    .schema('core_operacoes')
                    .from('playbooks')
                    .select('*, playbook_steps(id, status)')
                    .eq('empresa_id', empId),
                supabase
                    .schema('core_common')
                    .from('departments')
                    .select('*')
                    .eq('empresa_id', empId)
                    .eq('status', 'active')
                    .order('name', { ascending: true }),
                taskTemplateService.list(),
            ]);

            if (pbRes.error) throw pbRes.error;
            if (deptRes.error) throw deptRes.error;

            const loadedDepts = (deptRes.data || []) as DbDepartment[];
            setDepartments(loadedDepts);
            setTemplates(tplList.filter(t => t.active));

            const mappedPbs: DbPlaybook[] = (pbRes.data || [])
                .map((p: any) => ({
                    id: p.id,
                    empresa_id: p.empresa_id,
                    code: p.code,
                    name: p.name,
                    solicitud_type: p.solicitud_type,
                    description: p.description || '',
                    status: p.status,
                    step_count: (p.playbook_steps || []).filter((s: any) => s.status === 'active').length,
                }))
                .sort((a, b) => {
                    const orderA = PLAYBOOK_ORDER[a.solicitud_type] || 99;
                    const orderB = PLAYBOOK_ORDER[b.solicitud_type] || 99;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.name.localeCompare(b.name);
                });

            setPlaybooks(mappedPbs);

            if (mappedPbs.length > 0) {
                const targetCode = preservePlaybookCode || selectedPlaybook?.code;
                const matched = targetCode ? mappedPbs.find(p => p.code === targetCode) : null;
                setSelectedPlaybook(matched || mappedPbs[0]);
            } else {
                setSelectedPlaybook(null);
            }
        } catch (err: any) {
            console.error('Erro ao carregar playbooks:', err);
            toast.error('Erro ao carregar Playbooks do banco de dados', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const loadSteps = async (playbookId: string) => {
        try {
            const { data, error } = await supabase
                .schema('core_operacoes')
                .from('playbook_steps')
                .select('*, department:department_id(id, code, name)')
                .eq('playbook_id', playbookId)
                .eq('status', 'active')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setSteps((data || []) as DbPlaybookStep[]);
        } catch (err: any) {
            console.error('Erro ao carregar tarefas do playbook:', err);
            toast.error('Erro ao carregar tarefas do playbook', { description: err.message });
        }
    };

    const resetStepForm = (deptsList: DbDepartment[] = departments) => {
        setEditingStepId(null);
        setSelectedTemplateId('');
        setStepForm({
            title: '',
            description: '',
            department_id: deptsList[0]?.id || '',
            default_due_days: 1,
            priority: 'normal',
            blocking: false,
            depends_on_step_id: '',
        });
    };

    const handleCreatePlaybook = async () => {
        if (!targetEmpresaId) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.schema('core_operacoes').rpc('salvar_playbook', {
                payload: {
                    empresa_id: targetEmpresaId,
                    name: 'Novo Playbook Operacional',
                    solicitud_type: 'incident',
                    description: 'Novo fluxo operacional',
                    status: 'inactive',
                    sync_all: true,
                },
            });
            if (error) throw error;
            toast.success('Novo Playbook criado em Modo Análise (Inativo)');
            await loadInitialData(targetEmpresaId, data?.code);
            setIsEditingPlaybook(true);
        } catch (err: any) {
            toast.error('Erro ao criar playbook', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSavePlaybook = async () => {
        if (!selectedPlaybook || !targetEmpresaId) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.schema('core_operacoes').rpc('salvar_playbook', {
                payload: {
                    id: selectedPlaybook.id,
                    empresa_id: targetEmpresaId,
                    code: editedPlaybook.code || selectedPlaybook.code,
                    name: editedPlaybook.name || selectedPlaybook.name,
                    solicitud_type: editedPlaybook.solicitud_type || selectedPlaybook.solicitud_type,
                    description: editedPlaybook.description ?? selectedPlaybook.description,
                    status: editedPlaybook.status || selectedPlaybook.status,
                    sync_all: true,
                },
            });
            if (error) throw error;
            toast.success('Playbook atualizado e sincronizado em todas as empresas!');
            setIsEditingPlaybook(false);
            await loadInitialData(targetEmpresaId, data?.code || selectedPlaybook.code);
        } catch (err: any) {
            toast.error('Erro ao salvar playbook', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePlaybookActive = async (pb: DbPlaybook, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!targetEmpresaId) return;
        const newStatus = pb.status === 'active' ? 'inactive' : 'active';
        setSaving(true);
        try {
            const { error } = await supabase.schema('core_operacoes').rpc('salvar_playbook', {
                payload: {
                    id: pb.id,
                    empresa_id: targetEmpresaId,
                    code: pb.code,
                    name: pb.name,
                    solicitud_type: pb.solicitud_type,
                    description: pb.description,
                    status: newStatus,
                    sync_all: true,
                },
            });
            if (error) throw error;
            toast.success(
                newStatus === 'active'
                    ? `Playbook "${pb.name}" ATIVADO! Novas operações deste tipo gerarão tarefas nos setores.`
                    : `Playbook "${pb.name}" colocado em Modo Análise (Inativo). Nenhuma tarefa será gerada.`
            );
            await loadInitialData(targetEmpresaId, pb.code);
        } catch (err: any) {
            toast.error('Erro ao alterar status do playbook', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleBatchStatus = async (newStatus: 'active' | 'inactive') => {
        if (!targetEmpresaId) return;
        setSaving(true);
        try {
            for (const pb of playbooks) {
                if (pb.status !== newStatus) {
                    await supabase.schema('core_operacoes').rpc('salvar_playbook', {
                        payload: {
                            id: pb.id,
                            empresa_id: targetEmpresaId,
                            code: pb.code,
                            name: pb.name,
                            solicitud_type: pb.solicitud_type,
                            description: pb.description,
                            status: newStatus,
                            sync_all: true,
                        },
                    });
                }
            }
            toast.success(
                newStatus === 'active'
                    ? 'Todos os Playbooks foram ativados!'
                    : 'Todos os Playbooks estão em Modo Análise (nenhuma tarefa automática será gerada).'
            );
            await loadInitialData(targetEmpresaId, selectedPlaybook?.code);
        } catch (err: any) {
            toast.error('Erro ao atualizar status em lote', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find(t => t.id === templateId);
        if (tpl) {
            const matchedDept = departments.find(
                d => d.code.toLowerCase() === tpl.default_department_id?.toLowerCase() ||
                     d.name.toLowerCase().includes(tpl.default_department_id?.toLowerCase() || '')
            );
            setStepForm(prev => ({
                ...prev,
                title: tpl.title,
                department_id: matchedDept?.id || prev.department_id || departments[0]?.id || '',
                default_due_days: tpl.default_sla_days ?? 1,
            }));
        }
    };

    const handleStartEditStep = (step: DbPlaybookStep) => {
        setEditingStepId(step.id);
        setSelectedTemplateId('');
        setStepForm({
            title: step.title,
            description: step.description || '',
            department_id: step.department_id,
            default_due_days: step.default_due_days ?? 1,
            priority: step.priority || 'normal',
            blocking: Boolean(step.blocking),
            depends_on_step_id: step.depends_on_step_id || '',
        });
    };

    const handleSaveStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlaybook || !stepForm.title.trim() || !stepForm.department_id) {
            toast.error('Informe o título da tarefa e o departamento responsável.');
            return;
        }
        setSaving(true);
        try {
            const dept = departments.find(d => d.id === stepForm.department_id);
            const { error } = await supabase.schema('core_operacoes').rpc('salvar_playbook_step', {
                payload: {
                    id: editingStepId || '',
                    playbook_id: selectedPlaybook.id,
                    department_id: stepForm.department_id,
                    department_code: dept?.code || '',
                    title: stepForm.title.trim(),
                    description: stepForm.description.trim(),
                    priority: stepForm.priority,
                    default_due_days: stepForm.default_due_days,
                    blocking: stepForm.blocking,
                    required: true,
                    depends_on_step_id: stepForm.depends_on_step_id || '',
                    sync_all: true,
                },
            });
            if (error) throw error;

            toast.success(editingStepId ? 'Tarefa atualizada no fluxo!' : 'Nova tarefa adicionada ao fluxo!');
            resetStepForm();
            await loadSteps(selectedPlaybook.id);
            if (targetEmpresaId) {
                await loadInitialData(targetEmpresaId, selectedPlaybook.code);
            }
        } catch (err: any) {
            toast.error('Erro ao salvar tarefa do playbook', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStep = async (step: DbPlaybookStep) => {
        if (!confirm(`Remover a tarefa "${step.title}" deste Playbook?`)) return;
        if (!selectedPlaybook) return;
        setSaving(true);
        try {
            const { error } = await supabase.schema('core_operacoes').rpc('remover_playbook_step', {
                p_step_id: step.id,
                p_sync_all: true,
            });
            if (error) throw error;
            toast.success('Tarefa removida do fluxo!');
            if (editingStepId === step.id) resetStepForm();
            await loadSteps(selectedPlaybook.id);
            if (targetEmpresaId) {
                await loadInitialData(targetEmpresaId, selectedPlaybook.code);
            }
        } catch (err: any) {
            toast.error('Erro ao remover tarefa', { description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleReorder = async (fromIndex: number, direction: 'up' | 'down') => {
        if (!selectedPlaybook) return;
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= steps.length) return;

        const reordered = [...steps];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        setSteps(reordered);

        try {
            const orderedCodes = reordered.map(s => s.code);
            const { error } = await supabase.schema('core_operacoes').rpc('reordenar_playbook_steps', {
                p_playbook_id: selectedPlaybook.id,
                p_ordered_step_codes: orderedCodes,
                p_sync_all: true,
            });
            if (error) throw error;
            await loadSteps(selectedPlaybook.id);
        } catch (err: any) {
            toast.error('Erro ao reordenar tarefas', { description: err.message });
            await loadSteps(selectedPlaybook.id);
        }
    };

    const getOperationTypeMeta = (typeVal: string) => {
        return (
            OPERATION_TYPES.find(t => t.value === typeVal) || {
                value: typeVal,
                label: typeVal,
                badgeColor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
            }
        );
    };

    // Department summary counts for current playbook
    const deptSummary = useMemo(() => {
        const counts = new Map<string, { code: string; name: string; count: number }>();
        steps.forEach(s => {
            const code = s.department?.code || 'OPERACOES';
            const name = s.department?.name || 'Operações';
            const cur = counts.get(code) || { code, name, count: 0 };
            cur.count += 1;
            counts.set(code, cur);
        });
        return Array.from(counts.values());
    }, [steps]);

    const filteredSteps = useMemo(() => {
        if (deptFilter === 'ALL') return steps;
        return steps.filter(s => s.department?.code === deptFilter);
    }, [steps, deptFilter]);

    const activePlaybooksCount = playbooks.filter(p => p.status === 'active').length;

    return (
        <div className="space-y-4 h-[calc(100vh-90px)] flex flex-col font-inter">
            {/* Top Header & Analysis Mode Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/operacoes/solicitudes')}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Voltar para Torre de Controle"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                Gerenciador de Playbooks Operacionais
                            </h2>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                <ShieldCheck size={13} /> Banco Real Conectado
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Configure as tarefas automáticas distribuídas para RH, Logística, Documentação, Contratos, Financeiro, Comercial e Operações em cada tipo de operação.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                        activePlaybooksCount === 0
                            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                            : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                    }`}>
                        <AlertCircle size={14} />
                        {activePlaybooksCount === 0 ? (
                            <span><strong>Modo Análise Ativo:</strong> Nenhuma tarefa está sendo gerada automaticamente ({playbooks.length} inativos)</span>
                        ) : (
                            <span><strong>{activePlaybooksCount} de {playbooks.length}</strong> Playbooks ativos gerando tarefas</span>
                        )}
                    </div>

                    {activePlaybooksCount > 0 && (
                        <button
                            onClick={() => handleBatchStatus('inactive')}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 transition-colors"
                        >
                            Pausar Todos (Modo Análise)
                        </button>
                    )}
                    {activePlaybooksCount < playbooks.length && (
                        <button
                            onClick={() => handleBatchStatus('active')}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 transition-colors"
                        >
                            Ativar Todos os Playbooks
                        </button>
                    )}
                    <button
                        onClick={() => targetEmpresaId && loadInitialData(targetEmpresaId, selectedPlaybook?.code)}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Recarregar"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
                {/* Left Sidebar: Playbooks List */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/50">
                        <div>
                            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Layers size={16} className="text-blue-600" />
                                Operações & Playbooks ({playbooks.length})
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Sincronizados para todas as empresas do grupo
                            </p>
                        </div>
                        <button
                            onClick={handleCreatePlaybook}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                        >
                            <Plus size={14} /> Novo
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                        {loading ? (
                            <div className="p-8 text-center text-sm text-slate-400">Carregando playbooks do banco...</div>
                        ) : playbooks.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">Nenhum playbook encontrado.</div>
                        ) : (
                            playbooks.map(pb => {
                                const typeMeta = getOperationTypeMeta(pb.solicitud_type);
                                const isSelected = selectedPlaybook?.id === pb.id;
                                const isActive = pb.status === 'active';

                                return (
                                    <div
                                        key={pb.id}
                                        onClick={() => setSelectedPlaybook(pb)}
                                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                                            isSelected
                                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                                                {pb.name}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleTogglePlaybookActive(pb, e)}
                                                title={isActive ? 'Clique para colocar em Modo Análise (Inativo)' : 'Clique para Ativar geração de tarefas'}
                                                className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                                    isActive
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                                }`}
                                            >
                                                <Power size={10} />
                                                {isActive ? 'ATIVO' : 'EM ANÁLISE'}
                                            </button>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${typeMeta.badgeColor}`}>
                                                {typeMeta.label}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                {pb.step_count ?? 0} tarefas
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Area: Playbook Editor & Departmental Steps */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 overflow-y-auto pr-1 pb-6">
                    {selectedPlaybook && (
                        <>
                            {/* Playbook Metadata Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <FileText className="text-blue-600 dark:text-blue-500" size={20} />
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                                                {selectedPlaybook.name}
                                            </h3>
                                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                                                {selectedPlaybook.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {selectedPlaybook.description || 'Sem descrição configurada.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePlaybookActive(selectedPlaybook)}
                                            disabled={saving}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                selectedPlaybook.status === 'active'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                                            }`}
                                        >
                                            <Power size={14} />
                                            {selectedPlaybook.status === 'active'
                                                ? 'Ativo (Gerando Tarefas nos Setores)'
                                                : 'Em Análise / Inativo (Não Gera Tarefas)'}
                                        </button>

                                        {!isEditingPlaybook ? (
                                            <button
                                                onClick={() => setIsEditingPlaybook(true)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                                            >
                                                <Edit2 size={13} /> Editar Cabeçalho
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={handleSavePlaybook}
                                                    disabled={saving}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 font-semibold shadow-sm"
                                                >
                                                    <Save size={14} /> Salvar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingPlaybook(false);
                                                        setEditedPlaybook(selectedPlaybook);
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isEditingPlaybook && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                Nome do Playbook
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                                                value={editedPlaybook.name ?? ''}
                                                onChange={e => setEditedPlaybook({ ...editedPlaybook, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                Operação Vinculada (Torre de Controle)
                                            </label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                                                value={editedPlaybook.solicitud_type ?? selectedPlaybook.solicitud_type}
                                                onChange={e => setEditedPlaybook({ ...editedPlaybook, solicitud_type: e.target.value })}
                                            >
                                                {OPERATION_TYPES.map(op => (
                                                    <option key={op.value} value={op.value}>
                                                        {op.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                Descrição / Objetivo do Fluxo
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                                                value={editedPlaybook.description ?? ''}
                                                onChange={e => setEditedPlaybook({ ...editedPlaybook, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Department Summary Filter Pills */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1 mr-1">
                                        <Building2 size={13} /> Setores no Fluxo:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setDeptFilter('ALL')}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                            deptFilter === 'ALL'
                                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        Todos ({steps.length})
                                    </button>
                                    {deptSummary.map(d => (
                                        <button
                                            key={d.code}
                                            type="button"
                                            onClick={() => setDeptFilter(deptFilter === d.code ? 'ALL' : d.code)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                                deptFilter === d.code
                                                    ? 'ring-2 ring-blue-500 ' + (DEPT_COLORS[d.code] || 'bg-slate-100 text-slate-700')
                                                    : DEPT_COLORS[d.code] || 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}
                                        >
                                            {d.name}: <strong>{d.count}</strong>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow Tasks List & Form Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Briefcase className="text-blue-600 dark:text-blue-500" size={18} />
                                        Workflow de Tarefas por Departamento ({filteredSteps.length})
                                    </h3>
                                    {deptFilter !== 'ALL' && (
                                        <button
                                            onClick={() => setDeptFilter('ALL')}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            Mostrar todos os setores
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2.5 mb-6">
                                    {filteredSteps.map((step) => {
                                        const realIndex = steps.findIndex(s => s.id === step.id);
                                        const deptCode = step.department?.code || 'OPERACOES';
                                        const deptBadge = DEPT_COLORS[deptCode] || 'bg-slate-100 text-slate-700 border-slate-200';
                                        const prioMeta = PRIORITY_LABELS[step.priority] || PRIORITY_LABELS.normal;
                                        const parentStep = step.depends_on_step_id
                                            ? steps.find(s => s.id === step.depends_on_step_id)
                                            : null;
                                        const parentIndex = parentStep ? steps.findIndex(s => s.id === parentStep.id) + 1 : null;
                                        const isBeingEdited = editingStepId === step.id;

                                        return (
                                            <div
                                                key={step.id}
                                                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                                                    isBeingEdited
                                                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400'
                                                        : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-200 dark:hover:border-blue-800'
                                                }`}
                                            >
                                                {/* Reorder controls */}
                                                <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-700 pt-0.5">
                                                    <button
                                                        type="button"
                                                        disabled={realIndex <= 0 || saving}
                                                        onClick={() => handleReorder(realIndex, 'up')}
                                                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-colors"
                                                        title="Subir ordem"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={realIndex === -1 || realIndex >= steps.length - 1 || saving}
                                                        onClick={() => handleReorder(realIndex, 'down')}
                                                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-colors"
                                                        title="Descer ordem"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>

                                                {/* Step number badge */}
                                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0 mt-0.5">
                                                    {realIndex + 1}
                                                </div>

                                                {/* Step Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                                                            {step.title}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            ({step.code})
                                                        </span>
                                                    </div>

                                                    {step.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                            {step.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${deptBadge}`}>
                                                            <Briefcase size={11} /> {step.department?.name || deptCode}
                                                        </span>

                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                                            <Clock size={11} />
                                                            {step.default_due_days === 0
                                                                ? 'SLA: Imediato (D0)'
                                                                : `SLA: +${step.default_due_days} ${step.default_due_days === 1 ? 'dia' : 'dias'}`}
                                                        </span>

                                                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${prioMeta.color}`}>
                                                            Prioridade: {prioMeta.label}
                                                        </span>

                                                        {step.blocking && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md">
                                                                <Lock size={10} /> Passo Bloqueante
                                                            </span>
                                                        )}

                                                        {parentStep ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-md">
                                                                <Lock size={10} /> Aguarda Passo #{parentIndex}: {parentStep.title}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                                                <CheckCircle size={10} /> Início Imediato (Livre)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Edit & Delete Buttons */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEditStep(step)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Editar tarefa"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteStep(step)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Remover tarefa do fluxo"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredSteps.length === 0 && (
                                        <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                            Nenhuma tarefa encontrada para este filtro.
                                        </div>
                                    )}
                                </div>

                                {/* Add / Edit Step Form */}
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 bg-slate-50/70 dark:bg-slate-800/30 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            {editingStepId ? (
                                                <>
                                                    <Edit2 size={16} className="text-blue-600" />
                                                    Editando Tarefa do Fluxo
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={16} className="text-blue-600" />
                                                    Adicionar Nova Tarefa ao Fluxo (Para um Departamento)
                                                </>
                                            )}
                                        </h4>

                                        {editingStepId && (
                                            <button
                                                type="button"
                                                onClick={() => resetStepForm()}
                                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                                            >
                                                <X size={14} /> Cancelar edição
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={handleSaveStep} className="grid grid-cols-12 gap-3">
                                        {!editingStepId && (
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                    Usar Tarefa Modelo (Opcional)
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 appearance-none"
                                                        value={selectedTemplateId}
                                                        onChange={e => handleTemplateSelect(e.target.value)}
                                                    >
                                                        <option value="">-- Digitar livremente ou escolher modelo --</option>
                                                        {templates.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        <div className={editingStepId ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-5'}>
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                Título da Tarefa *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ex: Retirar trabalhador do alojamento e recolher chaves"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.title}
                                                onChange={e => setStepForm({ ...stepForm, title: e.target.value })}
                                            />
                                        </div>

                                        <div className={editingStepId ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-3'}>
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                Setor / Departamento Responsável *
                                            </label>
                                            <select
                                                required
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.department_id}
                                                onChange={e => setStepForm({ ...stepForm, department_id: e.target.value })}
                                            >
                                                <option value="">-- Selecione o Setor --</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name} ({d.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-12 md:col-span-6">
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                Instrução / Descrição para o Setor (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Detalhe o que a equipe do setor precisa executar..."
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.description}
                                                onChange={e => setStepForm({ ...stepForm, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-span-6 md:col-span-2">
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                SLA (Dias)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="365"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.default_due_days}
                                                onChange={e => setStepForm({ ...stepForm, default_due_days: Number(e.target.value) })}
                                            />
                                        </div>

                                        <div className="col-span-6 md:col-span-2">
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                Prioridade
                                            </label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.priority}
                                                onChange={e => setStepForm({ ...stepForm, priority: e.target.value as any })}
                                            >
                                                <option value="low">Baixa</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">Alta</option>
                                                <option value="urgent">Urgente</option>
                                            </select>
                                        </div>

                                        <div className="col-span-12 md:col-span-2 flex items-end">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 pb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={stepForm.blocking}
                                                    onChange={e => setStepForm({ ...stepForm, blocking: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                                />
                                                <span className="font-medium">Bloqueante</span>
                                            </label>
                                        </div>

                                        <div className="col-span-12 md:col-span-9">
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">
                                                Dependência (Aguardar conclusão de outra tarefa antes de liberar?)
                                            </label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                                value={stepForm.depends_on_step_id}
                                                onChange={e => setStepForm({ ...stepForm, depends_on_step_id: e.target.value })}
                                            >
                                                <option value="">Livre — Liberar imediatamente para o setor assim que a operação for criada</option>
                                                {steps
                                                    .filter(s => s.id !== editingStepId)
                                                    .map((s, idx) => (
                                                        <option key={s.id} value={s.id}>
                                                            Aguardar Passo #{idx + 1}: {s.title} ({s.department?.name || 'Setor'})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className="col-span-12 md:col-span-3 flex items-end">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg h-[36px] hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                                            >
                                                {editingStepId ? (
                                                    <>
                                                        <Save size={15} /> Salvar Alterações
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={16} /> Adicionar ao Fluxo
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
