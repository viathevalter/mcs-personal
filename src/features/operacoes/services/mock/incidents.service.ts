import type {  Incident  } from '../../types/models';
import { initialIncidents } from "../../data/mock/incidents.mock";
import { playbookStepService } from "./playbookSteps.service";
import { incidentTaskService } from "./incidentTasks.service";
import { taskTemplateService } from "./taskTemplates.service";
import { departmentMemberService } from "./departmentMembers.service";

const STORAGE_KEY = 'mcs_incidents';

const load = (): Incident[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialIncidents;
};

const save = (data: Incident[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const incidentService = {
  list: async (filters?: any): Promise<Incident[]> => {
    let data = load();
    if (filters?.status) data = data.filter(i => i.status === filters.status);
    if (filters?.prioridade) data = data.filter(i => i.prioridade === filters.prioridade || i.impacto === filters.prioridade);
    return data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getById: async (id: string): Promise<Incident | undefined> => {
    return load().find(i => i.id === id);
  },

  create: async (payload: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> => {
    const list = load();
    const now = new Date().toISOString();

    const newIncident: Incident = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...payload
    };

    list.push(newIncident);
    save(list);

    if (newIncident.playbook_id) {
      await incidentService.generateTasksFromPlaybook(newIncident.id, newIncident.playbook_id);
    }

    return newIncident;
  },

  update: async (id: string, patch: Partial<Incident>): Promise<Incident | null> => {
    const list = load();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return null;

    const updated = { ...list[index], ...patch, updated_at: new Date().toISOString() };
    list[index] = updated;
    save(list);
    return updated;
  },

  generateTasksFromPlaybook: async (incidentId: string, playbookId: string) => {
    const steps = await playbookStepService.listByPlaybook(playbookId);

    for (const step of steps) {
      const template = await taskTemplateService.getById(step.task_template_id);

      const title = step.override_title || template?.title || 'Tarefa do Playbook';
      const departmentId = step.override_department_id || template?.default_department_id || 'dept-1';
      const sla = step.override_sla_days ?? template?.default_sla_days ?? 1;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + sla);

      const leader = await departmentMemberService.getLeader(departmentId);
      const assignedTo = leader ? leader.user_email : undefined;

      await incidentTaskService.create({
        incident_id: incidentId,
        step_order: step.step_order,
        title: title,
        department_id: departmentId,
        sla_days: sla,
        due_at: dueDate.toISOString(),
        status: 'Pendente',
        assigned_to: assignedTo
      });
    }
  },

  // NEW: Check if playbook is used
  isPlaybookUsed: async (playbookId: string): Promise<boolean> => {
    const incidents = load();
    return incidents.some(i => i.playbook_id === playbookId);
  }
};
