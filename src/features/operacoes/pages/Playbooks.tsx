import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, CheckCircle, FileText, Briefcase, Clock, ChevronDown, ArrowUp, ArrowDown, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaybooks, savePlaybook } from '../services/incidencias';
import { playbookService } from '../services/mock/playbooks.service'; // Import direct service for versioning
import { incidentService } from '../services/mock/incidents.service'; // Import direct service for usage check
import { playbookStepService } from '../services/mock/playbookSteps.service';
import type { ExpandedPlaybookStep   } from '../services/mock/playbookSteps.service';
import { taskTemplateService } from '../services/mock/taskTemplates.service';
import { departmentService } from '../services/mock/departments.service';
import type { TaskTemplate, Department } from '../types/models';
import type { Playbook } from '../services/types';

export const Playbooks: React.FC = () => {
    const navigate = useNavigate();
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);

    // UI Data
    const [tasks, setTasks] = useState<ExpandedPlaybookStep[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit/New States for Playbook
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlaybook, setEditedPlaybook] = useState<Partial<Playbook>>({});

    // New Step State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [newStep, setNewStep] = useState<{
        override_title: string;
        override_department_id: string;
        override_sla_days: number;
        override_sla_unit: 'hours' | 'days';
    }>({ override_title: '', override_department_id: '', override_sla_days: 1, override_sla_unit: 'days' });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedPlaybook) {
            loadTasks(selectedPlaybook.id);
            setEditedPlaybook(selectedPlaybook);
            setIsEditing(false);
            resetStepForm();
        } else {
            setTasks([]);
        }
    }, [selectedPlaybook]);

    const loadInitialData = async () => {
        const [pbs, tpls, depts] = await Promise.all([
            getAllPlaybooks(), // List all (including inactive versions)
            taskTemplateService.list(),
            departmentService.list()
        ]);
        setPlaybooks(pbs);
        setTemplates(tpls.filter(t => t.active));
        setDepartments(depts.filter(d => d.active));

        // Select first active playbook if none selected
        if (pbs.length > 0 && !selectedPlaybook) {
            const firstActive = pbs.find(p => p.ativo) || pbs[0];
            setSelectedPlaybook(firstActive);
        }
    };

    const loadTasks = async (pbId: string) => {
        const t = await playbookStepService.listByPlaybook(pbId);
        setTasks(t);
    };

    const handleCreatePlaybook = async () => {
        const newPb = await savePlaybook({ nome: 'Novo Playbook', tipo: 'Geral', ativo: false, descricao: '' });
        await loadInitialData();
        setSelectedPlaybook(newPb);
        setIsEditing(true);
    };

    const handleSavePlaybook = async () => {
        if (!editedPlaybook.id) return;
        setLoading(true);
        await savePlaybook(editedPlaybook);
        await loadInitialData(); // Refresh list to update names
        setLoading(false);
        setIsEditing(false);
    };

    // --- Versioning Logic ---
    const ensureEditable = async (pb: Playbook): Promise<Playbook> => {
        // Check if used
        const isUsed = await incidentService.isPlaybookUsed(pb.id);

        if (isUsed) {
            // Create new version
            const rawNewVersion = await playbookService.createNextVersion(pb.id);
            const mapToUiPlaybook = (p: any): Playbook => ({
                id: p.id,
                nome: p.name,
                tipo: p.incident_type,
                ativo: p.active,
                descricao: p.description,
                version: p.version
            });
            const newVersion = mapToUiPlaybook(rawNewVersion);
            // Reload list and return new object
            const allPbs = await getAllPlaybooks();
            setPlaybooks(allPbs);
            setSelectedPlaybook(newVersion);
            return newVersion;
        }
        return pb;
    };

    // --- Template & Step Logic ---

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find(t => t.id === templateId);
        if (tpl) {
            // Pre-fill overrides with defaults
            setNewStep({
                override_title: tpl.title,
                override_department_id: tpl.default_department_id,
                override_sla_days: tpl.default_sla_days,
                override_sla_unit: tpl.default_sla_unit || 'days'
            });
        } else {
            resetStepForm();
        }
    };

    const resetStepForm = () => {
        setSelectedTemplateId('');
        setNewStep({ override_title: '', override_department_id: '', override_sla_days: 1, override_sla_unit: 'days' });
    };

    const handleAddStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlaybook || !selectedTemplateId) return;

        // 1. Ensure we are editing a valid version
        const targetPlaybook = await ensureEditable(selectedPlaybook);

        // Check if values differ from template
        const tpl = templates.find(t => t.id === selectedTemplateId);
        if (!tpl) return;

        const overrides: any = {};
        if (newStep.override_title !== tpl.title) overrides.title = newStep.override_title;
        if (newStep.override_department_id !== tpl.default_department_id) overrides.departmentId = newStep.override_department_id;
        if (newStep.override_sla_days !== tpl.default_sla_days) overrides.sla = newStep.override_sla_days;
        if (newStep.override_sla_unit !== (tpl.default_sla_unit || 'days')) overrides.slaUnit = newStep.override_sla_unit;

        // 2. Add step to target (possibly new) playbook
        await playbookStepService.addStep(
            targetPlaybook.id,
            selectedTemplateId,
            overrides,
            // Tasks length might be from old version, refetch length or just use local state if not versioned
            // But if versioned, it was cloned, so length should be same.
            tasks.length + 1
        );

        resetStepForm();
        await loadTasks(targetPlaybook.id);
    };

    const handleDeleteStep = async (id: string) => {
        if (!confirm('Remover esta tarefa do fluxo?')) return;
        if (!selectedPlaybook) return;

        const targetPlaybook = await ensureEditable(selectedPlaybook);

        // If versioned, the step ID passed here (from old version) is invalid for the new version.
        // We need to find the equivalent step in the new version?
        // Actually, ensureEditable returns the NEW playbook. But 'id' is from the OLD list in state.
        // This is tricky.

        // BETTER APPROACH: If ensureEditable created a new version, it cloned steps with NEW IDs.
        // We cannot use the old 'id'.

        // Simplification for this demo:
        // If version changed, we reload tasks first, user has to click delete again?
        // Or: ensureEditable *returns* the new Playbook. If ID changed, we stop and alert?

        if (targetPlaybook.id !== selectedPlaybook.id) {
            alert('Uma nova versão do playbook foi criada pois a anterior já estava em uso. Por favor, confirme a exclusão na nova versão.');
            // tasks state is already updating via useEffect on selectedPlaybook change inside ensureEditable logic? 
            // No, setSelectedPlaybook triggers useEffect -> loadTasks.
            return;
        }

        await playbookStepService.deleteStep(id);
        loadTasks(targetPlaybook.id);
    }

    const handleReorder = async (fromIndex: number, direction: 'up' | 'down') => {
        if (!selectedPlaybook) return;

        const targetPlaybook = await ensureEditable(selectedPlaybook);
        if (targetPlaybook.id !== selectedPlaybook.id) {
            // UI refresh happened.
            // We can try to re-apply the reorder on the new list if indices match (they should)
            const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
            await playbookStepService.reorder(targetPlaybook.id, fromIndex, toIndex);
            await loadTasks(targetPlaybook.id);
            return;
        }

        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= tasks.length) return;

        await playbookStepService.reorder(targetPlaybook.id, fromIndex, toIndex);
        await loadTasks(targetPlaybook.id);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col font-inter">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/operacoes/incidencias')} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Gerenciador de Playbooks</h2>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* List Sidebar */}
                <div className="col-span-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm transition-colors">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Playbooks</h3>
                        <button onClick={handleCreatePlaybook} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-all">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {playbooks.map(pb => (
                            <div
                                key={pb.id}
                                onClick={() => setSelectedPlaybook(pb)}
                                className={`p-3 rounded-md cursor-pointer border transition-colors ${selectedPlaybook?.id === pb.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`font-medium ${pb.ativo ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                                        {pb.nome}
                                    </div>
                                    {pb.ativo && <CheckCircle size={14} className="text-emerald-500 mt-1" />}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex justify-between items-center">
                                    <span>{pb.tipo}</span>
                                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
                                        <GitBranch size={10} /> v{pb.version || 1}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-6">
                    {selectedPlaybook && (
                        <>
                            {/* Playbook Metadata */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-fade-in transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <FileText className="text-blue-600 dark:text-blue-500" size={20} />
                                        {selectedPlaybook.nome}
                                        <span className="text-sm font-normal text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <GitBranch size={12} /> v{selectedPlaybook.version || 1}
                                        </span>
                                    </h3>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">Editar Detalhes</button>
                                    ) : (
                                        <button onClick={handleSavePlaybook} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 font-medium shadow-sm">
                                            <Save size={14} /> Salvar
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Playbook</label>
                                        <input
                                            disabled={!isEditing}
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            value={isEditing ? editedPlaybook.nome : selectedPlaybook.nome}
                                            onChange={e => setEditedPlaybook({ ...editedPlaybook, nome: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Incidência</label>
                                        <select
                                            disabled={!isEditing}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            value={isEditing ? editedPlaybook.tipo : selectedPlaybook.tipo}
                                            onChange={e => setEditedPlaybook({ ...editedPlaybook, tipo: e.target.value })}
                                        >
                                            <option value="Geral">Geral</option>
                                            <option value="Falta">Falta</option>
                                            <option value="Acidente">Acidente</option>
                                            <option value="Reemplazo">Reemplazo</option>
                                            <option value="Segurança">Segurança</option>
                                            <option value="Qualidade">Qualidade</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                        <input
                                            disabled={!isEditing}
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                            value={isEditing ? editedPlaybook.descricao : selectedPlaybook.descricao}
                                            onChange={e => setEditedPlaybook({ ...editedPlaybook, descricao: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 mt-2">
                                        <input
                                            disabled={!isEditing}
                                            type="checkbox"
                                            id="active"
                                            checked={isEditing ? editedPlaybook.ativo : selectedPlaybook.ativo}
                                            onChange={e => setEditedPlaybook({ ...editedPlaybook, ativo: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 dark:bg-slate-800"
                                        />
                                        <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">Playbook Ativo</label>
                                    </div>
                                </div>
                            </div>

                            {/* Tasks List */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex-1 animate-fade-in delay-75 transition-colors">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <Briefcase className="text-blue-600 dark:text-blue-500" size={20} /> Workflow de Tarefas
                                </h3>

                                <div className="space-y-3 mb-6">
                                    {tasks.map((step, index) => (
                                        <div key={step.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                                            <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-700 mr-1">
                                                <button
                                                    disabled={index === 0}
                                                    onClick={() => handleReorder(index, 'up')}
                                                    className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 dark:disabled:hover:text-slate-500 transition-colors"
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button
                                                    disabled={index === tasks.length - 1}
                                                    onClick={() => handleReorder(index, 'down')}
                                                    className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 dark:disabled:hover:text-slate-500 transition-colors"
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                            </div>

                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shadow-sm">{index + 1}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{step.task_title}</span>
                                                    {step.override_title && (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">(Modelo: {step.template_title})</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">
                                                        <Briefcase size={10} /> {step.department_name}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                                                        <Clock size={10} /> SLA: +{step.sla_days} {step.override_sla_unit === 'hours' ? 'horas' : 'dias'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Remover passo">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {tasks.length === 0 && <div className="text-center text-slate-400 dark:text-slate-500 py-6 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">Este playbook ainda não possui tarefas.</div>}
                                </div>

                                {/* Add Task Form */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-5 bg-slate-50/50 dark:bg-slate-800/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <Plus size={16} className="text-blue-600 dark:text-blue-500" /> Adicionar Nova Tarefa ao Fluxo
                                    </h4>
                                    <form onSubmit={handleAddStep} className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">Selecione o Modelo</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 appearance-none"
                                                    value={selectedTemplateId}
                                                    onChange={e => handleTemplateSelect(e.target.value)}
                                                >
                                                    <option value="">-- Selecione --</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.title}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {selectedTemplateId && (
                                            <>
                                                <div className="col-span-12 md:col-span-4">
                                                    <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">Título na Incidência (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                                                        value={newStep.override_title}
                                                        onChange={e => setNewStep({ ...newStep, override_title: e.target.value })}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-2">
                                                    <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">Setor Resp.</label>
                                                    <select
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                                                        value={newStep.override_department_id}
                                                        onChange={e => setNewStep({ ...newStep, override_department_id: e.target.value })}
                                                    >
                                                        {departments.map(d => (
                                                            <option key={d.id} value={d.id}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-4 md:col-span-1">
                                                    <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold mb-1 block">SLA</label>
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="number" min="0" max="365"
                                                            className="w-[60%] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                                                            value={newStep.override_sla_days}
                                                            onChange={e => setNewStep({ ...newStep, override_sla_days: Number(e.target.value) })}
                                                        />
                                                        <select
                                                            className="w-[40%] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                                                            value={newStep.override_sla_unit}
                                                            onChange={e => setNewStep({ ...newStep, override_sla_unit: e.target.value as 'hours' | 'days' })}
                                                        >
                                                            <option value="days">Dias</option>
                                                            <option value="hours">Hrs</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <button type="submit" className="w-full flex items-center justify-center bg-blue-600 text-white rounded h-[38px] hover:bg-blue-700 shadow-sm transition-all">
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                                <div className="col-span-12 text-[10px] text-slate-400 dark:text-slate-500 italic">
                                                    * Os valores editados aqui sobrescrevem o padrão do modelo apenas para este playbook.
                                                </div>
                                            </>
                                        )}
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
