import type {  PlaybookStep  } from '../../types/models';
import { initialPlaybookSteps } from "../../data/mock/playbookSteps.mock";
import { taskTemplateService } from "./taskTemplates.service";
import { departmentService } from "./departments.service";

const STORAGE_KEY = 'mcs_playbook_steps';

const load = (): PlaybookStep[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialPlaybookSteps;
};

const save = (data: PlaybookStep[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Helper type for UI
export interface ExpandedPlaybookStep extends PlaybookStep {
    task_title: string;
    department_name: string;
    sla_days: number;
    sla_unit: 'hours' | 'days'; // Enriched field
    template_title?: string; // Original template title for reference
}

export const playbookStepService = {
    listByPlaybook: async (playbookId: string): Promise<ExpandedPlaybookStep[]> => {
        const steps = load().filter(s => s.playbook_id === playbookId).sort((a, b) => a.step_order - b.step_order);

        // Enrich data
        const templates = await taskTemplateService.list();
        const departments = await departmentService.list();

        return steps.map(step => {
            const tpl = templates.find(t => t.id === step.task_template_id);
            const deptId = step.override_department_id || tpl?.default_department_id;
            const dept = departments.find(d => d.id === deptId);

            return {
                ...step,
                task_title: step.override_title || tpl?.title || 'Tarefa desconhecida',
                template_title: tpl?.title,
                department_name: dept?.name || 'Geral',
                sla_days: step.override_sla_days ?? tpl?.default_sla_days ?? 0,
                sla_unit: step.override_sla_unit ?? tpl?.default_sla_unit ?? 'days'
            };
        });
    },

    addStep: async (
        playbookId: string,
        templateId: string,
        overrides: { title?: string, departmentId?: string, sla?: number, slaUnit?: 'hours' | 'days' },
        order: number
    ): Promise<PlaybookStep> => {

        const list = load();
        const newStep: PlaybookStep = {
            id: crypto.randomUUID(),
            playbook_id: playbookId,
            step_order: order,
            task_template_id: templateId,
            override_title: overrides.title,
            override_department_id: overrides.departmentId,
            override_sla_days: overrides.sla,
            override_sla_unit: overrides.slaUnit,
            active: true
        };

        list.push(newStep);
        save(list);
        return newStep;
    },

    deleteStep: async (stepId: string): Promise<void> => {
        let list = load();
        list = list.filter(s => s.id !== stepId);
        save(list);
    },

    reorder: async (playbookId: string, fromIndex: number, toIndex: number): Promise<void> => {
        let allSteps = load();

        const playbookSteps = allSteps
            .filter(s => s.playbook_id === playbookId)
            .sort((a, b) => a.step_order - b.step_order);

        if (fromIndex < 0 || fromIndex >= playbookSteps.length || toIndex < 0 || toIndex >= playbookSteps.length) {
            return;
        }

        const [movedItem] = playbookSteps.splice(fromIndex, 1);
        playbookSteps.splice(toIndex, 0, movedItem);

        playbookSteps.forEach((step, index) => {
            step.step_order = index + 1;
        });

        allSteps = allSteps.filter(s => s.playbook_id !== playbookId);
        allSteps = [...allSteps, ...playbookSteps];

        save(allSteps);
    },

    // NEW: Clone steps from one playbook ID to another (for versioning)
    cloneSteps: async (fromPlaybookId: string, toPlaybookId: string): Promise<void> => {
        const allSteps = load();
        const sourceSteps = allSteps.filter(s => s.playbook_id === fromPlaybookId);

        const newSteps = sourceSteps.map(s => ({
            ...s,
            id: crypto.randomUUID(),
            playbook_id: toPlaybookId
        }));

        save([...allSteps, ...newSteps]);
    }
};
