import { supabaseIncidentService } from './db/SupabaseIncidentService';
import { supabaseTaskService } from './db/SupabaseTaskService';
import { supabaseLogService } from './db/SupabaseLogService';
import { supabaseDepartmentService } from './db/SupabaseDepartmentService'; // NEW
import { playbookService } from './mock/playbooks.service';
import { playbookStepService } from './mock/playbookSteps.service';
import { supabase } from './supabaseClient';
import { contextFactory } from './contextFactory';
import type { Incidencia, IncidenciaTarefa, Playbook, PlaybookTarefa } from './types';
import type { IncidentContext, OriginType } from '../types/models';

// --- SWITCH TO REAL SERVICES ---
const incidentService = supabaseIncidentService;
const incidentTaskService = supabaseTaskService;
const logsService = supabaseLogService;
const departmentService = supabaseDepartmentService; // SWITCHED

export const notifyTaskCreated = async (title: string, deptName?: string, assignedEmail?: string, incidentId?: string) => {
    try {
        const { data: mcsUsers } = await supabase
            .from('mcs_users')
            .select('id, email, department_id');

        const schemaClient = (supabase as any).schema ? (supabase as any).schema('core_common') : supabase;

        const targetUsers = (mcsUsers || []).filter(u => {
            if (assignedEmail && u.email?.toLowerCase() === assignedEmail.toLowerCase()) return true;
            if (deptName && (u.department_id === deptName || u.department_id === deptName.toLowerCase())) return true;
            return false;
        });

        const userIdsToNotify = targetUsers.length > 0
            ? targetUsers.map(u => u.id)
            : (mcsUsers || []).slice(0, 5).map(u => u.id);

        for (const userId of userIdsToNotify) {
            try {
                await schemaClient.from('notifications').insert({
                    user_id: userId,
                    title: `Nova Tarefa: ${deptName || 'Setor'}`,
                    message: title,
                    type: 'incident',
                    severity: 'info',
                    link_url: incidentId ? `/operacoes/incidencias/${incidentId}` : '/operacoes/operacao/tarefas'
                });
            } catch (innerErr) {
                console.warn('Could not send notification to user:', userId, innerErr);
            }
        }
    } catch (e) {
        console.warn("Notification insert fallback:", e);
    }
};

// Adapters to convert new Models to old UI Types (for compatibility during refactor)

const toUiIncidencia = async (inc: any, tasks: any[]): Promise<Incidencia> => {
    const total = tasks.length;
    const concluidas = tasks.filter((t: any) => t.status === 'Concluida').length;
    const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    // Departments
    const deptIds = Array.from(new Set(tasks.map((t: any) => t.department_id)));
    const allDepts = await departmentService.list();
    const depts = deptIds.map(id => allDepts.find(d => d.id === id)?.name || 'Geral');

    // SLA
    const openTasks = tasks.filter((t: any) => t.status !== 'Concluida').map((t: any) => t.due_at);
    openTasks.sort();
    const nextDue = openTasks.length > 0 ? openTasks[0] : null;
    const diff = nextDue ? Math.ceil((new Date(nextDue).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 999;

    // Map Context to Legacy UI Fields
    const ctx = (inc.context || {}) as IncidentContext;
    const clienteName = ctx?.client?.name || inc.cliente || '';
    const empresaName = ctx?.company?.name || inc.empresa || '';
    const comercialName = ctx?.extra?.comercial || inc.comercial || '';
    const originCode = ctx?.origin?.ref || ctx?.origin?.label || inc.origem_codigo || '';

    // Assigned Users
    const assignedEmails = Array.from(new Set(tasks.map((t: any) => t.assigned_to_email || t.assigned_to).filter(Boolean)));
    const primaryAssignedEmail = assignedEmails.length > 0 ? (assignedEmails[0] as string) : (ctx?.extra?.responsavel_email || (inc as any).responsavel_email || (inc as any).atribuido_a_email);

    return {
        id: inc.id,
        titulo: inc.title,
        descricao: inc.description,
        tipo: inc.incident_type,
        prioridade: inc.prioridade || 'Media',
        impacto: inc.impacto || 'Médio',
        status: inc.status, // Model status (Aberto/etc) mapped in Service
        data_abertura: inc.created_at,
        data_fechamento: inc.data_fechamento || (inc.status === 'Resolvido' || inc.status === 'Fechado' ? inc.updated_at : undefined),
        prazo_estimado: nextDue,

        // New Model Fields
        context: ctx,
        origem_tipo: inc.origin_type || 'manual',
        origem_criacao: 'manual',

        // Legacy Mapped
        origem_codigo: originCode,
        criado_por_nome: inc.criado_por_nome,
        atribuido_a_email: primaryAssignedEmail,
        cliente: clienteName,
        empresa: empresaName,
        comercial: comercialName,

        // Calculated
        progresso_pct: progresso,
        tarefas_totais: total,
        tarefas_concluidas: concluidas,
        sla_dias: diff,
        departamentos_envolvidos: depts,
        tags: []
    };
};

const toUiTarefa = async (task: any): Promise<IncidenciaTarefa> => {
    const depts = await departmentService.list();
    const dept = depts.find(d => d.id === task.department_id);
    let parsedDesc = task.evidence || '';
    let parsedAtts: any[] = [];
    if (task.evidence && typeof task.evidence === 'string' && task.evidence.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(task.evidence);
            parsedDesc = parsed.description || '';
            parsedAtts = parsed.attachments || [];
        } catch {
            parsedDesc = task.evidence;
        }
    }
    return {
        id: task.id,
        incidencia_id: task.incident_id,
        titulo: task.title,
        status: task.status, // Service maps DB status to UI status
        ordem: task.step_order,
        departamento: dept?.name || 'Geral',
        prazo: task.due_at,
        scheduled_for: task.scheduled_for,
        descricao: parsedDesc,
        attachments: parsedAtts,
        evidencia: task.evidence,
        responsavel_email: task.assigned_to,

        // New fields
        started_at: task.started_at,
        completed_at: task.completed_at,
        last_status_change_at: task.last_status_change_at
    };
};

// --- PUBLIC API (ADAPTERS) ---

export const listIncidencias = async (_filters?: any): Promise<Incidencia[]> => {
    const rawIncidents = await incidentService.list(); // Filters not implemented in SupabaseService yet
    const allTasks = await incidentTaskService.listAll();

    return Promise.all(rawIncidents.map(i => {
        const iTasks = allTasks.filter(t => t.incident_id === i.id);
        return toUiIncidencia(i, iTasks);
    }));
};

export const getIncidencia = async (id: number | string): Promise<Incidencia | null> => {
    const inc = await incidentService.getById(String(id));
    if (!inc) return null;
    const tasks = await incidentTaskService.listByIncident(String(id));
    return toUiIncidencia(inc, tasks);
};

/**
 * Creates an incident using the ContextFactory to build the context.
 * The UI should pass specific origin data if available, otherwise it defaults to manual.
 */
export const createIncidencia = async (payload: any): Promise<Incidencia | null> => {
    let context: IncidentContext;
    let originType: OriginType = 'manual';

    if (payload.context) {
        context = payload.context;
        originType = payload.origem_tipo || 'manual';
    } else if (payload.origem_tipo === 'Pedido' && payload.origem_id) {
        context = await contextFactory.createFromPedido(payload.origem_id);
        originType = 'pedido';
    } else {
        context = contextFactory.createManual();
        if (payload.cliente) context.client = { name: payload.cliente };
        if (payload.empresa) context.company = { name: payload.empresa };
    }

    // Map UI Payload to Model Payload
    const newInc = await incidentService.create({
        title: payload.titulo,
        description: payload.descricao,
        incident_type: payload.tipo,
        impacto: payload.impacto,
        prioridade: payload.prioridade,
        status: 'Aberto', // Service will map this to 'open'
        playbook_id: payload.playbook_id,
        // Context
        context: context,
        origin_type: originType,
        criado_por_nome: payload.criado_por_nome
    } as any);

    try {
        // --- TASK CREATION LOGIC ---
        const isQuickTask = payload.tipo === 'Task' || (!payload.playbook_id);
        if (isQuickTask) {
            const depts = await departmentService.list();
            const deptId = depts.find(d => d.id === payload.departamento || d.name?.toLowerCase() === payload.departamento?.toLowerCase())?.id;

            await incidentTaskService.create({
                incident_id: newInc.id,
                title: payload.titulo, // Task inherits Incident Title
                department_id: deptId,
                step_order: 1,
                status: 'Pendente', // Service maps to 'open'
                due_at: payload.prazo || new Date().toISOString(),
                sla_days: payload.sla || 1,
                scheduled_for: payload.scheduled_for,
                assigned_to: payload.responsavel_email,
                created_by: payload.created_by,
                evidence: payload.descricao
            } as any);

            await notifyTaskCreated(payload.titulo, payload.departamento, payload.responsavel_email, newInc.id);
        }

        // --- PLAYBOOK TASKS LOGIC ---
        if (payload.playbook_id) {
            const steps = await playbookStepService.listByPlaybook(payload.playbook_id);
            const depts = await departmentService.list();

            for (const step of steps) {
                // Calculate Due Date based on Unit
                const slaVal = step.sla_days;
                const unit = step.sla_unit || 'days';
                const offsetMs = unit === 'hours' ? slaVal * 3600000 : slaVal * 86400000;
                const dueDate = new Date(Date.now() + offsetMs).toISOString();

                const deptId = depts.find(d => d.name === step.department_name)?.id;

                await incidentTaskService.create({
                    incident_id: newInc.id,
                    title: step.task_title,
                    department_id: deptId,
                    step_order: step.step_order,
                    status: 'Pendente',
                    due_at: dueDate,
                    sla_days: slaVal
                } as any);

                await notifyTaskCreated(step.task_title, step.department_name, undefined, newInc.id);
            }
        }
    } catch (err) {
        console.error("Task creation failed, rolling back incident:", err);
        try {
            await incidentService.delete(newInc.id);
        } catch (delErr) {
            console.error("Rollback failed:", delErr);
        }
        throw err;
    }

    return getIncidencia(newInc.id);
};

export const updateIncidencia = async (id: string, patch: any): Promise<void> => {
    // Map UI Patch to Model Patch
    const modelPatch: any = {};
    if (patch.titulo) modelPatch.title = patch.titulo;
    if (patch.descricao) modelPatch.description = patch.descricao;
    if (patch.status) modelPatch.status = patch.status;
    if (patch.data_fechamento) modelPatch.data_fechamento = patch.data_fechamento;
    if (patch.impacto) modelPatch.impacto = patch.impacto;
    if (patch.prioridade) modelPatch.prioridade = patch.prioridade;
    if (patch.tipo) modelPatch.incident_type = patch.tipo;

    await incidentService.update(id, modelPatch);
};

export const deleteIncidencia = async (id: string): Promise<void> => {
    await incidentService.delete(id);
};

export const listTarefas = async (incidenciaId: number | string): Promise<IncidenciaTarefa[]> => {
    const rawTasks = await incidentTaskService.listByIncident(String(incidenciaId));
    return Promise.all(rawTasks.map(toUiTarefa));
};

export const getAllTarefas = async (): Promise<any[]> => {
    const allTasks = await incidentTaskService.listAll();
    const allIncidents = await incidentService.list();

    // Expanded Interface Logic
    const result = await Promise.all(allTasks.map(async (t) => {
        const parent = allIncidents.find(i => i.id === t.incident_id);
        const parentTasks = allTasks.filter(pt => pt.incident_id === t.incident_id);

        // Parent Progress
        const total = parentTasks.length;
        const done = parentTasks.filter(pt => pt.status === 'Concluida').length; // UI Status check
        const prog = total > 0 ? Math.round((done / total) * 100) : 0;

        const uiTask = await toUiTarefa(t);
        const daysDiff = t.due_at ? Math.ceil((new Date(t.due_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 999;

        // Resolve Origin Code from Context
        const ctx = parent?.context as IncidentContext;
        const originCode = ctx?.origin?.ref || ctx?.origin?.label || parent?.origem_codigo;

        return {
            ...uiTask,
            incidencia_titulo: parent?.title,
            incidencia_impacto: parent?.impacto,
            incidencia_progresso: prog,
            origem_codigo: originCode,
            sla_dias: daysDiff,
            context: ctx
        };
    }));

    return result.sort((a, b) => (a.prazo && b.prazo) ? new Date(a.prazo).getTime() - new Date(b.prazo).getTime() : 0);
};

export const updateTarefa = async (id: number | string, patch: Partial<IncidenciaTarefa>): Promise<void> => {
    // Map UI Patch to Model Patch
    const modelPatch: any = {};
    if (patch.status) modelPatch.status = patch.status; // Service maps to DB status
    if (patch.evidencia) modelPatch.evidence = patch.evidencia;
    if (patch.scheduled_for !== undefined) modelPatch.scheduled_for = patch.scheduled_for;

    // Support full task editing (CRUD)
    if (patch.titulo) modelPatch.title = patch.titulo;
    if (patch.prazo) modelPatch.due_at = patch.prazo;
    if (patch.responsavel_email !== undefined) modelPatch.assigned_to = patch.responsavel_email;

    if (patch.departamento) {
        const depts = await departmentService.list();
        const dept = depts.find(d => d.name === patch.departamento);
        if (dept) {
            modelPatch.department_id = dept.id;
        }
    }

    await incidentTaskService.update(String(id), modelPatch);
};

export const assignTarefa = async (id: number | string, email: string): Promise<void> => {
    await incidentTaskService.update(String(id), { assigned_to: email } as any);
};

export const createTarefa = async (payload: any): Promise<IncidenciaTarefa | null> => {
    const depts = await departmentService.list();
    const dept = depts.find(d => d.name === payload.departamento);

    const newTask = await incidentTaskService.create({
        incident_id: String(payload.incidencia_id),
        title: payload.titulo,
        department_id: dept?.id, // Removed fallback
        step_order: payload.ordem || 99,
        status: 'Pendente',
        due_at: payload.prazo || new Date().toISOString(),
        scheduled_for: payload.scheduled_for,
        created_by: payload.created_by,
        assigned_to: payload.responsavel_email,
        sla_days: 1
    } as any);

    return toUiTarefa(newTask);
};

export const deleteTarefa = async (id: number | string): Promise<void> => {
    await incidentTaskService.delete(String(id));
};

// --- PLAYBOOKS ADAPTERS ---

export const getActivePlaybooks = async (): Promise<Playbook[]> => {
    const pbs = await playbookService.listActive();
    return pbs.map(p => ({
        id: p.id,
        nome: p.name,
        tipo: p.incident_type,
        active: p.active,
        descricao: p.description
    } as any));
};

export const getAllPlaybooks = async (): Promise<Playbook[]> => {
    const pbs = await playbookService.list();
    return pbs.map(p => ({
        id: p.id,
        nome: p.name,
        tipo: p.incident_type,
        ativo: p.active,
        descricao: p.description,
        version: p.version
    } as any));
};

export const getPlaybookTarefas = async (playbookId: string): Promise<PlaybookTarefa[]> => {
    const steps = await playbookStepService.listByPlaybook(playbookId);
    return steps.map(s => ({
        id: s.id,
        playbook_id: s.playbook_id,
        ordem: s.step_order,
        departamento: s.department_name,
        titulo: s.task_title,
        sla_dias: s.sla_days
    }));
};

export const savePlaybook = async (pb: any): Promise<Playbook> => {
    const saved = await playbookService.save({
        id: pb.id,
        name: pb.nome,
        incident_type: pb.tipo,
        description: pb.descricao,
        active: pb.ativo
    });

    return {
        id: saved.id,
        nome: saved.name,
        tipo: saved.incident_type,
        ativo: saved.active,
        descricao: saved.description
    } as any;
};

export const createPlaybookTarefa = async (t: any): Promise<PlaybookTarefa> => {
    const step = await playbookStepService.addStep(
        t.playbook_id,
        t.template_id || 'tpl-1',
        {
            title: t.titulo,
            departmentId: t.departamento,
            sla: t.sla_dias
        },
        t.ordem
    );

    return {
        id: step.id,
        playbook_id: step.playbook_id,
        titulo: t.titulo,
        departamento: t.departamento,
        ordem: step.step_order,
        sla_dias: t.sla_dias
    } as any;
};

export const deletePlaybookTarefa = async (id: string): Promise<void> => {
    await playbookStepService.deleteStep(id);
};

// Logs
export const listLogs = async (incId: number | string): Promise<any[]> => {
    return logsService.list(String(incId));
};

export const addLog = async (incId: number | string, msg: string, user: string): Promise<any> => {
    return logsService.add(String(incId), msg, user);
};

export const listDepartments = async () => departmentService.list();
